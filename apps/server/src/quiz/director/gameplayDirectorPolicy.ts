import { gameplayTimingPolicy, resolveGameplayPolicy, type DirectorBeat, type QuizV2 } from "@studio/shared";

export function applyGameplayDirectorPolicy(quiz: QuizV2, beat: DirectorBeat): DirectorBeat {
  const question = quiz.questions.find((item) => item.id === beat.question_id);
  if (!question) throw new Error(`Unknown director question ${beat.question_id}`);
  const policy = resolveGameplayPolicy({
    ...question,
    layout_id: beat.layout_id,
    gameplay_id:
      beat.gameplay_id ??
      question.gameplay_id ??
      (question.format === "true_false" && beat.layout_id !== "split_versus_two" ? "verdict_true_false" : undefined),
  });
  if (question.choices.length !== policy.choiceCount) {
    throw new Error(`Gameplay ${policy.id} requires ${policy.choiceCount} choices for ${question.id}`);
  }
  const timing = gameplayTimingPolicy(policy, quiz.age_band, question.difficulty);
  const noChoices = policy.id === "mystery_reveal";
  return {
    ...beat,
    gameplay_id: policy.id,
    thinking_seconds: timing.minimum_thinking_seconds,
    beat_intents: noChoices ? beat.beat_intents.filter((intent) => intent !== "choice_reveal") : beat.beat_intents,
    visual_density: policy.id === "visual_spotting" || policy.id === "speed_blitz" ? "focused" : beat.visual_density,
    reward_intensity: policy.id === "speed_blitz" ? "small" : beat.reward_intensity,
  };
}
