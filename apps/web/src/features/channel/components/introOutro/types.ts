import type { IntroOutroTransitionType, TransitionDefinition } from "@studio/shared";
import { listTransitions } from "@studio/shared";

export interface VideoFileInfo {
  file: File;
  dataUrl: string;
  width: number;
  height: number;
  duration: number;
  hasAudio?: boolean;
  sizeBytes: number;
  error?: string;
}

export interface TransitionOption {
  id: IntroOutroTransitionType | string;
  name: string;
  description: string;
  tag: string;
  category?: string;
  defaultDuration?: number;
  minDuration?: number;
  maxDuration?: number;
  iconName?: string;
}

/**
 * Dynamically resolves intro/outro transition options from the shared TransitionRegistry.
 */
export function getIntroOutroTransitionOptions(): TransitionOption[] {
  return listTransitions("intro_outro").map((def: TransitionDefinition) => ({
    id: def.id,
    name: def.name,
    description: def.description,
    tag: def.tag ?? "Standard",
    category: def.category,
    defaultDuration: def.defaultDuration,
    minDuration: def.minDuration,
    maxDuration: def.maxDuration,
    iconName: def.iconName,
  }));
}

export const TRANSITION_OPTIONS: TransitionOption[] = [
  {
    id: "stinger_swipe",
    name: "Stinger Swipe",
    description: "Dynamic full-screen wipe animation with channel momentum.",
    tag: "Recommended",
  },
  {
    id: "crossfade",
    name: "Smooth Crossfade",
    description: "Gentle cinematic blend between intro and question cards.",
    tag: "Cinematic",
  },
  {
    id: "cut",
    name: "Direct Cut",
    description: "Instant snap transition straight into the first question.",
    tag: "Minimal",
  },
];

export const DURATION_PRESETS = [
  { label: "0.3s Snappy", value: 0.3 },
  { label: "0.5s Balanced", value: 0.5 },
  { label: "0.8s Smooth", value: 0.8 },
  { label: "1.2s Epic", value: 1.2 },
];
