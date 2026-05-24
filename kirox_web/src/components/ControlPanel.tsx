import { Play, Square, AlertCircle } from "lucide-react";
import { useAppStore } from "@/store/appStore";

export function ControlPanel() {
  const { processStatus, setProcessStatus, appendLogs, params, emailMode, outlookAccounts } = useAppStore();
  const isRunning = processStatus === "running";

  const handleStart = () => {
    if (emailMode === "outlook" && outlookAccounts.length === 0) {
      return;
    }
    setProcessStatus("running");
    appendLogs("[系统] 注册任务已启动...\n");
  };

  const handleStop = () => {
    setProcessStatus("stopped");
    appendLogs("[系统] 注册任务已停止\n");
  };

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

      {emailMode === "outlook" && outlookAccounts.length === 0 && !isRunning && (
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
