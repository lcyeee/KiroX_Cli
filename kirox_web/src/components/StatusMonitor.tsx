import { useEffect, useRef } from "react";
import { useAppStore } from "@/store/appStore";

export function StatusMonitor() {
  const { processStatus, setProcessStatus, appendLogs, setElapsed } = useAppStore();
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (processStatus === "running") {
      startTimeRef.current = Date.now();
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const elapsed = (Date.now() - startTimeRef.current) / 1000;
          if (elapsed < 60) {
            setElapsed(`${elapsed.toFixed(1)}s`);
          } else {
            const minutes = Math.floor(elapsed / 60);
            const seconds = Math.floor(elapsed % 60);
            setElapsed(`${minutes}m ${seconds}s`);
          }
        }
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [processStatus, setElapsed]);

  useEffect(() => {
    if (processStatus === "running") {
      const mockLogs = [
        "[2024-01-01 10:00:01] 初始化注册任务...\n",
        "[2024-01-01 10:00:02] 加载配置完成\n",
        "[2024-01-01 10:00:03] 开始第 1 个账号注册...\n",
        "[2024-01-01 10:00:05] 获取临时邮箱: temp_abc123@moemail.app\n",
        "[2024-01-01 10:00:08] 提交 AWS Builder ID 注册表单\n",
        "[2024-01-01 10:00:12] 等待验证邮件...\n",
        "[2024-01-01 10:00:15] 收到验证邮件，正在提取验证码\n",
        "[2024-01-01 10:00:16] 验证码: 123456，正在提交...\n",
        "[2024-01-01 10:00:18] 验证通过！注册成功\n",
        "[2024-01-01 10:00:18] 保存结果到 output/results.json\n",
        "[2024-01-01 10:00:19] 等待 3 秒后开始下一个...\n",
      ];

      let i = 0;
      const logInterval = setInterval(() => {
        if (i < mockLogs.length) {
          appendLogs(mockLogs[i]);
          i++;
        } else {
          clearInterval(logInterval);
          setProcessStatus("completed");
          appendLogs("\n[系统] 所有注册任务已完成！\n");
        }
      }, 800);

      return () => clearInterval(logInterval);
    }
  }, [processStatus, appendLogs, setProcessStatus]);

  return null;
}
