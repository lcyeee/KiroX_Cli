import express from "express";
import cors from "cors";
import { spawn, ChildProcess } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

interface RunParams {
  count: number;
  delay: number;
  concurrency: number;
  debug: boolean;
  output: string;
  proxy: string;
  useOutlook: boolean;
  moemailUrl?: string;
  moemailKey?: string;
  outlookCsv?: string;
}

interface ProcessState {
  process: ChildProcess | null;
  pid: number | null;
  running: boolean;
  logs: string[];
  startTime: number | null;
  endTime: number | null;
  exitCode: number | null;
}

const state: ProcessState = {
  process: null,
  pid: null,
  running: false,
  logs: [],
  startTime: null,
  endTime: null,
  exitCode: null,
};

const SCRIPT_DIR = __dirname;
const GO_BIN = path.join(SCRIPT_DIR, "kirox-cli");
const OUTPUT_DIR = path.join(SCRIPT_DIR, "output");
const DEFAULT_OUTPUT = path.join(OUTPUT_DIR, "results.json");
const OUTLOOK_CSV_PATH = path.join(SCRIPT_DIR, "outlook.csv");

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function buildCommand(params: RunParams): string[] {
  const cmd = [GO_BIN];

  if (params.useOutlook) {
    cmd.push("-outlook");
    if (params.outlookCsv) {
      cmd.push("-outlook-csv", params.outlookCsv);
    } else {
      cmd.push("-outlook-csv", OUTLOOK_CSV_PATH);
    }
  } else {
    cmd.push("-moemail-url", params.moemailUrl || "https://api.moemail.app");
    cmd.push("-moemail-key", params.moemailKey || "");
  }

  cmd.push("-n", String(params.count));
  cmd.push("-j", String(params.concurrency));
  cmd.push("-d", String(params.delay));

  const outputPath = params.output || DEFAULT_OUTPUT;
  cmd.push("-o", outputPath);

  if (params.proxy) {
    cmd.push("-p", params.proxy);
  }

  if (params.debug) {
    cmd.push("-debug");
  }

  return cmd;
}

function stopProcess() {
  if (state.process && state.running) {
    state.running = false;
    try {
      const pid = state.process.pid;
      if (pid) {
        try {
          const psutil = require("child_process");
          psutil.spawn("kill", ["-TERM", String(pid)], { detached: true });
          setTimeout(() => {
            try {
              psutil.spawn("kill", ["-9", String(pid)], { detached: true });
            } catch {}
          }, 3000);
        } catch {
          state.process.kill("SIGTERM");
        }
      }
    } catch {}
    state.endTime = Date.now();
  }
}

app.post("/api/run", (req, res) => {
  if (state.running) {
    res.json({ success: false, error: "已有任务在运行中" });
    return;
  }

  const params: RunParams = req.body;

  if (!params.count || params.count < 1) {
    res.json({ success: false, error: "注册数量必须大于 0" });
    return;
  }

  if (!params.useOutlook && !params.moemailKey) {
    res.json({ success: false, error: "MoeMail 模式需要提供 API Key" });
    return;
  }

  state.logs = [];
  state.startTime = Date.now();
  state.endTime = null;
  state.exitCode = null;
  state.running = true;

  const cmd = buildCommand(params);
  console.log("Starting command:", cmd.join(" "));

  const child = spawn(cmd[0], cmd.slice(1), {
    cwd: SCRIPT_DIR,
    env: { ...process.env },
    stdio: ["ignore", "pipe", "pipe"],
  });

  state.process = child;
  state.pid = child.pid;

  child.stdout?.on("data", (data: Buffer) => {
    const line = data.toString();
    state.logs.push(line);
  });

  child.stderr?.on("data", (data: Buffer) => {
    const line = data.toString();
    state.logs.push(line);
  });

  child.on("close", (code) => {
    state.running = false;
    state.exitCode = code;
    state.endTime = Date.now();
    console.log("Process exited with code:", code);
  });

  child.on("error", (err) => {
    state.running = false;
    state.logs.push(`[错误] ${err.message}`);
    state.endTime = Date.now();
  });

  res.json({
    success: true,
    pid: child.pid,
    message: "任务已启动",
  });
});

app.post("/api/stop", (req, res) => {
  if (!state.running) {
    res.json({ success: false, error: "没有运行中的任务" });
    return;
  }

  stopProcess();
  res.json({ success: true, message: "任务已停止" });
});

app.get("/api/status", (req, res) => {
  let elapsed = "0s";
  if (state.startTime) {
    const end = state.endTime || Date.now();
    const ms = end - state.startTime;
    if (ms < 60000) {
      elapsed = `${(ms / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);
      elapsed = `${minutes}m ${seconds}s`;
    }
  }

  res.json({
    running: state.running,
    pid: state.pid,
    status: state.running
      ? "running"
      : state.exitCode === 0
      ? "completed"
      : state.exitCode !== null
      ? `exited (${state.exitCode})`
      : "idle",
    logCount: state.logs.length,
    elapsed,
  });
});

app.get("/api/logs", (req, res) => {
  const since = parseInt(req.query.since as string) || 0;
  const newLogs = state.logs.slice(since);
  res.json({
    logs: newLogs,
    total: state.logs.length,
    running: state.running,
  });
});

app.get("/api/results", (req, res) => {
  const outputPath = (req.query.path as string) || DEFAULT_OUTPUT;
  try {
    if (!fs.existsSync(outputPath)) {
      res.json({ results: [] });
      return;
    }
    const data = fs.readFileSync(outputPath, "utf-8");
    const results = JSON.parse(data);
    if (!Array.isArray(results)) {
      res.json({ results: [] });
      return;
    }
    res.json({ results });
  } catch (err) {
    res.json({ results: [] });
  }
});

app.get("/api/results/download", (req, res) => {
  const outputPath = DEFAULT_OUTPUT;
  if (!fs.existsSync(outputPath)) {
    res.status(404).json({ error: "结果文件不存在" });
    return;
  }
  res.download(outputPath, "results.json");
});

app.post("/api/outlook/parse", (req, res) => {
  const { text } = req.body;
  if (!text) {
    res.json({ accounts: [] });
    return;
  }

  const accounts: Array<{
    email: string;
    password: string;
    clientId: string;
    refreshToken: string;
  }> = [];
  const lines = text.trim().split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const parts = trimmed.split("----", 4);
    if (parts.length === 4) {
      accounts.push({
        email: parts[0].trim(),
        password: parts[1].trim(),
        clientId: parts[2].trim(),
        refreshToken: parts[3].trim(),
      });
    }
  }

  res.json({ accounts, count: accounts.length });
});

app.post("/api/outlook/upload", (req, res) => {
  const { text, savePath } = req.body;
  if (!text) {
    res.json({ success: false, error: "没有提供数据" });
    return;
  }

  const targetPath = savePath || OUTLOOK_CSV_PATH;
  try {
    fs.writeFileSync(targetPath, text, "utf-8");

    const accounts: Array<any> = [];
    const lines = text.trim().split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const parts = trimmed.split("----", 4);
      if (parts.length === 4) {
        accounts.push({
          email: parts[0].trim(),
          password: parts[1].trim(),
          clientId: parts[2].trim(),
          refreshToken: parts[3].trim(),
        });
      }
    }

    res.json({
      success: true,
      accounts,
      count: accounts.length,
      path: targetPath,
    });
  } catch (err) {
    res.json({ success: false, error: "保存失败" });
  }
});

app.get("/api/outlook/list", (req, res) => {
  const csvPath = (req.query.path as string) || OUTLOOK_CSV_PATH;
  try {
    if (!fs.existsSync(csvPath)) {
      res.json({ accounts: [], count: 0 });
      return;
    }
    const data = fs.readFileSync(csvPath, "utf-8");
    const accounts: Array<any> = [];
    const lines = data.trim().split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const parts = trimmed.split("----", 4);
      if (parts.length === 4) {
        accounts.push({
          email: parts[0].trim(),
          clientId: parts[2].trim(),
        });
      }
    }
    res.json({ accounts, count: accounts.length });
  } catch {
    res.json({ accounts: [], count: 0 });
  }
});

const PORT = process.env.PORT || 2012;
app.listen(PORT, () => {
  console.log(`KiroX API server running on port ${PORT}`);
});

export default app;
