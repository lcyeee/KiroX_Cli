import { useCallback, useEffect, useRef } from "react";
import { Play, Square, AlertCircle } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { startRun, stopRun, getStatus, getLogs, getResults } from "@/api/client";

export function ControlPanel() {
  const { processStatus, setProcessStatus, setPid, setElapsed, params, emailMode, outlookAccounts, outlookLoaded, appendLogs, setError } = useAppStore();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logIdxRef = useRef(0);

  const poll = useCallback(async () => {
    try {
      const status = await getStatus();
      setProcessStatus(status.status as any);
      setPid(status.pid);
      setElapsed(status.elapsed);

      if (status.running || status.logCount > 0) {
        const logsRes = await getLogs(logIdxRef.current);
        if (logsRes.logs.length > 0) {
          appendLogs(logsRes.logs.join(""));
          logIdxRef.current = logsRes.total;
        }

        if (!status.running) {
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
          try {
            const resultsRes = await getResults(params.output);
            if (resultsRes.results.length > 0) {
              // store setResults would be called from ResultsTable
            }
          } catch {}
        }
      }
    } catch {}
  }, [setProcessStatus, setPid, setElapsed, appendLogs, params.output]);

  useEffect(() => {
    if (processStatus === "running" && !pollRef.current) {
      pollRef.current = setInterval(poll, 1000);
    }
    return () => {
      if (pollRef.current && processStatus !== "running") {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [processStatus, poll]);

  const handleStart = async () => {
    setError(null);

    if (emailMode === "outlook" && !outlookLoaded && outlookAccounts.length === 0) {
      try {
        const listRes = await import("@/api/client").then(m => m.listOutlook());
        if (listRes.count === 0) {
          setError("请先加载 Outlook 邮箱数据");
          return;
        }
      } catch {}
    }

    const runParams = {
      ...params,
      useOutlook: emailMode === "outlook",
    };

    const res = await startRun(runParams);
    if (res.success) {
      setProcessStatus("running");
      setPid(res.pid);
      logIdxRef.current = 0;
      appendLogs("[系统] 注册任务已启动...\n");
      pollRef.current = setInterval(poll, 1000);
    } else {
      setError(res.error || "启动失败");
    }
  };

  const handleStop = async () => {
    await stopRun();
    setProcessStatus("stopped");
    appendLogs("[系统] 注册任务已停止\n");
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const isRunning = processStatus === "running";

  return (
    <div className="card animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
      <div className="flex items-center gap-2 mb-6">
        <Play className="w-4 h-4 text-accent" />
        <h2 className="text-lg font-semibold text-text-primary">控制面板</h2>
        <div className="ml-auto flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            isRunning ? "bg-status-running animate-pulse-dot" :
            processStatus === "completed" ? "bg-status-completed" :
            processStatus === "stopped" ? "bg-status-stopped" :
            "bg-status-idle"
          }`} />
          <span className="text-sm text-text-secondary">
            {isRunning ? "运行中" : processStatus === "completed" ? "已完成" : processStatus === "stopped" ? "已停止" : "空闲"}
          </span>
        </div>
      </div>

      {emailMode === "outlook" && outlookAccounts.length === 0 && !outlookLoaded && !isRunning && (
        <div className="flex items-center gap-3 p-4 bg-status-stopped/10 border border-status-stopped/20 rounded-lg mb-6 text-status-stopped">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">未配置 Outlook 邮箱池，请先上传或粘贴邮箱数据</p>
        </div>
      )}

      <div className="flex gap-4">
        <button
          className="btn-primary flex-1 flex items-center justify-center gap-2 text-base py-3"
          disabled={isRunning}
          onClick={handleStart}
        >
          <Play className="w-5 h-5" />
          开始注册
        </button>
        <button
          className="btn-secondary px-8 flex items-center justify-center gap-2"
          disabled={!isRunning}
          onClick={handleStop}
        >
          <Square className="w-4 h-4" />
          停止
        </button>
      </div>
    </div>
  );
}
