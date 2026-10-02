export {};

declare global {
  interface Window {
    leadpilotDesktop?: {
      storeGet<T>(key: string): Promise<T | null>;
      storeSet(key: string, value: unknown): Promise<boolean>;
      storeDelete(key: string): Promise<boolean>;
      getOpenAIStatus(): Promise<{ configured: boolean; hint: string | null; model: string }>;
      setOpenAIKey(apiKey: string): Promise<{ configured: boolean; hint: string | null; model: string }>;
      deleteOpenAIKey(): Promise<boolean>;
      askOpenAI(payload: { instructions: string; input: string }): Promise<{ text: string; model: string }>;
      getAppInfo(): Promise<{ version: string; platform: string; autostart: boolean }>;
      setAutostart(enabled: boolean): Promise<boolean>;
    };
  }
}
