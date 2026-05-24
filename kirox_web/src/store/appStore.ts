import { create } from "zustand";
import type {
  OutlookAccount,
  RunParams,
  RegistrationResult,
  EmailMode,
  ProcessStatus,
} from "@/types";

interface AppState {
  emailMode: EmailMode;
  setEmailMode: (mode: EmailMode) => void;

  params: RunParams;
  updateParams: (params: Partial<RunParams>) => void;

  processStatus: ProcessStatus;
  setProcessStatus: (status: ProcessStatus) => void;
  pid: number | null;
  setPid: (pid: number | null) => void;

  logs: string;
  appendLogs: (log: string) => void;
  setLogs: (logs: string) => void;
  clearLogs: () => void;

  elapsed: string;
  setElapsed: (elapsed: string) => void;

  outlookAccounts: OutlookAccount[];
  setOutlookAccounts: (accounts: OutlookAccount[]) => void;
  outlookLoaded: boolean;
  setOutlookLoaded: (loaded: boolean) => void;

  results: RegistrationResult[];
  setResults: (results: RegistrationResult[]) => void;

  loading: boolean;
  setLoading: (loading: boolean) => void;

  error: string | null;
  setError: (error: string | null) => void;
}

const defaultParams: RunParams = {
  count: 1,
  delay: 3,
  concurrency: 3,
  debug: false,
  output: "output/results.json",
  proxy: "",
  useOutlook: false,
};

export const useAppStore = create<AppState>((set) => ({
  emailMode: "moemail",
  setEmailMode: (mode) => set({ emailMode: mode }),

  params: defaultParams,
  updateParams: (newParams) =>
    set((state) => ({
      params: { ...state.params, ...newParams },
    })),

  processStatus: "idle",
  setProcessStatus: (status) => set({ processStatus: status }),
  pid: null,
  setPid: (pid) => set({ pid }),

  logs: "",
  appendLogs: (log) => set((state) => ({ logs: state.logs + log })),
  setLogs: (logs) => set({ logs }),
  clearLogs: () => set({ logs: "" }),

  elapsed: "0s",
  setElapsed: (elapsed) => set({ elapsed }),

  outlookAccounts: [],
  setOutlookAccounts: (accounts) => set({ outlookAccounts: accounts }),
  outlookLoaded: false,
  setOutlookLoaded: (loaded) => set({ outlookLoaded: loaded }),

  results: [],
  setResults: (results) => set({ results }),

  loading: false,
  setLoading: (loading) => set({ loading }),

  error: null,
  setError: (error) => set({ error }),
}));
