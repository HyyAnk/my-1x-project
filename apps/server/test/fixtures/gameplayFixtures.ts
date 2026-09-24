import {
  getQuizGameplayArchetype,
  QuizConfigSchema,
  QuizV2Schema,
  resolveGameplayPolicy,
  type QuizGameplayArchetypeId,
} from "@studio/shared";
import { createEpisodeDirectorPlan } from "../../src/quiz/director/episodeDirectorPlan.js";
import { buildQuizVoicePlan } from "../../src/quiz/audio/voicePlan.js";
import { compileQuizTimeline } from "../../src/quiz/timeline/compileTimeline.js";

export function gameplayFixture(id: QuizGameplayArchetypeId, ageBand: "4-6" | "7-9" | "10-12" | "family" = "7-9") {
  const blueprint = getQuizGameplayArchetype(id)!;
  const policy = resolveGameplayPolicy({ gameplay_id: id });
  const quiz = QuizV2Schema.parse({
    schema_version: 2,
    episode_id: `gameplay-${id}`,
    age_band: ageBand,
    language: "en",
    questions: Array.from({ length: 3 }, (_, i) => ({
      id: `q${i + 1}`,
      number: i + 1,
      gameplay_id: id,
      format: blueprint.defaultFormat,
      difficulty: i + 1,
      question: id === "speed_blitz" ? "What is two plus two?" : "Which shape is different?",
      choices: (id === "verdict_true_false"
        ? ["True", "False"]
        : id === "speed_blitz"
          ? ["Four", "Five", "Six"]
          : ["Circle", "Square", "Triangle"]
      )
        .slice(0, policy.choiceCount)
        .map((text, n) => ({ id: `c${n}`, text })),
      correct_choice_id: "c0",
      answer_mode: policy.choiceCount === 1 ? "single_reveal" : "choice_selection",
      explanation: "The circle has no corners.",
      source_ids: ["C01"],
      visual_opportunity: "A clean geometric shape on a neutral background",
      validation: { fact_locked: true, source_coverage: true, semantic_status: "validated" },
    })),
  });
  const config = QuizConfigSchema.parse({ archetype: id, target_layout: blueprint.targetLayout });
  const director = createEpisodeDirectorPlan(quiz, config);
  const voice = buildQuizVoicePlan(quiz, { director, skipIntro: true, skipOutro: true });
  const durations = Object.fromEntries(
    voice.segments.map((segment) => [segment.segment_id, Math.max(0.8, segment.text.split(/\s+/).length / 2)]),
  );
  const timeline = compileQuizTimeline({ quiz, director, voicePlan: voice, audioDurations: durations });
  return { quiz, director, voice, timeline, durations, config, policy };
}
