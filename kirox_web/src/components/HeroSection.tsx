import { Rocket, Settings, Mail, Play, Square, Download, Eye, FileJson } from "lucide-react";

export function HeroSection() {
  return (
    <div className="text-center py-10 animate-fade-in">
      <div className="inline-flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-accent-glow flex items-center justify-center border border-accent/20">
          <Rocket className="w-6 h-6 text-accent" />
        </div>
      </div>
      <h1 className="text-3xl font-bold text-text-primary tracking-tight mb-2">
        KiroX CLI
      </h1>
      <p className="text-text-secondary text-base">
        AWS Builder ID 批量注册控制台
      </p>
      <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-elevated border border-border">
        <span className="text-xs text-text-muted">端口 2011</span>
      </div>
    </div>
  );
}
