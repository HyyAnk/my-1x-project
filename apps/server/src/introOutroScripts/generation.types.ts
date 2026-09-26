import type { IntroOutroScriptContent, IntroOutroScriptRevision, MascotStyleIdentityProfile } from "@studio/shared";
import type { LLMClient } from "../utils/promptSanitizer.js";
import type { ResolvedIntroOutroContext } from "./contextResolver.js";
import type { GenerationClipInput } from "./jobTypes.js";

export type ScriptGenerationInput = {
  client: LLMClient;
  context: ResolvedIntroOutroContext;
  identity: MascotStyleIdentityProfile;
  model: string;
  projectId: string;
  clips: Array<GenerationClipInput & { revisionNumber: number }>;
  signal: AbortSignal;
  companionContent?: IntroOutroScriptContent;
  pairAnchor?: PairGenerationAnchor;
  onProgress?: (step: string) => Promise<void>;
  onResult?: (result: ScriptGenerationResult) => Promise<void>;
};

export type PairGenerationAnchor = {
  style: IntroOutroScriptContent["style"];
  music_direction: string;
  logo_placement: string;
};

export type ScriptGenerationResult =
  | { clipKind: GenerationClipInput["clipKind"]; revision: IntroOutroScriptRevision; error?: never }
  | { clipKind: GenerationClipInput["clipKind"]; error: unknown; revision?: never };
