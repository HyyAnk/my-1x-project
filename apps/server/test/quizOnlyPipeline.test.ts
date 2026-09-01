import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { selectResearchForQuestion } from "../src/contextContracts.js";

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src");

describe("Quiz-only server pipeline", () => {
  it("scopes research by question without a production-mode argument", () => {
    const research = "# Research\n\n### C02\nQuestion two evidence";
    expect(selectResearchForQuestion(research, 2)).toContain("Question two evidence");
  });

  it("contains no channel-mode branches and uses the Quiz runner filename", () => {
    const files = [
      "context/channelContextBuilder.ts",
      "context/episodeContextBuilder.ts",
      "tasks/codexRetries.ts",
      "tasks/handlers/textArtifactHandlers.ts",
      "tasks/handlers/sceneArtifactHandlers.ts",
      "tasks/pipeline/pipelineHelpers.ts",
      "tasks/video/videoCompositionPreparer.ts",
      "repository/scenes.ts",
      "routes/quizV2.ts",
    ];
    for (const relative of files) {
      const source = readFileSync(path.join(serverRoot, relative), "utf8");
      expect(source).not.toMatch(/channel\.(engine|group_id)/);
    }
    const retiredRunner = ["docu", "mentaryPipelineRunner.ts"].join("");
    expect(existsSync(path.join(serverRoot, "tasks/pipeline/quizProductionPipelineRunner.ts"))).toBe(true);
    expect(existsSync(path.join(serverRoot, "tasks/pipeline", retiredRunner))).toBe(false);
  });
});
