import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("Quiz V1 Retirement Architecture Tripwires", () => {
  const serverRoot = path.resolve(__dirname, "..");
  const srcRoot = path.resolve(serverRoot, "src");

  it("ensures obsolete V1 buildComposition.ts file is deleted", () => {
    const v1CompositionFile = path.resolve(srcRoot, "quiz/render/buildComposition.ts");
    expect(existsSync(v1CompositionFile)).toBe(false);
  });

  const productionFiles = [
    "tasks.ts",
    "tasks/videoRunner.ts",
    "tasks/video/videoCompositionPreparer.ts",
    "tasks/video/renderManifestWriter.ts",
    "quiz/render/hyperframesRenderer.ts",
    "quiz/render/layouts/registry.ts",
    "tasks/pipeline/quizProductionPipelineRunner.ts",
  ];

  const retiredSymbols = [
    "buildQuizComposition",
    "buildQuizV2Composition",
    "buildQuizV2CompositionBundle",
    "QuizV2CompositionInput",
    "completeQuizV2",
    "QUIZ_LAYOUT_REGISTRY",
    "USE_LEGACY_QUIZ_PIPELINE",
    "runLegacyPipeline",
    "executeShotPlanSequences",
  ];

  for (const fileRel of productionFiles) {
    const fullPath = path.resolve(srcRoot, fileRel);
    it(`guarantees ${fileRel} contains zero retired V1 symbols`, () => {
      expect(existsSync(fullPath)).toBe(true);
      const content = readFileSync(fullPath, "utf-8");

      for (const symbol of retiredSymbols) {
        expect(content).not.toContain(symbol);
      }
    });
  }

  it("guarantees render manifest writer enforces literal V2 versioning without legacy fallback", () => {
    const manifestWriterPath = path.resolve(srcRoot, "tasks/video/renderManifestWriter.ts");
    const content = readFileSync(manifestWriterPath, "utf-8");

    expect(content).toContain("quiz_engine_version: 2");
    expect(content).toContain("schema_version: 2");
    expect(content).not.toContain("legacy_skipped");
  });
});
