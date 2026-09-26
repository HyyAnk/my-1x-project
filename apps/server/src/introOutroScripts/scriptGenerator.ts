import { executeSinglePromptText } from "../utils/promptSanitizer.js";
import { IntroOutroScriptError } from "./errors.js";
import type { ScriptGenerationInput, ScriptGenerationResult } from "./generation.types.js";
import { parseGeneratedClip } from "./generatedContent.js";
import { parseLlmJson } from "./jsonOutput.js";
import { buildPairGenerationPrompt } from "./pairGenerationPrompt.js";
import { pairGenerationAnchor } from "./pairGenerationAnchor.js";

async function generateClip(input: ScriptGenerationInput): Promise<ScriptGenerationResult> {
  const clip = input.clips[0];
  try {
    input.signal.throwIfAborted();
    const raw = await executeSinglePromptText(input.client, buildPairGenerationPrompt(input), {
      modelOverride: input.model,
      signal: input.signal,
      timeoutMs: 180_000,
      requireCompleteOutput: true,
      imageAttachments: [
        { path: input.context.mascotReference.absolutePath, mimeType: input.context.mascotReference.mimeType, role: "mascot_subject" },
        ...(input.context.logoReference
          ? [
              {
                path: input.context.logoReference.absolutePath,
                mimeType: input.context.logoReference.mimeType,
                role: "channel_logo" as const,
              },
            ]
          : []),
      ],
    });
    input.signal.throwIfAborted();
    const output = parseLlmJson(raw);
    if (output.error_code === "MASCOT_REFERENCE_UNAVAILABLE")
      throw new IntroOutroScriptError("Gemini Flash could not inspect the mascot reference", "MASCOT_REFERENCE_UNAVAILABLE");
    return { clipKind: clip.clipKind, revision: parseGeneratedClip(input, clip, output) };
  } catch (error) {
    input.signal.throwIfAborted();
    return { clipKind: clip.clipKind, error };
  }
}

export async function generateIntroOutroScripts(input: ScriptGenerationInput): Promise<ScriptGenerationResult[]> {
  input.signal.throwIfAborted();
  const modes = new Set(input.clips.map((clip) => (input.context.logoReference ? (clip.logoMode ?? "supplied_reference") : "none")));
  if (modes.size > 1) throw new IntroOutroScriptError("Use the same logo mode for both clips.", "SCRIPT_VALIDATION_FAILED");
  await input.onProgress?.("Writing scripts independently");
  const pairAnchor = pairGenerationAnchor(input);
  const settled = await Promise.allSettled(
    input.clips.map(async (clip) => {
      const result = await generateClip({ ...input, clips: [clip], pairAnchor });
      input.signal.throwIfAborted();
      await input.onResult?.(result);
      return result;
    }),
  );
  input.signal.throwIfAborted();
  return settled.map((result) => {
    if (result.status === "rejected") throw result.reason;
    return result.value;
  });
}
