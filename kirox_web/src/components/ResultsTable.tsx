import { useEffect, useState } from "react";
import { FileJson, Download, Table } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { getResults } from "@/api/client";

export function ResultsTable() {
  const { processStatus, params } = useAppStore();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const res = await getResults(params.output);
      setResults(res.results);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [processStatus]);

  const handleDownload = () => {
    if (results.length === 0) return;
    const jsonStr = JSON.stringify(results, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "results.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (results.length === 0 && !loading) {
    return (
      <div className="card animate-fade-in-up" style={{ animationDelay: "0.6s" }}>
        <div className="flex items-center gap-2 mb-6">
          <FileJson className="w-4 h-4 text-accent" />
          <h2 className="text-lg font-semibold text-text-primary">注册结果</h2>
        </div>
        <div className="text-center py-12 text-text-muted">
          <Table className="w-8 h-8 mx-auto mb-3 opacity-50" />
          <p className="text-sm">暂无注册结果</p>
          <p className="text-xs mt-1">完成注册后将在此显示结果</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card animate-fade-in-up" style={{ animationDelay: "0.6s" }}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FileJson className="w-4 h-4 text-accent" />
          <h2 className="text-lg font-semibold text-text-primary">注册结果</h2>
        </div>
        {results.length > 0 && (
          <span className="text-sm text-text-secondary">
            已注册 <span className="text-accent font-semibold">{results.length}</span> 个账号
          </span>
        )}
      </div>

      {results.length > 0 && (
        <>
          <div className="overflow-auto max-h-80 rounded-lg border border-border mb-6">
            <table className="w-full text-sm">
              <thead className="bg-bg-elevated sticky top-0">
                <tr>
                  <th className="text-left px-4 py-3 text-text-secondary font-medium">#</th>
                  <th className="text-left px-4 py-3 text-text-secondary font-medium">邮箱</th>
                  <th className="text-left px-4 py-3 text-text-secondary font-medium">区域</th>
                  <th className="text-left px-4 py-3 text-text-secondary font-medium">订阅</th>
                  <th className="text-left px-4 py-3 text-text-secondary font-medium">已用积分</th>
                  <th className="text-left px-4 py-3 text-text-secondary font-medium">积分上限</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-t border-border hover:bg-bg-hover/50 transition-colors">
                    <td className="px-4 py-3 text-text-muted font-mono">{i + 1}</td>
                    <td className="px-4 py-3 text-text-primary font-mono">{r.email || "-"}</td>
                    <td className="px-4 py-3 text-text-secondary">{r.region || "-"}</td>
                    <td className="px-4 py-3 text-text-secondary">{r.subscription || "-"}</td>
                    <td className="px-4 py-3 text-text-secondary">{r.creditUsed || "-"}</td>
                    <td className="px-4 py-3 text-text-secondary">{r.creditLimit || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <button className="btn-primary flex items-center gap-2" onClick={handleDownload}>
              <Download className="w-4 h-4" />
              下载结果 JSON
            </button>
          </div>
        </>
      )}
    </div>
  );
}
