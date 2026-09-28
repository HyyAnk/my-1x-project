import type { ScriptGenerationInput } from "./generation.types.js";
import { buildIntroGenerationPrompt } from "./introGenerationPrompt.js";
import { buildOutroGenerationPrompt } from "./outroGenerationPrompt.js";

type PromptInput = Pick<ScriptGenerationInput, "context" | "identity" | "companionContent" | "pairAnchor"> & {
  clips: Array<
    Pick<ScriptGenerationInput["clips"][number], "clipKind" | "durationSeconds" | "logoMode"> & {
      seeds: readonly ScriptGenerationInput["clips"][number]["seeds"][number][];
    }
  >;
};

export function buildPairGenerationPrompt(input: PromptInput): string {
  // When generating a single clip, route directly to the specialized generator for optimal quality.
  if (input.clips.length === 1) {
    if (input.clips[0].clipKind === "intro") return buildIntroGenerationPrompt(input);
    if (input.clips[0].clipKind === "outro") return buildOutroGenerationPrompt(input);
  }

  // If both clips are present, prioritize intro if it exists, or fall back to intro.
  const hasIntro = input.clips.some((c) => c.clipKind === "intro");
  if (hasIntro) {
    return buildIntroGenerationPrompt(input);
  }
  return buildOutroGenerationPrompt(input);
}
