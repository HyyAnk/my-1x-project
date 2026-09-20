import { describe, expect, it } from "vitest";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { buildCandyArcadeCompositionBundle } from "../src/quiz/render/candyArcadeComposition.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import { candyArcadeQuiz } from "./candyArcadeTestUtils.js";

describe("China-Chinese production locale", () => {
  it("uses Chinese narration connectors and intro/outro video copy", () => {
    const quiz = {
      ...candyArcadeQuiz,
      episode_id: "china-locale-demo",
      language: "zh-CN",
    };
    const voicePlan = buildQuizVoicePlan(quiz);
    const intro = voicePlan.segments.find((segment) => segment.role === "intro");
    const choice = voicePlan.segments.find((segment) => segment.role === "choice");
    const reveal = voicePlan.segments.find((segment) => segment.role === "reveal");
    const outro = voicePlan.segments.find((segment) => segment.role === "outro");

    expect(intro?.text).toContain("\u6311\u6218\u5927\u8111");
    expect(choice?.text).toContain("\u8fd8\u662f");
    expect(reveal?.text).toContain("\u7b54\u5bf9\u4e86");
    expect(outro?.text).toContain("\u8bc4\u8bba\u533a");

    const director = createDefaultDirectorPlan(quiz);
    const timeline = compileQuizTimeline({ quiz, director, voicePlan });
    const bundle = buildCandyArcadeCompositionBundle({
      quiz,
      director,
      timeline,
      narrationDurationSeconds: timeline.duration_seconds,
      audioPath: "./narration.wav",
      styleContext: { theme: "candy_arcade" },
    });
    const sources = [bundle.html, ...Object.values(bundle.files)].join("\n");

    expect(sources).toContain("\u95ee\u7b54\u65f6\u95f4");
    expect(sources).toContain("\u4f60\u7b54\u5bf9\u4e86\u591a\u5c11\u9898\uff1f");
    expect(sources).toContain("\u8bc4\u8bba");
    expect(sources).toContain("\u70b9\u8d5e");
    expect(sources).toContain("\u8ba2\u9605");
  });
});
