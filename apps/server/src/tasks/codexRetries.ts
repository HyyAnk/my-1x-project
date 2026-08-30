import { calibratedScriptTargetWords, extractNarrationSections, scriptWordBounds } from "../production.js";
import { extractArtifactSectionNumbers } from "../artifactSections.js";
import type { ActiveRun, TaskManagerRuntime } from "./runtime.js";

export async function retryQuizResearch(this: TaskManagerRuntime, active: ActiveRun, reason: string): Promise<void> {
  const episode = await this.repository.getEpisode(active.task.channel_id, active.task.episode_id!);
  const questionCount = episode.quiz_config.question_count;
  const lastClaimId = `C${String(questionCount).padStart(2, "0")}`;
  const sourceMinimum = Math.max(3, Math.ceil(questionCount / 2));
  const client = this.activeEngine === "antigravity" && this.antigravity ? this.antigravity : this.codex;
  const threadId = await client.startThread();
  const turnId = await client.startTurn(
    threadId,
    `${active.manifest.prompt}\n\nSTRICT RETRY: The previous Quiz Research response failed validation (${reason}). Start over in a fresh response. The episode has exactly ${questionCount} questions. Return a complete Markdown quiz research dossier with exactly one ledger entry per question and exactly one unique claim ID for each question: C01, C02, ... ${lastClaimId}. Include every ID in order; do not stop at an earlier ID, reuse an ID, or count a source URL as a claim. Every entry must include the question number, canonical answer, child-friendly explanation, direct authoritative URL(s), and ambiguity or safety note. Include at least ${sourceMinimum} distinct direct authoritative URLs. Silently verify the full C01–${lastClaimId} sequence and all ${questionCount} question entries before returning. Return only the dossier, with no planning notes, reasoning, JSON, or explanation outside the Markdown document.`,
  );
  active.threadId = threadId;
  active.turnId = turnId;
  active.output = "";
  active.researchAttempts += 1;
  await this.update(active.task.task_id, {
    codex_thread_id: threadId,
    codex_turn_id: turnId,
    progress_message: "Retrying research with complete claim ledger",
  });
}

export async function retryScript(this: TaskManagerRuntime, active: ActiveRun, reason: string): Promise<void> {
  const episode = await this.repository.getEpisode(active.task.channel_id, active.task.episode_id!);
  const targetWords = calibratedScriptTargetWords(episode, this.videoConfig.narration_words_per_second);
  const bounds = scriptWordBounds(targetWords);
  const client = this.activeEngine === "antigravity" && this.antigravity ? this.antigravity : this.codex;
  const threadId = await client.startThread();
  const turnId = await client.startTurn(
    threadId,
    `${active.manifest.prompt}\n\nSTRICT RETRY: The previous response failed validation (${reason}). Start over in a fresh response. Return only one Markdown narration script, with no planning, reasoning, research dossier, treatment, tool output, JSON, or explanation. Keep spoken narration between ${bounds.lower} and ${bounds.upper} words for the ${episode.target_duration_minutes}-minute target; aim for approximately ${targetWords} words. Do not echo any scoped files. Preserve the HUMOR_POLICY marker and restrained AUDIO_CUE comments.`,
  );
  active.threadId = threadId;
  active.turnId = turnId;
  active.output = "";
  active.scriptAttempts += 1;
  await this.update(active.task.task_id, {
    codex_thread_id: threadId,
    codex_turn_id: turnId,
    progress_message:
      active.task.task_type === "GENERATE_SCRIPT" && reason.startsWith("Quiz script quality gate failed")
        ? "Retrying quiz script with strict question format"
        : "Retrying script with strict word budget",
  });
}

export async function retryVisualBible(this: TaskManagerRuntime, active: ActiveRun, reason: string): Promise<void> {
  const channel = await this.repository.getChannel(active.task.channel_id);
  const episode = await this.repository.getEpisode(active.task.channel_id, active.task.episode_id!);
  const isQuiz = channel.engine === "quiz";
  const treatment = await this.repository.getEpisodeFile(active.task.channel_id, active.task.episode_id!, "treatment.md");
  const requiredBundleNumbers = isQuiz
    ? Array.from({ length: episode.quiz_config.question_count }, (_, index) => index + 1)
    : extractArtifactSectionNumbers(treatment.content, "sequence");
  const bundleRequirement = isQuiz
    ? `Create continuity bundles for every question using the exact IDs ${requiredBundleNumbers.map((number) => `CB-${String(number).padStart(2, "0")}`).join(", ")}.`
    : requiredBundleNumbers.length
      ? `Create one continuity bundle for every treatment sequence using the exact IDs ${requiredBundleNumbers.map((number) => `CB-${String(number).padStart(2, "0")}`).join(", ")}.`
      : "Include at least five stable bundles using exact second-level headings `## Continuity bundle CB-01 — Title`, `CB-02`, and so on.";
  const quizMotionRequirement = isQuiz
    ? "Include an explicit second-level section named exactly `## Safe motion` with labeled Allowed motion, Prohibited motion, and Reduced-motion fallback rules. The exact phrase `safe motion` must appear in the returned Markdown."
    : "";
  const client = this.activeEngine === "antigravity" && this.antigravity ? this.antigravity : this.codex;
  const threadId = await client.startThread();
  const turnId = await client.startTurn(
    threadId,
    `${active.manifest.prompt}\n\nSTRICT RETRY: The previous ${isQuiz ? "Quiz " : ""}Visual Bible failed validation (${reason}). Start over in a fresh response. Return only the Markdown ${isQuiz ? "Quiz " : ""}Visual Bible, with no reasoning, research, treatment, tool output, JSON, or explanation. ${bundleRequirement} Every bundle must include Era, Location, Subjects, Palette, Lighting, Anchor-frame prompt, and Reference asset slots. ${quizMotionRequirement} Do not use alternative heading names. Do not omit bundle IDs.`,
  );
  active.threadId = threadId;
  active.turnId = turnId;
  active.output = "";
  active.visualBibleAttempts += 1;
  await this.update(active.task.task_id, {
    codex_thread_id: threadId,
    codex_turn_id: turnId,
    progress_message: isQuiz ? "Retrying Quiz visual bible with safe motion rules" : "Retrying visual bible with strict continuity schema",
  });
}

export async function retrySequenceScenes(this: TaskManagerRuntime, active: ActiveRun, reason: string): Promise<void> {
  const channel = await this.repository.getChannel(active.task.channel_id);
  const isQuiz = channel.engine === "quiz";
  const episode = active.task.episode_id
    ? await this.repository.getEpisode(active.task.channel_id, active.task.episode_id).catch(() => null)
    : null;
  const isTrueFalse = isQuiz && episode?.quiz_config?.quiz_format === "true_false";
  const choiceRequirement = isTrueFalse
    ? "visible choices (strictly exactly 2 choices: True and False only; never add a 3rd option)"
    : "visible choices (strictly exactly 3 choices: A, B, C only; never add or omit a choice)";
  const sequenceNumber = active.task.scene_number ?? 1;
  const script = await this.repository.getEpisodeFile(active.task.channel_id, active.task.episode_id!, "script.md");
  const section = extractNarrationSections(script.content)[sequenceNumber - 1];
  const exactNarration = section?.text.trim() ?? "";
  const strictContract = isQuiz
    ? `Preserve every quiz field and return only a JSON array. Copy every word from the exact narration below verbatim and in order into one or more dialogue fields. Split only at natural boundaries; never paraphrase, shorten, add, or omit words. The final narration coverage must be at least 97.5%. Every beat must use a non-empty continuity_bundle_id exactly "CB-${String(sequenceNumber).padStart(2, "0")}", a non-empty continuity_note, and a distinct visual_prompt with the exact uppercase sections CAMERA, ACTION, LIGHTING, ATMOSPHERE, and CONTINUITY. Every non-intro/outro beat must repeat the same question, ${choiceRequirement}, canonical answer, and explanation for this question. Set answer to the exact text of one visible choice; do not return a bare mismatched label, invented choice, or a different answer per beat. Every beat must include complete quiz question, choices, answer, and explanation data.`
    : "Return only a JSON array. Copy every word from the exact narration below verbatim and in order into one or more dialogue fields. Split only at natural boundaries; never paraphrase, shorten, add, or omit words. The final narration coverage must be at least 97.5%. Every beat must use a non-empty continuity_bundle_id, a non-empty continuity_note, and a distinct visual_prompt with the exact uppercase sections CAMERA, ACTION, LIGHTING, ATMOSPHERE, and CONTINUITY.";
  const narrationBlock = exactNarration ? `\n\nEXACT NARRATION TO COVER VERBATIM:\n<NARRATION>\n${exactNarration}\n</NARRATION>` : "";
  const client = this.activeEngine === "antigravity" && this.antigravity ? this.antigravity : this.codex;
  const threadId = await client.startThread();
  const turnId = await client.startTurn(
    threadId,
    `${active.manifest.prompt}\n\nSTRICT RETRY: The previous ${isQuiz ? "Quiz " : ""}shot-plan response failed validation (${reason}). Start over in a fresh response. ${strictContract}${narrationBlock}\n\nDo not omit metadata, use empty strings, repeat prompts, add Markdown fences, add commentary, or return anything except the JSON array.`,
  );
  active.threadId = threadId;
  active.turnId = turnId;
  active.output = "";
  active.sequenceAttempts += 1;
  await this.update(active.task.task_id, {
    codex_thread_id: threadId,
    codex_turn_id: turnId,
    progress_message: isQuiz
      ? "Retrying Quiz shot plan with strict continuity metadata"
      : "Retrying shot plan with strict structure metadata",
  });
}
