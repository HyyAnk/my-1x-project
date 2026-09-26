import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./test",
  testMatch: ["introOutroSinglePass.spec.ts", "pairWorkspace.spec.ts", "pairResources.spec.ts"],
  timeout: 30_000,
  use: { baseURL: "http://127.0.0.1:2244", screenshot: "only-on-failure" },
  webServer: { command: "pnpm dev", url: "http://127.0.0.1:2244", reuseExistingServer: true },
});
