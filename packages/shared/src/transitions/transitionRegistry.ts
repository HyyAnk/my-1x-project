import type { TransitionCategory, TransitionDefinition } from "./types.js";
import { TransitionDefinitionSchema } from "./types.js";
import {
  getTransitionDefinition,
  listTransitionDefinitions,
  registerTransitionImplementation,
  resetTransitionCatalog,
} from "./catalog.js";

const LEGACY_METADATA: Record<string, { description: string; category: TransitionCategory; tag?: string; iconName?: string }> = {
  stinger_swipe: {
    description: "Dynamic full-screen wipe animation with channel momentum.",
    category: "intro_outro",
    tag: "Recommended",
    iconName: "Lightning",
  },
  crossfade: {
    description: "Gentle cinematic blend between intro and question cards.",
    category: "intro_outro",
    tag: "Cinematic",
    iconName: "Sparkle",
  },
  cut: {
    description: "Instant snap transition straight into the first question.",
    category: "intro_outro",
    tag: "Minimal",
    iconName: "Play",
  },
  bubble_splash: {
    description: "Playful bubble popping transition across scene backgrounds.",
    category: "scene",
    tag: "Playful",
    iconName: "Drop",
  },
  brush_wave: {
    description: "Fluid paintbrush sweep transitioning between question palettes.",
    category: "scene",
    tag: "Artistic",
    iconName: "PaintBrush",
  },
  lightning_brush: {
    description: "High-voltage electrified brush stroke for high-stakes climactic beats.",
    category: "scene",
    tag: "High Energy",
    iconName: "Lightning",
  },
};

function projectToDefinition(impl: ReturnType<typeof listTransitionDefinitions>[number]): TransitionDefinition {
  const meta = LEGACY_METADATA[impl.id];
  const isIntro = impl.placements.includes("intro");
  const isScene = impl.placements.includes("scene");
  const defaultCategory: TransitionCategory = isIntro && isScene ? "universal" : isIntro ? "intro_outro" : "scene";

  return {
    id: impl.id,
    name: impl.name,
    description: meta?.description ?? `${impl.name} transition`,
    category: meta?.category ?? defaultCategory,
    defaultDuration: impl.defaultDurationSeconds,
    minDuration: impl.minDurationSeconds,
    maxDuration: impl.maxDurationSeconds,
    cssClass: impl.cssClass,
    tag: meta?.tag,
    iconName: meta?.iconName,
  };
}

export const CORE_TRANSITIONS: readonly TransitionDefinition[] = [
  projectToDefinition(getTransitionDefinition("stinger_swipe")),
  projectToDefinition(getTransitionDefinition("crossfade")),
  projectToDefinition(getTransitionDefinition("cut")),
  projectToDefinition(getTransitionDefinition("bubble_splash")),
  projectToDefinition(getTransitionDefinition("brush_wave")),
  projectToDefinition(getTransitionDefinition("lightning_brush")),
] as const;

export function resetTransitionRegistry(): void {
  resetTransitionCatalog();
}

export function getTransition(id: string): TransitionDefinition | undefined {
  try {
    const impl = getTransitionDefinition(id);
    return projectToDefinition(impl);
  } catch {
    return undefined;
  }
}

export function listTransitions(category?: TransitionCategory): TransitionDefinition[] {
  const all = listTransitionDefinitions().map(projectToDefinition);
  if (!category) {
    return all;
  }
  return all.filter((def) => def.category === category || def.category === "universal");
}

export function isValidTransition(id: string, category?: TransitionCategory): boolean {
  try {
    const impl = getTransitionDefinition(id);
    if (!category) {
      return true;
    }
    const def = projectToDefinition(impl);
    return def.category === category || def.category === "universal";
  } catch {
    return false;
  }
}

export function registerTransition(def: TransitionDefinition): void {
  const validated = TransitionDefinitionSchema.parse(def);
  const placements =
    validated.category === "universal"
      ? (["intro", "scene"] as const)
      : validated.category === "intro_outro"
        ? (["intro"] as const)
        : (["scene"] as const);

  LEGACY_METADATA[validated.id] = {
    description: validated.description,
    category: validated.category,
    tag: validated.tag,
    iconName: validated.iconName,
  };

  registerTransitionImplementation({
    id: validated.id,
    implementationRevision: "1.0.0",
    name: validated.name,
    placements,
    defaultDurationSeconds: validated.defaultDuration,
    minDurationSeconds: validated.minDuration,
    maxDurationSeconds: validated.maxDuration,
    cssClass: validated.cssClass,
    handoff: validated.id === "cut" ? { kind: "cut" } : { kind: "cover", progress: 0.5 },
    renderMarkup: () => `<div class="${validated.cssClass}"></div>`,
    styles: `.${validated.cssClass} { display: block; }`,
  });
}
