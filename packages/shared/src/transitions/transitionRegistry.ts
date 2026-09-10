import type { TransitionCategory, TransitionDefinition } from "./types.js";
import { TransitionDefinitionSchema } from "./types.js";

export const CORE_TRANSITIONS: readonly TransitionDefinition[] = [
  {
    id: "stinger_swipe",
    name: "Stinger Swipe",
    description: "Dynamic full-screen wipe animation with channel momentum.",
    category: "intro_outro",
    defaultDuration: 0.5,
    minDuration: 0.2,
    maxDuration: 1.5,
    cssClass: "transition-stinger",
    tag: "Recommended",
    iconName: "Lightning",
  },
  {
    id: "crossfade",
    name: "Smooth Crossfade",
    description: "Gentle cinematic blend between intro and question cards.",
    category: "intro_outro",
    defaultDuration: 0.5,
    minDuration: 0.2,
    maxDuration: 1.5,
    cssClass: "transition-crossfade",
    tag: "Cinematic",
    iconName: "Sparkle",
  },
  {
    id: "cut",
    name: "Direct Cut",
    description: "Instant snap transition straight into the first question.",
    category: "intro_outro",
    defaultDuration: 0.0,
    minDuration: 0.0,
    maxDuration: 0.0,
    cssClass: "transition-cut",
    tag: "Minimal",
    iconName: "Play",
  },
  {
    id: "bubble_splash",
    name: "Bubble Splash",
    description: "Playful bubble popping transition across scene backgrounds.",
    category: "scene",
    defaultDuration: 0.86,
    minDuration: 0.2,
    maxDuration: 1.5,
    cssClass: "transition-bubble_splash",
    tag: "Playful",
    iconName: "Drop",
  },
  {
    id: "brush_wave",
    name: "Brush Wave",
    description: "Fluid paintbrush sweep transitioning between question palettes.",
    category: "scene",
    defaultDuration: 0.8,
    minDuration: 0.2,
    maxDuration: 1.5,
    cssClass: "transition-brush_wave",
    tag: "Artistic",
    iconName: "PaintBrush",
  },
  {
    id: "lightning_brush",
    name: "Lightning Brush",
    description: "High-voltage electrified brush stroke for high-stakes climactic beats.",
    category: "scene",
    defaultDuration: 0.8,
    minDuration: 0.2,
    maxDuration: 1.5,
    cssClass: "transition-lightning_brush",
    tag: "High Energy",
    iconName: "Lightning",
  },
] as const;

const registry = new Map<string, TransitionDefinition>();

export function resetTransitionRegistry(): void {
  registry.clear();
  for (const def of CORE_TRANSITIONS) {
    registry.set(def.id, { ...def });
  }
}

// Initialize registry with core transitions
resetTransitionRegistry();

export function getTransition(id: string): TransitionDefinition | undefined {
  const item = registry.get(id);
  return item ? { ...item } : undefined;
}

export function listTransitions(category?: TransitionCategory): TransitionDefinition[] {
  const all = Array.from(registry.values()).map((def) => ({ ...def }));
  if (!category) {
    return all;
  }
  return all.filter((def) => def.category === category || def.category === "universal");
}

export function isValidTransition(id: string, category?: TransitionCategory): boolean {
  const def = registry.get(id);
  if (!def) {
    return false;
  }
  if (!category) {
    return true;
  }
  return def.category === category || def.category === "universal";
}

export function registerTransition(def: TransitionDefinition): void {
  const validated = TransitionDefinitionSchema.parse(def);
  registry.set(validated.id, { ...validated });
}
