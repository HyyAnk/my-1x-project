import { IntroOutroScriptContentSchema } from "@studio/shared";
import { z } from "zod";
import { IntroOutroScriptError } from "./errors.js";
import type { ScriptGenerationInput } from "./generation.types.js";
import { buildGeneratedRevision } from "./generatedRevision.js";
import { scriptBeatStructure } from "./generationStructure.js";
import { mergeGeneratedContent } from "./promptCompiler.js";
import { hasBlockingIssues, validateScriptContent } from "./validation.js";
import { normalizeGeneratedContent } from "./generatedNormalization.js";
import { assembleChoreography } from "./generatedChoreography.js";
import { PRODUCTION_POLICY, FINAL_HOLD_SECONDS } from "./choreographyPolicy.js";
import { mascotDialogue } from "./mascotDialogue.js";

function logoMode(input: ScriptGenerationInput, clip: ScriptGenerationInput["clips"][number]) {
  return input.context.logoReference ? (clip.logoMode ?? "supplied_reference") : "none";
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
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
  if (!companion && !anchor)
    z.object({
      style: z
        .object({ description: z.string().max(180), staging: z.string().max(180), motion_language: z.string().max(180) })
        .passthrough(),
      logo_placement: z.string().max(100),
    })
      .passthrough()
      .parse(shared);
  const selectedLogoMode = logoMode(input, clip);
  const anchorLogoMode = companion?.production_directions?.logo_mode ?? logoMode(input, input.clips[0]);
  if (selectedLogoMode !== anchorLogoMode) {
    throw new IntroOutroScriptError("Use the same logo mode for both clips to preserve pair continuity.", "SCRIPT_VALIDATION_FAILED");
  }
  const structure = scriptBeatStructure(clip.clipKind, clip.durationSeconds);
  const timeline = assembleChoreography(raw.timeline, clip.durationSeconds).map((beat, index) => ({ ...beat, ...structure[index] }));
  const parsedContent = IntroOutroScriptContentSchema.parse(
    mergeGeneratedContent({
      raw: {
        ...raw,
        production_policy: PRODUCTION_POLICY,
        dialogue_policy: "mascot-direct-speech-v1",
        voiceover: mascotDialogue(clip.clipKind, clip.durationSeconds),
        style: anchor?.style ?? companion?.style ?? shared.style,
        timeline,
        audio: {
          ...record(raw.audio),
          music_direction: anchor?.music_direction ?? companion?.audio.music_direction ?? shared.music_direction,
        },
        production_directions: {
          ...record(raw.production_directions),
          voice_source: "mascot",
          logo_mode: selectedLogoMode,
          logo_placement:
            selectedLogoMode === "none"
              ? "No logo"
              : (anchor?.logo_placement ?? companion?.production_directions?.logo_placement ?? shared.logo_placement),
          end_hold_seconds: FINAL_HOLD_SECONDS,
        },
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
