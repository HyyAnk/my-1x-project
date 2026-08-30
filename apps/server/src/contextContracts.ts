import { type Episode, type TaskType, QUIZ_MAX_QUESTION_COUNT, QUIZ_MIN_QUESTION_COUNT } from "@studio/shared";
import { parseArtifactSectionNumber, type ArtifactSectionKind } from "./artifactSections.js";
import { QUIZ_STYLE_CONTRACTS } from "./quiz/assets/promptCompiler.js";
import { continuityBundleId } from "./visualBundles.js";

export function humorGuidanceForDuration(minutes: number): string {
  if (minutes <= 3) return "weave 1–2 dry, evidence-grounded humor beats across the story";
  if (minutes <= 5) return "weave 2–3 dry, evidence-grounded humor beats across the story";
  return "weave 2–4 dry, evidence-grounded humor beats across the story";
}

export function sequenceGuidanceForDuration(minutes: number): string {
  if (minutes <= 3) return "5–6";
  if (minutes <= 5) return "6–8";
  return "7–10";
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function selectSections(markdown: string, headings: string[]): string {
  return headings
    .map((heading) => {
      const match = markdown.match(new RegExp(`## ${escapeRegExp(heading)}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`, "i"));
      return match ? `## ${heading}\n${match[1].trim()}` : "";
    })
    .filter(Boolean)
    .join("\n\n");
}

export function excerptForScene(script: string, sceneNumber: number): string {
  const lines = script.split(/\r?\n/);
  const center = Math.min(lines.length, Math.max(0, Math.floor((lines.length * sceneNumber) / Math.max(1, sceneNumber + 1))));
  return lines.slice(Math.max(0, center - 18), center + 18).join("\n");
}

export function selectMarkdownSection(
  markdown: string,
  sectionNumber: number,
  headingPattern: RegExp = /^##\s+/i,
  kind?: ArtifactSectionKind,
): string {
  const lines = markdown.split(/\r?\n/);
  const starts = lines.map((line, index) => (headingPattern.test(line) ? index : -1)).filter((index) => index >= 0);
  const numberedStarts = kind
    ? starts.filter((index) => parseArtifactSectionNumber(lines[index].replace(/^##\s+/, ""), kind) !== null)
    : [];
  const explicitStart = kind
    ? numberedStarts.find((index) => parseArtifactSectionNumber(lines[index].replace(/^##\s+/, ""), kind) === sectionNumber)
    : undefined;
  const start = explicitStart ?? (kind && numberedStarts.length > 0 ? undefined : starts[sectionNumber - 1]);
  if (start === undefined) throw new Error(`Sequence ${sectionNumber} was not found in an upstream artifact`);
  const next = starts.find((candidate) => candidate > start) ?? lines.length;
  return lines.slice(start, next).join("\n").trim();
}

export function selectMarkdownSectionOrFallback(
  markdown: string,
  sectionNumber: number,
  headingPattern: RegExp,
  kind: ArtifactSectionKind,
  artifactName: string,
): string {
  try {
    return selectMarkdownSection(markdown, sectionNumber, headingPattern, kind);
  } catch {
    const content = markdown.trim();
    if (!content) throw new Error(`Sequence ${sectionNumber} was not found in an upstream artifact`);
    return [
      `## ${artifactName} fallback for requested section ${sectionNumber}`,
      "The upstream artifact has no dedicated numbered section for this request. Preserve the requested sequence/question number and infer only stable identity rules from the complete artifact below.",
      content,
    ].join("\n\n");
  }
}

export function selectResearchForSequence(researchMarkdown: string, sequenceNumber: number, isQuiz: boolean): string {
  const claimId = `C${String(sequenceNumber).padStart(2, "0")}`;
  const shortClaimId = `C${sequenceNumber}`;
  const lines = researchMarkdown.split(/\r?\n/);

  const claimHeaderIndex = lines.findIndex((line) =>
    new RegExp(`^###?\\s+(?:${claimId}|${shortClaimId}|Question\\s+${sequenceNumber}\\b)`, "i").test(line),
  );

  if (claimHeaderIndex !== -1) {
    const nextHeaderIndex = lines.findIndex((line, idx) => idx > claimHeaderIndex && /^###?\s+/i.test(line));
    const claimSection = lines
      .slice(claimHeaderIndex, nextHeaderIndex === -1 ? lines.length : nextHeaderIndex)
      .join("\n")
      .trim();

    const tableStartIndex = lines.findIndex((line) => line.includes("| Question |") || line.includes("| Claim ID |"));
    let ledgerRow = "";
    if (tableStartIndex !== -1) {
      const headerLine = lines[tableStartIndex] || "";
      const separatorLine = lines[tableStartIndex + 1] || "";
      const rowLine =
        lines
          .slice(tableStartIndex + 2)
          .find(
            (line) =>
              line.includes(`Q${sequenceNumber}`) ||
              line.includes(`Q0${sequenceNumber}`) ||
              line.includes(`| ${claimId}`) ||
              line.includes(`| ${shortClaimId}`),
          ) || "";
      if (rowLine) {
        ledgerRow = `### Answer Ledger Summary\n${headerLine}\n${separatorLine}\n${rowLine}\n\n`;
      }
    }

    return `${ledgerRow}### Scoped Research Evidence for Sequence ${sequenceNumber} (${claimId})\n\n${claimSection}`;
  }

  return researchMarkdown;
}

export interface OutputContractInput {
  taskType: TaskType;
  isQuiz: boolean;
  episode: Episode | null;
  sceneNumber?: number;
  quizQuestionCount: number;
  quizLastClaimId: string;
  quizSourceMinimum: number;
  calibratedTargetWords: number;
  narrationWordsPerSecond: number;
  scriptBounds: { lower: number; upper: number };
  humorGuidance: string;
  sequenceGuidance: string;
  requiredBundleInstruction: string;
  maxBeatWords: number;
}

export function buildOutputContract(input: OutputContractInput): string {
  const {
    taskType,
    isQuiz,
    episode,
    sceneNumber,
    quizQuestionCount,
    quizLastClaimId,
    quizSourceMinimum,
    calibratedTargetWords,
    narrationWordsPerSecond,
    scriptBounds,
    humorGuidance,
    sequenceGuidance,
    requiredBundleInstruction,
    maxBeatWords,
  } = input;

  const isTrueFalse = isQuiz && episode?.quiz_config?.quiz_format === "true_false";
  const treatmentChoicesContract = isTrueFalse
    ? "Answer choices (strictly exactly 2 choices: True or False / Đúng hoặc Sai — never add a 3rd option)"
    : "Answer choices (strictly exactly 3 choices: A, B, and C only; vary and balance the correct answer position across A, B, and C so no two consecutive questions share the same correct choice position)";
  const scriptChoicesContract = isTrueFalse
    ? "choices (strictly exactly 2 choices: True or False / Đúng hoặc Sai)"
    : "choices (strictly exactly 3 options: A, B, and C only; vary and balance the correct answer position so no two consecutive questions share the same answer letter)";
  const maxChoicesLimitText = isTrueFalse ? "2" : "3";
  const sequenceBeatChoicesContract = isTrueFalse
    ? "Choices array must contain exactly 2 choices (True and False only; never add a 3rd option)."
    : "Choices array must contain exactly 3 choices (A, B, C only; never add or omit an option; never place the correct answer in the same letter position for two consecutive questions).";
  const sceneBeatChoicesContract = isTrueFalse
    ? "Choices must have exactly 2 options (True and False only; never exceed 2 choices)."
    : "Choices must have exactly 3 options (A, B, C only; never add or omit a choice; never place the correct answer in the same letter position for two consecutive questions).";

  if (isQuiz && taskType === "GENERATE_RESEARCH") {
    return `Return only a completed Markdown quiz research dossier. The episode has exactly ${quizQuestionCount} questions. Build an answer ledger with exactly ${quizQuestionCount} entries, one entry for every question in order, and assign each entry one unique claim ID exactly once from C01 through ${quizLastClaimId}. Do not stop early, merge questions, reuse a claim ID, or invent extra question numbers. Every ledger entry must include Question number, Claim ID, canonical answer, one ultra-concise child-friendly explanation (strictly 1 punchy fun fact under 10 words and under 70 characters, single clause, direct and crisp with no filler or preamble), direct authoritative URL(s), and a note about ambiguity or safety. Include at least ${quizSourceMinimum} distinct direct authoritative URLs and enough evidence for every answer. Before returning, silently check that every ID in the complete sequence C01, C02, ... ${quizLastClaimId} appears in the ledger and that each question has evidence.`;
  }

  if (isQuiz && taskType === "GENERATE_TREATMENT") {
    return `Return only a completed Markdown quiz treatment. Define the episode format, age band, ${episode?.quiz_config.question_count} question blocks, and visual/audio rhythm. Use one second-level heading per question exactly like \`## Question 1 — Title\`. Each block must include Purpose, Question (ultra-concise, under 10 words, direct single-clause phrasing), ${treatmentChoicesContract} or visual clue, Correct answer, Think time, Reveal beat, Explanation (strictly 1 punchy, child-friendly fun fact under 10 words and under 70 characters), Claim IDs, and Time budget. Never generate more than ${maxChoicesLimitText} answer choices. Keep the total runtime appropriate for ${episode?.quiz_config.question_count} questions.`;
  }

  if (isQuiz && taskType === "GENERATE_SCRIPT") {
    return `Return only one completed Markdown quiz narration script. Include exactly ${episode?.quiz_config.question_count} question blocks, formatted as second-level headings \`## Question 1 — Title\` through Question ${episode?.quiz_config.question_count}. Fold the welcome into Question 1 and the closing into the final question so the section count stays exact. For each block speak the question (ultra-concise, under 10 words, direct phrasing), ${scriptChoicesContract} or clue, an invitation to guess, the reveal, and one ultra-concise explanation (strictly 1 short, punchy fun fact under 10 words and under 70 characters). Never provide more than ${maxChoicesLimitText} answer choices. Use concise child-friendly language for ages ${episode?.quiz_config.age_band}. Add the exact hidden marker <!-- HUMOR_POLICY: v1 --> after the title. Use HTML comments only for restrained audio cues. Do not include JSON, planning notes, or visual directions.`;
  }

  if (isQuiz && taskType === "GENERATE_VISUAL_BIBLE") {
    const resolvedStyle = episode?.quiz_config?.resolved_visual_style ?? "pixar_3d";
    const styleContract = QUIZ_STYLE_CONTRACTS[resolvedStyle] || QUIZ_STYLE_CONTRACTS.pixar_3d;
    return `Return only a completed Markdown Quiz Visual Bible. Define a single child-friendly, vibrant, high-appeal visual direction strictly adhering to the locked art style "${styleContract.name}" (${styleContract.renderingMedium}; ${styleContract.lighting}; ${styleContract.edgeTreatment}; ${styleContract.detailLevel}). Backgrounds must be subtle and fitting (${styleContract.heroBackground}), avoiding pure flat white backgrounds while ensuring the main subject remains the sharpest and most prominent element. Include an explicit second-level section named exactly \`## Safe motion\` with labeled Allowed motion, Prohibited motion, and Reduced-motion fallback rules; the phrase "safe motion" must appear exactly in the document. Create exactly ${episode?.quiz_config.question_count} continuity bundles formatted as \`## Continuity bundle CB-01 — Title\` through CB-${String(episode?.quiz_config.question_count).padStart(2, "0")}. Every bundle must include an Anchor-frame prompt describing ONLY the clean hero subject illustration and environment with ${styleContract.continuityPromptBrief}. Never include question cards, answer choices, countdown timers, UI boxes, or text inside Anchor-frame prompts because the video composition engine renders all quiz UI dynamically on top of the clean artwork.`;
  }

  if (taskType === "GENERATE_RESEARCH") {
    return "Return only a completed Markdown research dossier. Include: research question, chronological evidence, verified claim ledger with stable IDs C01..., failure factors, what replaced the idea, open uncertainties, and a visual evidence inventory. Every material claim must cite a direct primary or authoritative URL. Use at least 8 independent sources and distinguish fact, inference, and uncertainty.";
  }

  if (taskType === "GENERATE_TREATMENT") {
    return `Return only a completed Markdown treatment. Define the thesis, audience promise, target duration and word count, then ${sequenceGuidance} numbered sequences. Format every sequence as a second-level heading exactly like \`## Sequence 1 — Title\`. Every sequence must include labeled Purpose, Time budget, Dramatic question, Claim IDs, Evidence/visual modes, Transition, and Changed understanding fields. Time budgets must sum to the target duration.`;
  }

  if (taskType === "GENERATE_SCRIPT") {
    return `Return only one completed Markdown narration script for the confirmed episode. Do not return planning notes, reasoning, research, treatment, tool output, JSON, file excerpts, or an explanation. The final answer must be only the script. Target approximately ${calibratedTargetWords} spoken words for ${episode?.target_duration_minutes} minutes at ${narrationWordsPerSecond.toFixed(2)} words per second; the hard acceptable range is ${scriptBounds.lower}–${scriptBounds.upper} spoken words. Aim near ${Math.round(calibratedTargetWords * 1.05)} words and never add padding to reach the number. Humor must replace generic explanation, not add new paragraphs or extend the runtime. The legacy ${episode?.target_word_count}-word metadata target is only a planning hint. Add this exact hidden marker immediately after the title: <!-- HUMOR_POLICY: v1 -->. Follow the treatment sequence order. Build the argument from dated events, named programs/people/organizations, measurable facts, decisions, and consequences from research. Add a restrained humor layer: ${humorGuidance}. Never invent a quote, statistic, anecdote, or reaction for a joke; never mock victims or sensitive subjects. After a humorous spoken line, add only an HTML comment of the form <!-- AUDIO_CUE: chuckle --> or, rarely, <!-- AUDIO_CUE: laugh -->. Use at most one laugh cue per three minutes and prefer chuckle. Do not write (laughs), [laugh], or visual directions in the visible narration. Before returning, silently verify that the marker exists, humor beats are spaced across the argument, every joke is grounded in the scoped research, and the spoken word count is between ${scriptBounds.lower} and ${scriptBounds.upper}.`;
  }

  if (taskType === "GENERATE_VISUAL_BIBLE") {
    return `Return only a completed Markdown Episode Visual Bible. Define fixed channel constants, episode palette, typography/graphic language, editorial overlay system, recurring hero objects, evidence treatment, and asset mix. Provenance is tracked in production metadata; do not require a visible AI or reconstruction label inside footage prompts. ${requiredBundleInstruction} Format every bundle as a second-level heading exactly like \`## Continuity bundle CB-01 — Title\`, using the exact numeric IDs from the upstream artifact. Each bundle needs labeled Era, Location, Subjects, Wardrobe/objects, Palette, Lighting, Texture, Anchor-frame prompt, Reference asset slots, and Allowed shot variation fields.`;
  }

  if (taskType === "GENERATE_BUNDLE_IMAGE") {
    const resolvedStyle = episode?.quiz_config?.resolved_visual_style ?? "pixar_3d";
    const styleContract = QUIZ_STYLE_CONTRACTS[resolvedStyle] || QUIZ_STYLE_CONTRACTS.pixar_3d;
    return `Generate exactly one reference image for continuity bundle ${continuityBundleId(sceneNumber ?? 0)}. Follow the bundle's Anchor-frame prompt and the locked visual style (${isQuiz ? styleContract.continuityPromptBrief : "channel Visual Style/Visual Language locks"}). Depict only the described environment, subjects, era, palette, lighting, and texture. No text, captions, logos, UI, split panels, charts, watermarks, or labels. Save the final PNG exactly to the requested image output path in the task instructions. If the connected image capability returns bytes instead of writing a file, return a data:image/png;base64 payload or report the saved PNG path.`;
  }

  if (isQuiz && taskType === "GENERATE_SEQUENCE_SCENES") {
    return `Return a JSON array of quiz beats covering only the provided script question in exact order. Fields: { dialogue, sequence_id: 'sequence-${sceneNumber}', sequence_title, shot_id, visual_prompt, asset_type: 'ai_reconstruction'|'diagram'|'transition', continuity_key, continuity_bundle_id: 'CB-${String(sceneNumber ?? 0).padStart(2, "0")}', reference_asset_ids: string[], source_ids: ['C${String(sceneNumber ?? 0).padStart(2, "0")}'], reconstruction: boolean, sound_cue, transition_note, continuity_note, editorial_overlay: { kind: 'none' }, quiz: { phase: intro|question|reveal|explanation|outro, question_number: ${sceneNumber}, question, choices: string[], answer, explanation, image_prompt } }. ${sequenceBeatChoicesContract} Every beat must carry source_ids with the claim ID ['C${String(sceneNumber ?? 0).padStart(2, "0")}']. Preserve the exact question, all visible choices, canonical answer, and child-friendly explanation across every beat in this sequence (keep question ultra-concise under 10 words, and explanation strictly 1 punchy fun fact under 10 words and under 70 characters). The quiz.image_prompt is strictly MANDATORY for every question beat: provide a clear, child-friendly semantic visual subject describing the illustration for this question (e.g. 'A friendly cartoon cheetah sprinting across a sunny savanna'); never leave image_prompt empty. Copy every spoken word from the provided script section verbatim and in order into one or more dialogue fields; split only at natural boundaries and never paraphrase or omit words. Use sequence_id 'sequence-${sceneNumber}', a non-empty continuity_bundle_id exactly 'CB-${String(sceneNumber ?? 0).padStart(2, "0")}', and a non-empty continuity_note that explains the visual identity lock. The visual_prompt must contain the exact uppercase sections CAMERA, ACTION, LIGHTING, ATMOSPHERE, and CONTINUITY, with concrete content under every section. Keep text out of visual_prompt because HyperFrames renders the quiz card from the structured quiz object.`;
  }

  if (taskType === "GENERATE_SEQUENCE_SCENES") {
    return `Return a JSON array of shot beats covering only the provided script sequence in exact order without paraphrasing or omission. Every beat must use no more than ${maxBeatWords} words and should end at a sentence or natural clause boundary. Use sequence_id "sequence-${sceneNumber}", the provided sequence title, and continuity_bundle_id "CB-${String(sceneNumber ?? 0).padStart(2, "0")}". Fields: { dialogue, sequence_id, sequence_title, shot_id, visual_prompt, asset_type: archive|document|map|diagram|ai_reconstruction|contemporary|transition, continuity_key, continuity_bundle_id, reference_asset_ids: string[], source_ids: ['C${String(sceneNumber ?? 0).padStart(2, "0")}'] or claim IDs from research, reconstruction: boolean, sound_cue, transition_note, continuity_note, editorial_overlay: { kind: none|caption|stat_card|timeline|bar_chart|line_chart|map_callout|comparison|quote, text, motion: none|fade_up|slide_in|draw_on|count_up|highlight, placement: lower_third|upper_left|upper_right|center|side_panel, duration_seconds, data: [{ label, value, unit }], source_ids: string[] } }. Every beat except transitions must carry source_ids. Every prompt must be distinct and include CAMERA/ACTION/LIGHTING/ATMOSPHERE/CONTINUITY sections. The visual_prompt describes only the visible footage: never put captions, labels, logos, UI, charts, source IDs, or 'AI VISUALIZATION' text inside it. Use editorial_overlay.kind 'none' for most beats; across the complete episode target 25–30% of shots with an overlay. Use overlays only when they clarify a date, number, geography, comparison, named program, or quote. Charts require at least two sourced data points; never invent data. Repeat the bundle identity locks, link evidence IDs, and do not add durations, SHOT PLAN, or timecodes.`;
  }

  if (isQuiz && taskType === "GENERATE_SCENES") {
    return `Return a JSON array of quiz scene beats covering the script in exact order. Create one or more beats for the welcome, each of the ${episode?.quiz_config.question_count} questions, and the closing. Every beat must include dialogue, sequence_id, sequence_title, shot_id, visual_prompt with CAMERA/ACTION/LIGHTING/ATMOSPHERE/CONTINUITY sections, asset_type, continuity_key, continuity_bundle_id, reference_asset_ids, source_ids (e.g. ['C01'] matching each question's Claim ID), reconstruction, sound_cue, transition_note, continuity_note, editorial_overlay, and quiz: { phase: intro|question|reveal|explanation|outro, question_number, question, choices: string[], answer, explanation, image_prompt }. ${sceneBeatChoicesContract} Questions must be ultra-concise (under 10 words) and explanations strictly 1 punchy fun fact (under 10 words, under 70 characters, crisp single clause). The quiz.image_prompt is strictly MANDATORY for every question beat: describe a clear, child-friendly semantic visual subject matching the question (e.g. 'A friendly cartoon cheetah sprinting across a sunny savanna'); never leave image_prompt empty. Use safe, high-contrast, child-friendly quiz visuals. Never place source IDs or production labels inside visual_prompt.`;
  }

  if (taskType === "GENERATE_SCENES") {
    return `Return a JSON array of shot beats covering the script narration in exact order without paraphrasing or omission. Copy every spoken word from the provided script section verbatim and in order into one or more dialogue fields; split only at natural boundaries and never paraphrase, shorten, add, or omit words. Each beat must use no more than ${maxBeatWords} words and should end at a sentence or natural clause boundary. Fields: { dialogue, sequence_id, sequence_title, shot_id, visual_prompt, asset_type: archive|document|map|diagram|ai_reconstruction|contemporary|transition, continuity_key, continuity_bundle_id, reference_asset_ids: string[], source_ids: claim/source IDs[], reconstruction: boolean, sound_cue, transition_note, continuity_note, editorial_overlay: { kind: none|caption|stat_card|timeline|bar_chart|line_chart|map_callout|comparison|quote, text, motion: none|fade_up|slide_in|draw_on|count_up|highlight, placement: lower_third|upper_left|upper_right|center|side_panel, duration_seconds, data: [{ label, value, unit }], source_ids: string[] } }. Every beat must have non-empty source_ids (except transitions), a non-empty continuity_bundle_id, a non-empty continuity_note, and a distinct visual_prompt containing the exact uppercase sections CAMERA, ACTION, LIGHTING, ATMOSPHERE, and CONTINUITY, with concrete content under every section. The visual_prompt must describe only image, camera, action, lighting, and atmosphere. Never put captions, labels, logos, UI, charts, source IDs, or 'AI VISUALIZATION' text inside the visual_prompt. Archive/document/map shots must name visible evidence; AI reconstructions must be physically specific. Use editorial_overlay.kind 'none' for most beats and target 25–30% overlay coverage across the complete episode. Charts require sourced data points and overlays must never invent data. Do not repeat a prompt. Do not add durations, SHOT PLAN, or timecodes.`;
  }

  return "Return one JSON object for the requested scene regeneration. Include only the fields being regenerated and preserve sequence, sources, references, continuity bundle, and editorial_overlay. The visual_prompt must describe only footage and use CAMERA/ACTION/LIGHTING/ATMOSPHERE/CONTINUITY sections. Never put captions, labels, logos, UI, charts, source IDs, or AI disclosure text inside the visual_prompt. Do not write files.";
}
