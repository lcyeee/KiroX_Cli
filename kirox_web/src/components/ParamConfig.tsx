import { Settings, Hash, Timer, Bug, FolderOutput } from "lucide-react";
import { useAppStore } from "@/store/appStore";

export function ParamConfig() {
  const { params, updateParams } = useAppStore();

  return (
    <div className="card animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
      <div className="flex items-center gap-2 mb-6">
        <Hash className="w-4 h-4 text-accent" />
        <h2 className="text-lg font-semibold text-text-primary">注册参数</h2>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="label">注册数量</label>
          <input
            type="number"
            min="1"
            max="1000"
            value={params.count}
            onChange={(e) => updateParams({ count: parseInt(e.target.value) || 1 })}
            className="input-base"
          />
        </div>

        <div>
          <label className="label">任务间隔 (秒)</label>
          <input
            type="number"
            min="0"
            max="300"
            value={params.delay}
            onChange={(e) => updateParams({ delay: parseInt(e.target.value) || 0 })}
            className="input-base"
          />
        </div>

        <div className="flex items-center pt-6">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div className="relative">
              <input
                type="checkbox"
                checked={params.debug}
                onChange={(e) => updateParams({ debug: e.target.checked })}
                className="sr-only"
              />
              <div className={`w-10 h-6 rounded-full transition-colors ${params.debug ? "bg-accent" : "bg-bg-elevated border border-border"}`}>
                <div className={`w-4 h-4 rounded-full bg-white transition-transform mt-1 ${params.debug ? "translate-x-5 ml-5" : "translate-x-1 ml-1"}`} />
              </div>
            </div>
            <span className="text-sm text-text-secondary">调试模式</span>
          </label>
        </div>

        <div>
          <label className="label">输出路径</label>
          <input
            type="text"
            value={params.output}
            onChange={(e) => updateParams({ output: e.target.value })}
            className="input-base"
          />
        </div>
      </div>
    </div>
  );
}
