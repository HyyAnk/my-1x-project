import { describe, expect, it } from "vitest";
import { buildQuizShortVoicePlan } from "../src/quiz/audio/quizShortVoicePlan.js";
import { QUIZ_SHORT_KICKOFF_SEGMENT_ID, buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { quizShortKickoffLine, quizShortRevealLine } from "../src/quiz/audio/quizShortVoiceCopy.js";
import { quizVoiceTargetWordsPerSecond } from "../src/quiz/audio/voicePolicy.js";
import { createQuizShortDirectorPlan } from "../src/quiz/director/quizShortDirectorPlan.js";
import { buildQuizShortConfig, buildQuizShortQuiz, buildTextQuizShortQuiz } from "./fixtures/quizShortFixtures.js";

describe("Quiz Short voice plan", () => {
  it("emits question and reveal segments only, with a kickoff line and no closing", () => {
    const quiz = buildTextQuizShortQuiz();
    const director = createQuizShortDirectorPlan(quiz, buildQuizShortConfig());
    const voice = buildQuizShortVoicePlan(quiz, { director });
    const roles = new Set(voice.segments.map((segment) => segment.role));
    expect(roles.has("choice")).toBe(false);
    expect(roles.has("thinking_prompt")).toBe(false);
    expect(roles.has("explanation")).toBe(false);
    expect(roles.has("outro")).toBe(false);
    expect(roles.has("pre_outro")).toBe(false);
    expect(voice.segments[0]).toMatchObject({ segment_id: QUIZ_SHORT_KICKOFF_SEGMENT_ID, role: "intro", text: "Five questions. Ready?" });
    expect(voice.segments.at(-1)?.role).toBe("reveal");
    expect(voice.segments.filter((segment) => segment.role === "question")).toHaveLength(5);
    expect(voice.segments.filter((segment) => segment.role === "reveal")).toHaveLength(5);
  });

  it("matches buildQuizVoicePlan with the short pacing profile and spells the question count", () => {
    const quiz = buildQuizShortQuiz([{}, {}, {}]);
    const viaProfile = buildQuizVoicePlan(quiz, { pacingProfile: "short" });
    expect(viaProfile).toEqual(buildQuizShortVoicePlan(quiz));
    expect(viaProfile.segments[0].text).toBe("Three questions. Ready?");
    expect(quizShortKickoffLine(7, "en")).toBe("Seven questions. Ready?");
  });

  it("reads the correct choice label plus the answer, trimmed to eight words", () => {
    const quiz = buildQuizShortQuiz([
      { correctIndex: 1 },
      { format: "yes_no", correctIndex: 1 },
      { choices: ["A very long answer that keeps going on and on forever", "Short"], correctIndex: 0 },
    ]);
    const voice = buildQuizShortVoicePlan(quiz);
    const reveals = voice.segments.filter((segment) => segment.role === "reveal").map((segment) => segment.text);
    expect(reveals[0]).toBe("B. Mars!");
    expect(reveals[1]).toBe("No!");
    expect(reveals[2].split(/\s+/).length).toBeLessThanOrEqual(8);
    expect(reveals[2].startsWith("A. A very long answer")).toBe(true);
  });

  it("keeps Chinese copy working", () => {
    const quiz = buildQuizShortQuiz([{ correctIndex: 2 }, { format: "yes_no", choices: ["是", "否"] }], { language: "zh" });
    const voice = buildQuizShortVoicePlan(quiz);
    expect(voice.segments[0].text).toBe("2道题，准备好了吗？");
    expect(quizShortKickoffLine(5, "zh")).toBe("五道题，准备好了吗？");
    expect(quizShortRevealLine(quiz.questions[0], "zh")).toBe("C，Venus！");
    expect(quizShortRevealLine(quiz.questions[1], "zh")).toBe("是！");
  });

  it("targets one words-per-second step faster for the short profile", () => {
    expect(quizVoiceTargetWordsPerSecond("7-9", "short")).toBe(2.6);
    expect(quizVoiceTargetWordsPerSecond("7-9")).toBe(2.5);
    expect(quizVoiceTargetWordsPerSecond("4-6", "short")).toBe(2.5);
  });
});
