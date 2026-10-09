import { defineConfig } from "@playwright/test";
// Isolated API fixtures exercise the web app without mutating production data.

export default defineConfig({
  testDir: "./test",
  testMatch: "thumbnailConcurrency.spec.ts",
  timeout: 30_000,
  use: { baseURL: "http://127.0.0.1:7743", screenshot: "only-on-failure" },
  webServer: { command: "pnpm dev", url: "http://127.0.0.1:7743", reuseExistingServer: true },
});
