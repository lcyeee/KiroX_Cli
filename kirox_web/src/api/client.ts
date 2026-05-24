import type { RunParams, RegistrationResult, OutlookAccount } from "@/types";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  return res.json();
}

export async function startRun(params: RunParams) {
  return request<{ success: boolean; pid: number | null; error?: string; message: string }>(
    "/api/run",
    {
      method: "POST",
      body: JSON.stringify(params),
    }
  );
}

export async function stopRun() {
  return request<{ success: boolean; error?: string; message: string }>(
    "/api/stop",
    { method: "POST" }
  );
}

export async function getStatus() {
  return request<{
    running: boolean;
    pid: number | null;
    status: string;
    logCount: number;
    elapsed: string;
  }>("/api/status");
}

export async function getLogs(since = 0) {
  return request<{
    logs: string[];
    total: number;
    running: boolean;
  }>(`/api/logs?since=${since}`);
}

export async function getResults(outputPath?: string) {
  const query = outputPath ? `?path=${encodeURIComponent(outputPath)}` : "";
  return request<{ results: RegistrationResult[] }>(`/api/results${query}`);
}

export async function parseOutlook(text: string) {
  return request<{ accounts: OutlookAccount[]; count: number }>(
    "/api/outlook/parse",
    {
      method: "POST",
      body: JSON.stringify({ text }),
    }
  );
}

export async function uploadOutlook(text: string, savePath?: string) {
  return request<{
    success: boolean;
    accounts: OutlookAccount[];
    count: number;
    path: string;
    error?: string;
  }>(
    "/api/outlook/upload",
    {
      method: "POST",
      body: JSON.stringify({ text, savePath }),
    }
  );
}

export async function listOutlook(csvPath?: string) {
  const query = csvPath ? `?path=${encodeURIComponent(csvPath)}` : "";
  return request<{ accounts: OutlookAccount[]; count: number }>(
    `/api/outlook/list${query}`
  );
}
