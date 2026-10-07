import type { IntroOutroClipKind } from "@studio/shared";
import { buildIntroGenerationPrompt } from "./introPrompt.js";
import { buildOutroGenerationPrompt } from "./outroPrompt.js";
import type { CreativePromptInput } from "./promptTypes.js";

export type { CreativePromptInput } from "./promptTypes.js";
export { buildIntroGenerationPrompt, buildIntroOutputExample } from "./introPrompt.js";
export { buildOutroGenerationPrompt, buildOutroOutputExample } from "./outroPrompt.js";

export function buildCreativeGenerationPrompt(input: CreativePromptInput, kind: IntroOutroClipKind): string {
  return kind === "intro" ? buildIntroGenerationPrompt(input) : buildOutroGenerationPrompt(input);
}

export { compileOpusMotionPrompt, type MotionPromptCompilerOptions } from "./motionPromptCompiler.js";
