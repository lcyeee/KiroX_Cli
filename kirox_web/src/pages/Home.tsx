import { HeroSection } from "@/components/HeroSection";
import { GlobalSettings } from "@/components/GlobalSettings";
import { ParamConfig } from "@/components/ParamConfig";
import { EmailPoolManager } from "@/components/EmailPoolManager";
import { MoemailConfig } from "@/components/MoemailConfig";
import { ControlPanel } from "@/components/ControlPanel";
import { LogViewer } from "@/components/LogViewer";
import { ResultsTable } from "@/components/ResultsTable";
import { StatusMonitor } from "@/components/StatusMonitor";
import { useAppStore } from "@/store/appStore";

export default function Home() {
  const { emailMode } = useAppStore();

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <HeroSection />

        <div className="grid grid-cols-12 gap-6">
          {/* 左侧：设置区域 */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <GlobalSettings />
            <ParamConfig />
          </div>

          {/* 右侧：主内容区域 */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            {emailMode === "outlook" ? <EmailPoolManager /> : <MoemailConfig />}
            <ControlPanel />
            <LogViewer />
            <ResultsTable />
          </div>
        </div>
      </div>

      <StatusMonitor />
    </div>
  );
}
