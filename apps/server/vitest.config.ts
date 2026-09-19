import { defineConfig, configDefaults } from "vitest/config";

const isVisualRegressionEnabled =
  process.env.RUN_VISUAL_REGRESSION === "1" || process.env.RUN_VISUAL_REGRESSION === "true" || process.env.UPDATE_VISUAL_SNAPSHOTS === "1";
const testSuite = process.env.STUDIO_TEST_SUITE ?? "fast";
const systemTestPatterns = ["test/**/*.system.test.ts", "test/**/*.browser.test.ts"];
const testInclude = testSuite === "system" ? systemTestPatterns : ["test/**/*.test.ts"];
const suiteExcludes = testSuite === "fast" ? systemTestPatterns : [];

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 15000,
    hookTimeout: 60000,
    include: testInclude,
    exclude: [
      ...configDefaults.exclude,
      ...suiteExcludes,
      ...(isVisualRegressionEnabled ? [] : ["**/quizPixelVisualRegression.test.ts", "test/quizPixelVisualRegression.test.ts"]),
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
});
