import { IntroOutroScriptContentSchema, type IntroOutroScriptContent } from "@studio/shared";
import { z } from "zod";
import { IntroOutroScriptError } from "./errors.js";
import type { ScriptGenerationInput } from "./generation.types.js";
import { buildGeneratedRevision } from "./generatedRevision.js";
import { mergeGeneratedContent } from "./promptCompiler.js";
import { hasBlockingIssues, validateScriptContent } from "./validation.js";
import { normalizeGeneratedContent } from "./generatedNormalization.js";
import { CREATIVE_PRODUCTION_POLICY } from "./creativePolicy.js";
import { assembleCreativeTimeline } from "./creativeTimeline.js";

function logoMode(input: ScriptGenerationInput, clip: ScriptGenerationInput["clips"][number]) {
  return input.context.logoReference ? (clip.logoMode ?? "supplied_reference") : "none";
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

type GenerationClip = ScriptGenerationInput["clips"][number];
type PairAnchor = ScriptGenerationInput["pairAnchor"];
type CompanionContent = ScriptGenerationInput["companionContent"];

function assertSharedDirection(shared: Record<string, unknown>): void {
  z.object({
    style: z.object({ description: z.string(), staging: z.string(), motion_language: z.string() }).passthrough(),
    logo_placement: z.string().max(400),
  })
    .passthrough()
    .parse(shared);
}

function buildAudio(
  raw: Record<string, unknown>,
  shared: Record<string, unknown>,
  anchor: PairAnchor,
  companion: CompanionContent,
): Record<string, unknown> {
  return {
    ...record(raw.audio),
    music_direction:
      record(raw.audio).music_direction ?? shared.music_direction ?? anchor?.music_direction ?? companion?.audio.music_direction,
  };
}

function resolveTransitionStyle(rawDirections: Record<string, unknown>, clip: GenerationClip): Record<string, unknown> {
  if (clip.clipKind !== "outro" || clip.durationSeconds < 12) return {};
  return {
    transition_style:
      rawDirections.transition_style ??
      (clip.transitionStyle && clip.transitionStyle !== "auto" ? clip.transitionStyle : "flash_stunt"),
  };
}

function buildProductionDirections(params: {
  raw: Record<string, unknown>;
  shared: Record<string, unknown>;
  clip: GenerationClip;
  voiceover: IntroOutroScriptContent["voiceover"];
  selectedLogoMode: string;
  anchor: PairAnchor;
  companion: CompanionContent;
}): Record<string, unknown> {
  const { raw, shared, clip, voiceover, selectedLogoMode, anchor, companion } = params;
  const rawDirections = record(raw.production_directions);
  return {
    ...rawDirections,
    voice_source: rawDirections.voice_source ?? (voiceover.enabled ? "mascot" : "none"),
    logo_mode: selectedLogoMode,
    logo_placement:
      selectedLogoMode === "none"
        ? "No logo"
        : (anchor?.logo_placement ?? companion?.production_directions?.logo_placement ?? shared.logo_placement),
    end_hold_seconds: rawDirections.end_hold_seconds ?? (clip.clipKind === "intro" ? 0 : 1),
    ...resolveTransitionStyle(rawDirections, clip),
  };
}

export function parseGeneratedClip(
  input: ScriptGenerationInput,
  clip: ScriptGenerationInput["clips"][number],
  output: Record<string, unknown>,
) {
  const raw = record(record(output.clips)[clip.clipKind]);
  if (!Object.keys(raw).length) throw new IntroOutroScriptError(`Missing ${clip.clipKind} script; retry this clip.`, "LLM_OUTPUT_INVALID");
  const shared = record(output.shared);
  const companion = input.companionContent;
  const anchor = input.pairAnchor;
  // New shared direction is concise; a legacy companion remains exact for pair continuity.
  if (!companion && !anchor) assertSharedDirection(shared);
  const selectedLogoMode = logoMode(input, clip);
  const anchorLogoMode = companion?.production_directions?.logo_mode ?? logoMode(input, input.clips[0]);
  if (selectedLogoMode !== anchorLogoMode) {
    throw new IntroOutroScriptError("Use the same logo mode for both clips to preserve pair continuity.", "SCRIPT_VALIDATION_FAILED");
  }
  const timeline = assembleCreativeTimeline(raw.timeline, clip.durationSeconds, clip.clipKind);
  const voiceover = IntroOutroScriptContentSchema.shape.voiceover.parse(raw.voiceover);
  const parsedContent = IntroOutroScriptContentSchema.parse(
    mergeGeneratedContent({
      raw: {
        ...raw,
        production_policy: CREATIVE_PRODUCTION_POLICY,
        dialogue_policy: "mascot-direct-speech-v1",
        voiceover,
        style: anchor?.style ?? companion?.style ?? shared.style,
        timeline,
        audio: buildAudio(raw, shared, anchor, companion),
        production_directions: buildProductionDirections({ raw, shared, clip, voiceover, selectedLogoMode, anchor, companion }),
      },
      clipKind: clip.clipKind,
      durationSeconds: clip.durationSeconds,
      identity: input.identity,
    }),
  );
  const content = normalizeGeneratedContent(parsedContent, input.identity);
  const issues = validateScriptContent(content, input.identity, clip.seeds);
  if (hasBlockingIssues(issues)) {
    throw new IntroOutroScriptError(
      issues
        .filter((issue) => issue.severity === "error")
        .map((issue) => issue.message)
        .join(" "),
      "SCRIPT_VALIDATION_FAILED",
    );
  }
  return buildGeneratedRevision({ ...input, ...clip }, content, issues);
}
