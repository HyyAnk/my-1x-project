import type { CreativeSeed, IntroOutroClipKind, IntroOutroSeedSelection } from "@studio/shared";

export type GenerationClipInput = {
  clipKind: IntroOutroClipKind;
  durationSeconds: number;
  seedSelection: IntroOutroSeedSelection;
  seeds: CreativeSeed[];
  logoMode?: "post_overlay" | "supplied_reference" | "none";
};

export type ScriptGenerationJobInput = {
  channelId: string;
  projectId: string;
  stylePresetId: string;
  mascotStyleId?: string;
  projectVersion: number;
  clips: GenerationClipInput[];
  idempotencyKey: string;
};
