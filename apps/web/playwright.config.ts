import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./test",
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://127.0.0.1:2244",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: [
    { command: "pnpm --filter @studio/server start", url: "http://127.0.0.1:4310/api/health", reuseExistingServer: true },
    { command: "pnpm --filter @studio/web dev", url: "http://127.0.0.1:2244", reuseExistingServer: true },
  ],
});
