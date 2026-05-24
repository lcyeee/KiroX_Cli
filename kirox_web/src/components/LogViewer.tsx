import { Terminal, Clock, Activity } from "lucide-react";
import { useAppStore } from "@/store/appStore";

export function LogViewer() {
  const { logs, processStatus, elapsed } = useAppStore();

  return (
    <div className="card animate-fade-in-up" style={{ animationDelay: "0.5s" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-accent" />
          <h2 className="text-lg font-semibold text-text-primary">实时日志</h2>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-sm text-text-muted">
            <Activity className="w-3.5 h-3.5" />
            {processStatus === "running" ? "运行中" : processStatus === "completed" ? "已完成" : processStatus === "stopped" ? "已停止" : "空闲"}
          </span>
          <span className="flex items-center gap-1.5 text-sm text-text-muted">
            <Clock className="w-3.5 h-3.5" />
            {elapsed}
          </span>
        </div>
      </div>

      <div className="bg-bg rounded-lg border border-border p-4 font-mono text-sm text-text-secondary leading-relaxed max-h-96 overflow-y-auto">
        {logs ? (
          <pre className="whitespace-pre-wrap break-words">{logs}</pre>
        ) : (
          <p className="text-text-muted italic">等待任务启动...</p>
        )}
      </div>
    </div>
  );
}
