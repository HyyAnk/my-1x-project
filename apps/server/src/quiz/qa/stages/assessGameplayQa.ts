import { resolveGameplayPolicy, type DirectorPlan, type QuizIssue, type QuizTimeline, type QuizV2, type VoicePlan } from "@studio/shared";

export function assessGameplayQa(input: {
  quiz: QuizV2;
  director?: DirectorPlan | null;
  timeline?: QuizTimeline | null;
  voicePlan?: VoicePlan | null;
}): QuizIssue[] {
  if (!input.director?.gameplay_policy_version) return [];
  const issues: QuizIssue[] = [];
  for (const question of input.quiz.questions) {
    const beat = input.director.beats.find((item) => item.question_id === question.id);
    if (!beat) continue;
    const policy = resolveGameplayPolicy(beat);
    const segments = input.voicePlan?.segments.filter((segment) => segment.question_id === question.id) ?? [];
    const events = input.timeline?.events.filter((event) => event.question_id === question.id) ?? [];
    const reveal = events.find((event) => event.type === "answer.reveal");
    const add = (code: string, message: string, severity: QuizIssue["severity"] = "blocker") =>
      issues.push({
        code,
        message,
        severity,
        question_ids: [question.id],
        stage: "timeline",
        next_action: "Regenerate the affected gameplay artifacts and review the question before rendering.",
      });
    if (!policy.readChoices && segments.some((segment) => segment.role === "choice"))
      add("gameplay_unexpected_choice_voice", `${policy.id} must not narrate choice labels.`);
    if (policy.id === "mystery_reveal" && events.some((event) => event.type === "choices.enter"))
      add("gameplay_mystery_choices_visible", "Mystery must not show answer choices before reveal.");
    if (
      reveal &&
      events.some(
        (event) =>
          event.type === "narration.segment" && event.segment_id === `${question.id}:reveal` && event.at_seconds < reveal.at_seconds,
      )
    )
      add("gameplay_early_answer_voice", "Answer narration precedes the visual reveal.");
    if (policy.id === "versus_faceoff" && question.choices.some((choice) => /^(true|false)$/i.test(choice.text.trim())))
      add("gameplay_versus_verdict_labels", "Versus requires named competitors, not True/False labels.");
    if (policy.id === "speed_blitz" && (question.question.length > 70 || question.choices.some((choice) => choice.text.length > 40)))
      add("gameplay_speed_reading_load", "Speed Blitz text is too long for a rapid reading window.", "warning");
    if (policy.id === "visual_spotting")
      add(
        "gameplay_spotting_visual_review",
        "Confirm the generated images contain exactly one intended, visible difference; text validation cannot establish this.",
        "warning",
      );
  }
  return issues;
}
