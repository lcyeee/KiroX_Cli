import { Settings, Globe, Hash } from "lucide-react";
import { useAppStore } from "@/store/appStore";

export function GlobalSettings() {
  const { emailMode, setEmailMode, params, updateParams } = useAppStore();

  return (
    <div className="card animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-4 h-4 text-accent" />
        <h2 className="text-lg font-semibold text-text-primary">全局设置</h2>
      </div>

      <div className="space-y-5">
        <div>
          <label className="label">邮箱模式</label>
          <div className="flex gap-2">
            <button
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                emailMode === "moemail"
                  ? "bg-accent text-black"
                  : "bg-bg-elevated text-text-secondary hover:bg-bg-hover border border-border"
              }`}
              onClick={() => setEmailMode("moemail")}
            >
              MoeMail 临时邮箱
            </button>
            <button
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                emailMode === "outlook"
                  ? "bg-accent text-black"
                  : "bg-bg-elevated text-text-secondary hover:bg-bg-hover border border-border"
              }`}
              onClick={() => setEmailMode("outlook")}
            >
              Outlook 邮箱池
            </button>
          </div>
        </div>

        <div>
          <label className="label">代理地址</label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              className="input-base pl-10"
              placeholder="http://user:pass@ip:port"
              value={params.proxy}
              onChange={(e) => updateParams({ proxy: e.target.value })}
            />
          </div>
          <p className="text-xs text-text-muted mt-1.5">选填，需以 http://、https:// 或 socks5:// 开头</p>
        </div>

        <div>
          <label className="label">并发数</label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="1"
              max="10"
              value={params.concurrency}
              onChange={(e) => updateParams({ concurrency: parseInt(e.target.value) })}
              className="flex-1 accent-accent"
            />
            <span className="text-text-primary font-mono text-sm bg-bg-elevated px-3 py-1 rounded-md min-w-[3rem] text-center">
              {params.concurrency}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
