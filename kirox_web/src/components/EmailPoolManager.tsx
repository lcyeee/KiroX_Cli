import { useState } from "react";
import { Mail, Upload, ClipboardPaste, Eye, X, Table } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import type { OutlookAccount } from "@/types";

function parseOutlookLines(data: string): OutlookAccount[] {
  const accounts: OutlookAccount[] = [];
  const trimmed = data.trim();
  if (!trimmed) return accounts;

  const lines = trimmed.split("\n");
  for (const line of lines) {
    const l = line.trim();
    if (!l || l.startsWith("#")) continue;
    const parts = l.split("----", 4);
    if (parts.length === 4) {
      accounts.push({
        email: parts[0].trim(),
        password: parts[1].trim(),
        clientId: parts[2].trim(),
        refreshToken: parts[3].trim(),
      });
    }
  }
  return accounts;
}

export function EmailPoolManager() {
  const { outlookAccounts, setOutlookAccounts, setOutlookLoaded, outlookLoaded } = useAppStore();
  const [activeTab, setActiveTab] = useState<"upload" | "preview">("upload");
  const [outlookText, setOutlookText] = useState("");

  const handleLoad = () => {
    const accounts = parseOutlookLines(outlookText);
    if (accounts.length > 0) {
      setOutlookAccounts(accounts);
      setOutlookLoaded(true);
    }
  };

  const handleClear = () => {
    setOutlookAccounts([]);
    setOutlookLoaded(false);
    setOutlookText("");
  };

  return (
    <div className="card animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
      <div className="flex items-center gap-2 mb-6">
        <Mail className="w-4 h-4 text-accent" />
        <h2 className="text-lg font-semibold text-text-primary">Outlook 邮箱池管理</h2>
        {outlookLoaded && (
          <span className="ml-auto text-xs bg-accent-glow text-accent px-2.5 py-1 rounded-full border border-accent/20">
            {outlookAccounts.length} 个账号
          </span>
        )}
      </div>

      <div className="flex gap-1 mb-6 bg-bg-elevated rounded-lg p-1">
        <button
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            activeTab === "upload"
              ? "bg-bg-hover text-text-primary"
              : "text-text-muted hover:text-text-secondary"
          }`}
          onClick={() => setActiveTab("upload")}
        >
          <span className="flex items-center justify-center gap-2">
            <Upload className="w-3.5 h-3.5" />
            上传/粘贴
          </span>
        </button>
        <button
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            activeTab === "preview"
              ? "bg-bg-hover text-text-primary"
              : "text-text-muted hover:text-text-secondary"
          }`}
          onClick={() => setActiveTab("preview")}
        >
          <span className="flex items-center justify-center gap-2">
            <Eye className="w-3.5 h-3.5" />
            账号预览
          </span>
        </button>
      </div>

      {activeTab === "upload" && (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-accent/30 transition-colors">
            <textarea
              className="w-full bg-transparent text-text-primary placeholder-text-muted resize-none focus:outline-none font-mono text-sm"
              rows={6}
              placeholder="粘贴账号数据 (每行: 邮箱----密码----客户端ID----RefreshToken)&#10;&#10;example@outlook.com----password123----xxxx-xxxx----token..."
              value={outlookText}
              onChange={(e) => setOutlookText(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <button className="btn-primary flex-1 flex items-center justify-center gap-2" onClick={handleLoad}>
              <ClipboardPaste className="w-4 h-4" />
              加载邮箱数据
            </button>
            {outlookLoaded && (
              <button className="btn-secondary flex items-center justify-center gap-2" onClick={handleClear}>
                <X className="w-4 h-4" />
                清除
              </button>
            )}
          </div>
        </div>
      )}

      {activeTab === "preview" && (
        <div>
          {outlookLoaded && outlookAccounts.length > 0 ? (
            <div className="overflow-auto max-h-80 rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-bg-elevated sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-3 text-text-secondary font-medium">#</th>
                    <th className="text-left px-4 py-3 text-text-secondary font-medium">邮箱</th>
                    <th className="text-left px-4 py-3 text-text-secondary font-medium">客户端 ID</th>
                    <th className="text-left px-4 py-3 text-text-secondary font-medium">Refresh Token</th>
                  </tr>
                </thead>
                <tbody>
                  {outlookAccounts.map((acc, i) => (
                    <tr key={i} className="border-t border-border hover:bg-bg-hover/50 transition-colors">
                      <td className="px-4 py-3 text-text-muted font-mono">{i + 1}</td>
                      <td className="px-4 py-3 text-text-primary font-mono">{acc.email}</td>
                      <td className="px-4 py-3 text-text-secondary font-mono text-xs">{acc.clientId.slice(0, 20)}...</td>
                      <td className="px-4 py-3 text-text-muted font-mono text-xs">{acc.refreshToken.slice(0, 30)}...</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-text-muted">
              <Table className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm">暂无已加载的邮箱账号</p>
              <p className="text-xs mt-1">请先在上传/粘贴页面加载数据</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
