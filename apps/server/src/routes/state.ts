import type { AppConfig } from "@studio/shared";

export type AppState = {
  config: AppConfig;
  storageConfigured: boolean;
};
