import { defineConfig, configDefaults } from "vitest/config";

const isVisualRegressionEnabled =
  process.env.RUN_VISUAL_REGRESSION === "1" || process.env.RUN_VISUAL_REGRESSION === "true" || process.env.UPDATE_VISUAL_SNAPSHOTS === "1";

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 15000,
    hookTimeout: 30000,
    include: ["test/**/*.test.ts"],
    exclude: [
      ...configDefaults.exclude,
      ...(isVisualRegressionEnabled ? [] : ["**/quizPixelVisualRegression.test.ts", "test/quizPixelVisualRegression.test.ts"]),
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
});
