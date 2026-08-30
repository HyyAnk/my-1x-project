import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./test",
  timeout: process.env.CI ? 60_000 : 30_000,
  expect: {
    timeout: 10_000,
  },
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://127.0.0.1:2244",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "pnpm --filter @studio/server start",
      url: "http://127.0.0.1:4310/api/health",
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "pnpm --filter @studio/web dev",
      url: "http://127.0.0.1:2244",
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
