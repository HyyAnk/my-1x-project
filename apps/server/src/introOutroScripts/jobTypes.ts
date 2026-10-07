import type { CreativeSeed, CreativeSeedDimension, IntroOutroClipKind, IntroOutroSeedSelection, IntroOutroTransitionStyle } from "@studio/shared";

export type GenerationClipInput = {
  clipKind: IntroOutroClipKind;
  durationSeconds: number;
  seedSelection: IntroOutroSeedSelection;
  seeds: CreativeSeed[];
  logoMode?: "post_overlay" | "supplied_reference" | "none";
  transitionStyle?: IntroOutroTransitionStyle;
};

export type ScriptGenerationJobInput = {
  channelId: string;
  projectId: string;
  stylePresetId: string;
  mascotStyleId?: string;
  projectVersion: number;
  clips: (GenerationClipInput | GenerationClipRequest)[];
  autoIdentity?: boolean;
  idempotencyKey: string;
};

export type GenerationClipRequest = {
  clipKind: IntroOutroClipKind;
  durationSeconds: number;
  randomizationSeed: string;
  selectedSeedIds?: string[];
  lockedDimensions?: CreativeSeedDimension[];
  logoMode?: GenerationClipInput["logoMode"];
  transitionStyle?: IntroOutroTransitionStyle;
};
