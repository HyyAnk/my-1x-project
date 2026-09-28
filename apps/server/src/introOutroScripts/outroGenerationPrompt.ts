import { buildCreativeGenerationPrompt, type CreativePromptInput } from "./creativeGenerationPrompt.js";

export function buildOutroGenerationPrompt(input: CreativePromptInput): string {
  return buildCreativeGenerationPrompt(input, "outro");
}
