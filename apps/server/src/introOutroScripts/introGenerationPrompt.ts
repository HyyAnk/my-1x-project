import { buildCreativeGenerationPrompt, type CreativePromptInput } from "./creativeGenerationPrompt.js";

export function buildIntroGenerationPrompt(input: CreativePromptInput): string {
  return buildCreativeGenerationPrompt(input, "intro");
}
