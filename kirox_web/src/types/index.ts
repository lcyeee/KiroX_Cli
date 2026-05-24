export interface OutlookAccount {
  email: string;
  password: string;
  clientId: string;
  refreshToken: string;
}

export interface RunParams {
  count: number;
  delay: number;
  concurrency: number;
  debug: boolean;
  output: string;
  proxy: string;
  useOutlook: boolean;
  moemailUrl?: string;
  moemailKey?: string;
  outlookCsv?: string;
}

export interface RegistrationResult {
  email: string;
  refreshToken: string;
  clientId: string;
  clientSecret: string;
  subscription: string;
  creditUsed: string;
  creditLimit: string;
  region: string;
  provider: string;
}

export type EmailMode = "moemail" | "outlook";

export type ProcessStatus = "idle" | "running" | "completed" | "stopped";
