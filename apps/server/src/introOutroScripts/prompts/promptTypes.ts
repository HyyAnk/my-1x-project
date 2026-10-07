import type { IntroOutroTransitionStyle } from "@studio/shared";
import type { ScriptGenerationInput } from "../generation.types.js";

export type CreativePromptInput = Pick<ScriptGenerationInput, "context" | "identity" | "companionContent" | "pairAnchor"> & {
  clips: Array<
    Pick<ScriptGenerationInput["clips"][number], "clipKind" | "durationSeconds" | "logoMode"> & {
      seeds: readonly ScriptGenerationInput["clips"][number]["seeds"][number][];
      seedSelection?: ScriptGenerationInput["clips"][number]["seedSelection"];
      randomizationSeed?: string;
      transitionStyle?: IntroOutroTransitionStyle;
    }
  >;
};
