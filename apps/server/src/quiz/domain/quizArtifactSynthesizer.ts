import type { QuizV2, Scene } from "@studio/shared";

export interface SynthesizedLegacyArtifacts {
  script: string;
  visualBible: string;
  scenes: Scene[];
}

export function synthesizeScriptMarkdown(quiz: QuizV2, topicTitle?: string): string {
  const title = topicTitle?.trim() || "Quiz Episode";
  const lines: string[] = [
    `# ${title}`,
    "",
    "<!-- HUMOR_POLICY: v1 -->",
    "",
  ];

  quiz.questions.forEach((question, index) => {
    const questionNumber = index + 1;
    const correctChoice = question.choices.find((c) => c.id === question.correct_choice_id);
    const answerText = correctChoice ? correctChoice.text : "";

    lines.push(`## Question ${questionNumber} — ${question.question}`);
    lines.push("");
    lines.push(`${question.question}`);
    lines.push("");
    question.choices.forEach((choice, choiceIndex) => {
      const label = String.fromCharCode(65 + choiceIndex);
      lines.push(`- ${label}: ${choice.text}`);
    });
    lines.push("");
    lines.push("Take a guess and think carefully!");
    lines.push("");
    lines.push(`The canonical correct answer is: ${answerText}.`);
    lines.push("");
    if (question.explanation) {
      lines.push(`${question.explanation}`);
      lines.push("");
    }
    if (question.fun_fact && question.fun_fact !== question.explanation) {
      lines.push(`Fun fact: ${question.fun_fact}`);
      lines.push("");
    }
  });

  return lines.join("\n").trim() + "\n";
}

export function synthesizeVisualBible(quiz: QuizV2): string {
  const lines: string[] = [
    "# Episode Visual Bible",
    "",
    "## Safe motion",
    "Allowed motion: gentle camera pan and gentle zoom. Prohibited motion: rapid strobing, flashing, fast shaking. Reduced-motion fallback: static shot.",
    "",
  ];

  quiz.questions.forEach((question, index) => {
    const bundleNumber = index + 1;
    const bundleId = `CB-${String(bundleNumber).padStart(2, "0")}`;
    const prompt = question.visual_opportunity.trim() || `Illustration for ${question.question}`;

    lines.push(`## Continuity bundle ${bundleId} — Question ${bundleNumber}`);
    lines.push("- Era: Contemporary");
    lines.push("- Location: Studio environment");
    lines.push("- Subjects: Hero subject");
    lines.push("- Palette: Harmonized child-friendly tones");
    lines.push("- Lighting: Soft studio lighting");
    lines.push(`- Anchor-frame prompt: ${prompt}`);
    lines.push("- Reference asset slots: anchor");
    lines.push("");
  });

  return lines.join("\n").trim() + "\n";
}

export function synthesizeScenesFromQuiz(quiz: QuizV2): Scene[] {
  return quiz.questions.map((question, index): Scene => {
    const sceneNumber = index + 1;
    const bundleId = `CB-${String(sceneNumber).padStart(2, "0")}`;
    const claimId = `C${String(sceneNumber).padStart(2, "0")}`;
    const correctChoice = question.choices.find((c) => c.id === question.correct_choice_id);
    const answerText = correctChoice ? correctChoice.text : "";
    const prompt = question.visual_opportunity.trim() || question.question;

    return {
      scene_id: `scene-${sceneNumber}`,
      episode_id: quiz.episode_id,
      scene_number: sceneNumber,
      duration_seconds: 7.5,
      dialogue: `${question.question} ${answerText}. ${question.explanation}`.trim(),
      visual_prompt: [
        "CAMERA",
        "Clean hero card illustration",
        "ACTION",
        prompt,
        "LIGHTING",
        "Soft studio lighting",
        "ATMOSPHERE",
        "Vibrant child-friendly",
        "CONTINUITY",
        `Lock ${bundleId}`,
      ].join("\n"),
      transition_note: "",
      continuity_note: `Lock continuity bundle ${bundleId}`,
      sequence_id: `sequence-${sceneNumber}`,
      sequence_title: `Question ${sceneNumber}`,
      shot_id: `shot-${sceneNumber}`,
      asset_type: "ai_reconstruction",
      continuity_bundle_id: bundleId,
      reference_asset_ids: [],
      source_ids: question.source_ids.length > 0 ? question.source_ids : [claimId],
      reconstruction: true,
      sound_cue: "",
      editorial_overlay: {
        kind: "none",
        text: "",
        motion: "none",
        placement: "lower_third",
        duration_seconds: null,
        data: [],
        source_ids: [],
      },
      quiz: {
        phase: "question",
        question_number: sceneNumber,
        question: question.question,
        choices: question.choices.map((c) => c.text),
        answer: answerText,
        explanation: question.explanation,
        image_prompt: prompt,
      },
      audio_asset_path: null,
      audio_generated_at: null,
      audio_duration_seconds: null,
    };
  });
}

export function synthesizeAllLegacyArtifacts(quiz: QuizV2, topicTitle?: string): SynthesizedLegacyArtifacts {
  return {
    script: synthesizeScriptMarkdown(quiz, topicTitle),
    visualBible: synthesizeVisualBible(quiz),
    scenes: synthesizeScenesFromQuiz(quiz),
  };
}
