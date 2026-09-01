import { type Episode, type TaskType } from "@studio/shared";
import { QUIZ_STYLE_CONTRACTS } from "../quiz/assets/promptCompiler.js";
import { continuityBundleId } from "../visualBundles.js";

export interface OutputContractInput {
  taskType: TaskType;
  episode: Episode | null;
  sceneNumber?: number;
  quizQuestionCount: number;
  quizLastClaimId: string;
  quizSourceMinimum: number;
}

export function buildOutputContract(input: OutputContractInput): string {
  const { taskType, episode, sceneNumber, quizQuestionCount, quizLastClaimId, quizSourceMinimum } = input;
  const isTrueFalse = episode?.quiz_config?.quiz_format === "true_false";
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

  if (taskType === "GENERATE_RESEARCH") {
    return `Return only a completed Markdown quiz research dossier. The episode has exactly ${quizQuestionCount} questions. Build an answer ledger with exactly ${quizQuestionCount} entries, one entry for every question in order, and assign each entry one unique claim ID exactly once from C01 through ${quizLastClaimId}. Do not stop early, merge questions, reuse a claim ID, or invent extra question numbers. Every ledger entry must include Question number, Claim ID, canonical answer, one ultra-concise child-friendly explanation (strictly 1 punchy fun fact under 10 words and under 70 characters, single clause, direct and crisp with no filler or preamble), direct authoritative URL(s), and a note about ambiguity or safety. Include at least ${quizSourceMinimum} distinct direct authoritative URLs and enough evidence for every answer. Before returning, silently check that every ID in the complete sequence C01, C02, ... ${quizLastClaimId} appears in the ledger and that each question has evidence.`;
  }

  if (taskType === "GENERATE_TREATMENT") {
    return `Return only a completed Markdown quiz treatment. Define the episode format, age band, ${episode?.quiz_config.question_count} question blocks, and visual/audio rhythm. Use one second-level heading per question exactly like \`## Question 1 — Title\`. Each block must include Purpose, Question (ultra-concise, under 10 words, direct single-clause phrasing), ${treatmentChoicesContract} or visual clue, Correct answer, Think time, Reveal beat, Explanation (strictly 1 punchy, child-friendly fun fact under 10 words and under 70 characters), Claim IDs, and Time budget. Never generate more than ${maxChoicesLimitText} answer choices. Keep the total runtime appropriate for ${episode?.quiz_config.question_count} questions.`;
  }

  if (taskType === "GENERATE_SCRIPT") {
    return `Return only one completed Markdown quiz narration script. Include exactly ${episode?.quiz_config.question_count} question blocks, formatted as second-level headings \`## Question 1 — Title\` through Question ${episode?.quiz_config.question_count}. Fold the welcome into Question 1 and the closing into the final question so the section count stays exact. For each block speak the question (ultra-concise, under 10 words, direct phrasing), ${scriptChoicesContract} or clue, an invitation to guess, the reveal, and one ultra-concise explanation (strictly 1 short, punchy fun fact under 10 words and under 70 characters). Never provide more than ${maxChoicesLimitText} answer choices. Use concise child-friendly language for ages ${episode?.quiz_config.age_band}. Add the exact hidden marker <!-- HUMOR_POLICY: v1 --> after the title. Use HTML comments only for restrained audio cues. Do not include JSON, planning notes, or visual directions.`;
  }

  if (taskType === "GENERATE_VISUAL_BIBLE") {
    const resolvedStyle = episode?.quiz_config?.resolved_visual_style ?? "pixar_3d";
    const styleContract = QUIZ_STYLE_CONTRACTS[resolvedStyle] || QUIZ_STYLE_CONTRACTS.pixar_3d;
    return `Return only a completed Markdown Quiz Visual Bible. Define a single child-friendly, vibrant, high-appeal visual direction strictly adhering to the locked art style "${styleContract.name}" (${styleContract.renderingMedium}; ${styleContract.lighting}; ${styleContract.edgeTreatment}; ${styleContract.detailLevel}). Backgrounds must be subtle and fitting (${styleContract.heroBackground}), avoiding pure flat white backgrounds while ensuring the main subject remains the sharpest and most prominent element. Include an explicit second-level section named exactly \`## Safe motion\` with labeled Allowed motion, Prohibited motion, and Reduced-motion fallback rules; the phrase "safe motion" must appear exactly in the document. Create exactly ${episode?.quiz_config.question_count} continuity bundles formatted as \`## Continuity bundle CB-01 — Title\` through CB-${String(episode?.quiz_config.question_count).padStart(2, "0")}. Every bundle must include an Anchor-frame prompt describing ONLY the clean hero subject illustration and environment with ${styleContract.continuityPromptBrief}. Never include question cards, answer choices, countdown timers, UI boxes, or text inside Anchor-frame prompts because the video composition engine renders all quiz UI dynamically on top of the clean artwork.`;
  }

  if (taskType === "GENERATE_SEQUENCE_SCENES") {
    return `Return a JSON array of quiz beats covering only the provided script question in exact order. Fields: { dialogue, sequence_id: 'sequence-${sceneNumber}', sequence_title, shot_id, visual_prompt, asset_type: 'ai_reconstruction'|'diagram'|'transition', continuity_key, continuity_bundle_id: 'CB-${String(sceneNumber ?? 0).padStart(2, "0")}', reference_asset_ids: string[], source_ids: ['C${String(sceneNumber ?? 0).padStart(2, "0")}'], reconstruction: boolean, sound_cue, transition_note, continuity_note, editorial_overlay: { kind: 'none' }, quiz: { phase: intro|question|reveal|explanation|outro, question_number: ${sceneNumber}, question, choices: string[], answer, explanation, image_prompt } }. ${sequenceBeatChoicesContract} Every beat must carry source_ids with the claim ID ['C${String(sceneNumber ?? 0).padStart(2, "0")}']. Preserve the exact question, all visible choices, canonical answer, and child-friendly explanation across every beat in this sequence (keep question ultra-concise under 10 words, and explanation strictly 1 punchy fun fact under 10 words and under 70 characters). The quiz.image_prompt is strictly MANDATORY for every question beat: provide a clear, child-friendly semantic visual subject describing the illustration for this question (e.g. 'A friendly cartoon cheetah sprinting across a sunny savanna'); never leave image_prompt empty. Copy every spoken word from the provided script section verbatim and in order into one or more dialogue fields; split only at natural boundaries and never paraphrase or omit words. Use sequence_id 'sequence-${sceneNumber}', a non-empty continuity_bundle_id exactly 'CB-${String(sceneNumber ?? 0).padStart(2, "0")}', and a non-empty continuity_note that explains the visual identity lock. The visual_prompt must contain the exact uppercase sections CAMERA, ACTION, LIGHTING, ATMOSPHERE, and CONTINUITY, with concrete content under every section. Keep text out of visual_prompt because HyperFrames renders the quiz card from the structured quiz object.`;
  }

  if (taskType === "GENERATE_SCENES") {
    return `Return a JSON array of quiz scene beats covering the script in exact order. Create one or more beats for the welcome, each of the ${episode?.quiz_config.question_count} questions, and the closing. Every beat must include dialogue, sequence_id, sequence_title, shot_id, visual_prompt with CAMERA/ACTION/LIGHTING/ATMOSPHERE/CONTINUITY sections, asset_type, continuity_key, continuity_bundle_id, reference_asset_ids, source_ids (e.g. ['C01'] matching each question's Claim ID), reconstruction, sound_cue, transition_note, continuity_note, editorial_overlay, and quiz: { phase: intro|question|reveal|explanation|outro, question_number, question, choices: string[], answer, explanation, image_prompt }. ${sceneBeatChoicesContract} Questions must be ultra-concise (under 10 words) and explanations strictly 1 punchy fun fact (under 10 words, under 70 characters, crisp single clause). The quiz.image_prompt is strictly MANDATORY for every question beat: describe a clear, child-friendly semantic visual subject matching the question (e.g. 'A friendly cartoon cheetah sprinting across a sunny savanna'); never leave image_prompt empty. Use safe, high-contrast, child-friendly quiz visuals. Never place source IDs or production labels inside visual_prompt.`;
  }

  if (taskType === "GENERATE_BUNDLE_IMAGE") {
    const resolvedStyle = episode?.quiz_config?.resolved_visual_style ?? "pixar_3d";
    const styleContract = QUIZ_STYLE_CONTRACTS[resolvedStyle] || QUIZ_STYLE_CONTRACTS.pixar_3d;
    return `Generate exactly one reference image for continuity bundle ${continuityBundleId(sceneNumber ?? 0)}. Follow the bundle's Anchor-frame prompt and the locked Quiz visual style (${styleContract.continuityPromptBrief}). Depict only the described environment, subjects, era, palette, lighting, and texture. No text, captions, logos, UI, split panels, charts, watermarks, or labels. Save the final PNG exactly to the requested image output path in the task instructions. If the connected image capability returns bytes instead of writing a file, return a data:image/png;base64 payload or report the saved PNG path.`;
  }

  return "Return one JSON object for the requested Quiz scene regeneration. Include only the fields being regenerated and preserve question, choices, answer, explanation, sequence, sources, references, continuity bundle, and editorial_overlay. The visual_prompt must describe only footage and use CAMERA/ACTION/LIGHTING/ATMOSPHERE/CONTINUITY sections. Never put captions, labels, logos, UI, charts, source IDs, or AI disclosure text inside the visual_prompt. Do not write files.";
}
