import {
  EditorialOverlaySchema,
  QUIZ_MAX_CHOICES_PER_QUESTION,
  QUIZ_MAX_QUESTION_COUNT,
  QUIZ_MIN_QUESTION_COUNT,
  makeId,
  nowIso,
  type Scene,
} from "@studio/shared";
import type { Beat } from "../sceneTiming.js";
import { stripEditorialOverlayInstructions } from "../visualPrompt.js";
import { canonicalizeVisibleQuizAnswer, stripQuizChoiceLabel } from "../quiz/domain/quiz.js";

export function extractMarkdown(output: string, fallbackHeading: string): string {
  let value = output.trim();
  const outerFenced = value.match(/^(?:[^\r\n]*\r?\n)?```(?:markdown|md)?\r?\n([\s\S]*?)\r?\n```\s*$/i);
  if (outerFenced) {
    value = outerFenced[1].trim();
  }
  const topLevelHeadings = [...value.matchAll(/^#\s+.+$/gm)];
  if (topLevelHeadings.length > 1) {
    const firstTitle = topLevelHeadings[0][0].replace(/^#\s+/, "").trim().toLowerCase();
    const repeated = topLevelHeadings.filter((heading) => heading[0].replace(/^#\s+/, "").trim().toLowerCase() === firstTitle);
    if (repeated.length > 1) value = value.slice(repeated[repeated.length - 1].index).trim();
  }
  value = value.replace(/^(#\s+.+\r?\n)\s*(?:I(?:’|'| a)m\s+(?:drafting|using|switching|building|preparing)[\s\S]*?)(?=^##\s+)/im, "$1\n");
  return value.startsWith("#") ? value : `${fallbackHeading}\n\n${value}`;
}

export function extractScriptMarkdown(output: string, episodeTitle: string): string {
  const value = extractMarkdown(output, "# Script");
  const headings = [...value.matchAll(/^#\s+(.+)$/gm)];
  if (headings.length <= 1) return value;
  const normalizedTitle = episodeTitle.trim().toLowerCase();
  const titleMatch = [...headings].reverse().find((heading) => heading[1].trim().toLowerCase() === normalizedTitle);
  const selected = titleMatch ?? headings.at(-1);
  if (selected?.index === undefined) return value;
  const nextHeading = headings.find((heading) => (heading.index ?? 0) > selected.index);
  return value.slice(selected.index, nextHeading?.index).trim();
}

export function parseJson(output: string, context = "Codex"): unknown {
  const fenced = output.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const value = fenced || output.trim();
  const starts = [value.indexOf("["), value.indexOf("{")].filter((index) => index >= 0);
  if (starts.length === 0) throw new Error("Codex output did not contain JSON");
  const objectStart = Math.min(...starts);
  try {
    return JSON.parse(value.slice(objectStart));
  } catch (error) {
    const detail = error instanceof Error ? error.message : "invalid JSON syntax";
    throw new Error(`${context} JSON output malformed: ${detail}`);
  }
}

export function parseTopicCandidates(output: string, channelId: string, topicHint?: string) {
  const raw = parseJson(output);
  const list = Array.isArray(raw) ? raw : (raw as { candidates?: unknown[] }).candidates;
  if (!Array.isArray(list) || list.length !== 5) throw new Error("Codex topic output must contain exactly 5 candidates");
  const formats = ["knowledge", "image_guess", "multiple_choice", "true_false", "odd_one_out"] as const;
  const ages = ["4-6", "7-9", "10-12", "family"] as const;
  return list.map((item, index) => {
    const candidate = item as Record<string, unknown>;
    const rawThemeHint = candidate.theme_hint ? String(candidate.theme_hint).trim() : undefined;
    const themeHint = rawThemeHint || (topicHint && index < 2 ? topicHint : undefined);
    const archetypes = [
      "deep_trivia",
      "visual_spotting",
      "verdict_fact_myth",
      "versus_faceoff",
      "visual_identification",
      "speed_blitz",
      "mystery_reveal",
      "clue_deduction",
    ] as const;
    const rawArchetype = candidate.archetype ? String(candidate.archetype).trim().toLowerCase() : undefined;
    const archetype = rawArchetype && archetypes.includes(rawArchetype as (typeof archetypes)[number])
      ? (rawArchetype as (typeof archetypes)[number])
      : undefined;

    const layouts = [
      "media_left_choices_right",
      "visual_choices_three",
      "visual_choices_three_pure",
      "split_versus_two",
      "verdict_true_false",
      "full_stack_list",
      "mystery_reveal",
      "clue_deduction",
    ] as const;
    const rawLayout = candidate.suggested_layout || candidate.target_layout
      ? String(candidate.suggested_layout || candidate.target_layout).trim().toLowerCase()
      : undefined;
    const suggestedLayout = rawLayout && layouts.includes(rawLayout as (typeof layouts)[number])
      ? (rawLayout as (typeof layouts)[number])
      : undefined;

    return {
      topic_id: makeId(`topic${index + 1}`),
      channel_id: channelId,
      title: String(candidate.title ?? "").trim(),
      premise: String(candidate.premise ?? "").trim(),
      why_it_fits: String(candidate.why_it_fits ?? candidate.whyItFits ?? "").trim(),
      hook: String(candidate.hook ?? "").trim(),
      estimated_potential: String(candidate.estimated_potential ?? candidate.estimatedPotential ?? "").trim(),
      generated_at: nowIso(),
      selected: false,
      quiz_format: formats.includes(String(candidate.quiz_format) as (typeof formats)[number])
        ? (String(candidate.quiz_format) as (typeof formats)[number])
        : "knowledge",
      question_count: Math.max(QUIZ_MIN_QUESTION_COUNT, Math.min(QUIZ_MAX_QUESTION_COUNT, Number(candidate.question_count) || 8)),
      age_band: ages.includes(String(candidate.age_band) as (typeof ages)[number])
        ? (String(candidate.age_band) as (typeof ages)[number])
        : "7-9",
      visual_style: "mixed" as const,
      ...(archetype ? { archetype } : {}),
      ...(suggestedLayout ? { suggested_layout: suggestedLayout } : {}),
      ...(themeHint ? { theme_hint: themeHint } : {}),
    };
  });
}

export function parseBeatsOutput(output: string): Beat[] {
  const raw = parseJson(output, "Shot-plan");
  const list = Array.isArray(raw) ? raw : (raw as { beats?: unknown[] }).beats;
  if (!Array.isArray(list) || list.length === 0) throw new Error("Codex beat output must contain beats");
  return list.map((item, index) => {
    const beat = item as Record<string, unknown>;
    const dialogue = String(beat.dialogue ?? "").trim();
    const visualPrompt = stripEditorialOverlayInstructions(String(beat.visual_prompt ?? beat.video_prompt ?? "").trim());
    if (!dialogue) throw new Error(`Codex beat ${index + 1} is missing dialogue`);
    if (!visualPrompt) throw new Error(`Codex beat ${index + 1} is missing visual_prompt`);
    return {
      dialogue,
      visual_prompt: visualPrompt,
      continuity_key: normalizeContinuityKey(String(beat.continuity_key ?? ""), index),
      transition_note: String(beat.transition_note ?? "").trim(),
      continuity_note: String(beat.continuity_note ?? "").trim(),
      sequence_id: normalizeIdentifier(String(beat.sequence_id ?? "sequence-1"), `sequence-${index + 1}`),
      sequence_title: String(beat.sequence_title ?? "Sequence 1").trim() || "Sequence 1",
      shot_id: normalizeIdentifier(String(beat.shot_id ?? ""), `shot-${index + 1}`),
      asset_type: parseAssetType(beat.asset_type),
      continuity_bundle_id: normalizeIdentifier(String(beat.continuity_bundle_id ?? beat.continuity_key ?? ""), `bundle-${index + 1}`),
      reference_asset_ids: parseStringList(beat.reference_asset_ids),
      source_ids: parseStringList(beat.source_ids),
      reconstruction:
        typeof beat.reconstruction === "boolean"
          ? beat.reconstruction
          : String(beat.asset_type ?? "").toLowerCase() === "ai_reconstruction",
      sound_cue: String(beat.sound_cue ?? "").trim(),
      editorial_overlay: parseEditorialOverlay(beat.editorial_overlay),
      quiz: parseQuizSceneContent(beat.quiz),
    };
  });
}

function normalizeContinuityKey(value: string, index: number): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || `beat-${index + 1}`;
}

function normalizeIdentifier(value: string, fallback: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || fallback
  );
}

function parseStringList(value: unknown): string[] {
  if (Array.isArray(value))
    return value
      .map(String)
      .map((item) => item.trim())
      .filter(Boolean);
  if (typeof value === "string")
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  return [];
}

function parseAssetType(value: unknown): Beat["asset_type"] {
  const candidate = String(value ?? "ai_reconstruction")
    .trim()
    .toLowerCase();
  return ["archive", "document", "map", "diagram", "ai_reconstruction", "contemporary", "transition"].includes(candidate)
    ? (candidate as Beat["asset_type"])
    : "ai_reconstruction";
}

export function parseRegeneration(output: string): Partial<Scene> {
  const raw = parseJson(output) as Record<string, unknown>;
  return {
    dialogue: typeof raw.dialogue === "string" ? raw.dialogue : undefined,
    visual_prompt:
      typeof raw.visual_prompt === "string"
        ? stripEditorialOverlayInstructions(raw.visual_prompt)
        : typeof raw.video_prompt === "string"
          ? stripEditorialOverlayInstructions(raw.video_prompt)
          : undefined,
    transition_note: typeof raw.transition_note === "string" ? raw.transition_note : undefined,
    continuity_note: typeof raw.continuity_note === "string" ? raw.continuity_note : undefined,
    asset_type: raw.asset_type === undefined ? undefined : parseAssetType(raw.asset_type),
    continuity_bundle_id:
      typeof raw.continuity_bundle_id === "string" ? normalizeIdentifier(raw.continuity_bundle_id, "bundle") : undefined,
    reference_asset_ids: raw.reference_asset_ids === undefined ? undefined : parseStringList(raw.reference_asset_ids),
    source_ids: raw.source_ids === undefined ? undefined : parseStringList(raw.source_ids),
    reconstruction: typeof raw.reconstruction === "boolean" ? raw.reconstruction : undefined,
    sound_cue: typeof raw.sound_cue === "string" ? raw.sound_cue : undefined,
    editorial_overlay: raw.editorial_overlay === undefined ? undefined : parseEditorialOverlay(raw.editorial_overlay),
    quiz: raw.quiz === undefined ? undefined : parseQuizSceneContent(raw.quiz),
  };
}

function parseEditorialOverlay(value: unknown): Beat["editorial_overlay"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return EditorialOverlaySchema.parse({});
  const raw = value as Record<string, unknown>;
  const kinds = ["none", "caption", "stat_card", "timeline", "bar_chart", "line_chart", "map_callout", "comparison", "quote"] as const;
  const motions = ["none", "fade_up", "slide_in", "draw_on", "count_up", "highlight"] as const;
  const placements = ["lower_third", "upper_left", "upper_right", "center", "side_panel"] as const;
  const kind = kinds.includes(String(raw.kind ?? "none") as (typeof kinds)[number]) ? String(raw.kind ?? "none") : "none";
  const motion = motions.includes(String(raw.motion ?? "none") as (typeof motions)[number]) ? String(raw.motion ?? "none") : "none";
  const placement = placements.includes(String(raw.placement ?? "lower_third") as (typeof placements)[number])
    ? String(raw.placement ?? "lower_third")
    : "lower_third";
  const data = Array.isArray(raw.data)
    ? raw.data
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
        .map((item) => ({
          label: String(item.label ?? "").trim(),
          value: typeof item.value === "number" ? item.value : String(item.value ?? "").trim(),
          unit: String(item.unit ?? "").trim(),
        }))
        .filter((item) => item.label && item.value !== "")
    : [];
  const duration =
    typeof raw.duration_seconds === "number" && Number.isFinite(raw.duration_seconds)
      ? Math.max(0.1, Math.min(20, raw.duration_seconds))
      : null;
  return EditorialOverlaySchema.parse({
    kind,
    text: String(raw.text ?? "").trim(),
    motion,
    placement,
    duration_seconds: duration,
    data,
    source_ids: parseStringList(raw.source_ids),
  });
}

function parseQuizSceneContent(value: unknown): Scene["quiz"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const phases = ["intro", "question", "reveal", "explanation", "outro"] as const;
  const phaseValue = String(raw.phase ?? "question") as (typeof phases)[number];
  const choices = Array.isArray(raw.choices)
    ? raw.choices
        .map(String)
        .map((item) => stripQuizChoiceLabel(item.trim()))
        .filter(Boolean)
    : [];
  if (choices.length > QUIZ_MAX_CHOICES_PER_QUESTION) {
    const questionNumber = Number.isInteger(Number(raw.question_number)) ? Number(raw.question_number) : "unknown";
    throw new Error(
      `QUIZ_CHOICE_COUNT_INVALID: Question ${questionNumber} returned ${choices.length} choices; the maximum is ${QUIZ_MAX_CHOICES_PER_QUESTION}`,
    );
  }
  const rawAnswer = String(raw.answer ?? "").trim();
  const canonicalAnswer = canonicalizeVisibleQuizAnswer(choices, rawAnswer);
  return {
    phase: phases.includes(phaseValue) ? phaseValue : "question",
    question_number: Number.isInteger(Number(raw.question_number)) && Number(raw.question_number) > 0 ? Number(raw.question_number) : null,
    question: String(raw.question ?? "").trim(),
    choices,
    answer: canonicalAnswer ?? rawAnswer,
    explanation: String(raw.explanation ?? "").trim(),
    image_prompt: String(raw.image_prompt ?? "").trim(),
  };
}

export function parseWavDuration(buffer: Uint8Array): number {
  if (buffer.length < 44) throw new Error("Audio service returned an incomplete WAV file");
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  if (new TextDecoder().decode(buffer.slice(0, 4)) !== "RIFF" || new TextDecoder().decode(buffer.slice(8, 12)) !== "WAVE") {
    throw new Error("Audio service returned an invalid WAV file");
  }
  let offset = 12;
  let byteRate = 0;
  let dataSize = 0;
  while (offset + 8 <= buffer.length) {
    const chunkId = new TextDecoder().decode(buffer.slice(offset, offset + 4));
    const chunkSize = view.getUint32(offset + 4, true);
    if (chunkId === "fmt " && chunkSize >= 16 && offset + 24 <= buffer.length) byteRate = view.getUint32(offset + 16, true);
    if (chunkId === "data") {
      dataSize = chunkSize;
      break;
    }
    offset += 8 + chunkSize + (chunkSize % 2);
  }
  if (!byteRate || !dataSize) throw new Error("Audio service returned a WAV without duration metadata");
  return Number((dataSize / byteRate).toFixed(3));
}
