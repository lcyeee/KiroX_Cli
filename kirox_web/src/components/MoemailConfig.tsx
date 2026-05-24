import { KeyRound, Link } from "lucide-react";
import { useAppStore } from "@/store/appStore";

export function MoemailConfig() {
  const { params, updateParams } = useAppStore();

  return (
    <div className="card animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
      <div className="flex items-center gap-2 mb-6">
        <KeyRound className="w-4 h-4 text-accent" />
        <h2 className="text-lg font-semibold text-text-primary">MoeMail 配置</h2>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="label">API 地址</label>
          <div className="relative">
            <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              className="input-base pl-10"
              value={params.moemailUrl || ""}
              onChange={(e) => updateParams({ moemailUrl: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="label">API Key</label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="password"
              className="input-base pl-10"
              value={params.moemailKey || ""}
              onChange={(e) => updateParams({ moemailKey: e.target.value })}
              placeholder="输入 MoeMail API Key"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
