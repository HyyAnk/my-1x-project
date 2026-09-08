import { MASCOT_ACTION_META } from "../constants/mascotActionMeta.js";
import {
  MASCOT_CELEBRATE_POSES,
  MASCOT_CELEBRATE_SLOT_PRESETS,
  MASCOT_THINKING_POSES,
  MASCOT_THINKING_SLOT_PRESETS,
  type MascotPosePreset,
} from "../constants/mascotPoses.js";

export function getMascotPoses(state: "thinking" | "celebrate"): MascotPosePreset[] {
  return state === "celebrate" ? MASCOT_CELEBRATE_POSES : MASCOT_THINKING_POSES;
}

export function getMascotPoseById(state: "thinking" | "celebrate", id: string): MascotPosePreset | undefined {
  return getMascotPoses(state).find((pose) => pose.id === id);
}

export function findPoseByPrompt(state: "thinking" | "celebrate", prompt?: string): MascotPosePreset | undefined {
  if (!prompt) return undefined;
  const normalized = prompt.trim().toLowerCase();
  return getMascotPoses(state).find((pose) => pose.prompt.trim().toLowerCase() === normalized);
}

export function getUnusedMascotPoses(state: "thinking" | "celebrate", usedPromptsOrIds: string[]): MascotPosePreset[] {
  const usedSet = new Set(
    usedPromptsOrIds.filter((item) => typeof item === "string" && item.trim().length > 0).map((item) => item.trim().toLowerCase()),
  );
  return getMascotPoses(state).filter((pose) => !usedSet.has(pose.id.toLowerCase()) && !usedSet.has(pose.prompt.trim().toLowerCase()));
}

export function pickRandomUnusedPose(state: "thinking" | "celebrate", usedPromptsOrIds: string[]): MascotPosePreset {
  const unused = getUnusedMascotPoses(state, usedPromptsOrIds);
  const pool = unused.length > 0 ? unused : getMascotPoses(state);
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

export function pickShuffledUnusedPoses(state: "thinking" | "celebrate", usedPromptsOrIds: string[], count: number): MascotPosePreset[] {
  if (count <= 0) return [];
  const allPoses = getMascotPoses(state);
  const unused = getUnusedMascotPoses(state, usedPromptsOrIds);

  const shuffle = <T>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const shuffledUnused = shuffle(unused);
  if (shuffledUnused.length >= count) {
    return shuffledUnused.slice(0, count);
  }

  const selected = [...shuffledUnused];
  const selectedIds = new Set(selected.map((p) => p.id));
  const remaining = shuffle(allPoses.filter((p) => !selectedIds.has(p.id)));
  selected.push(...remaining);

  if (selected.length >= count) {
    return selected.slice(0, count);
  }

  while (selected.length < count) {
    const cycle = shuffle(allPoses);
    selected.push(...cycle);
  }

  return selected.slice(0, count);
}

export function getMascotSlotDefaultPreset(state: "thinking" | "celebrate", slotIndex = 1): string {
  if (state === "celebrate") {
    return (
      MASCOT_CELEBRATE_SLOT_PRESETS[slotIndex] ||
      MASCOT_CELEBRATE_POSES[(slotIndex - 1) % MASCOT_CELEBRATE_POSES.length]?.prompt ||
      MASCOT_ACTION_META.celebrate.description
    );
  }
  return (
    MASCOT_THINKING_SLOT_PRESETS[slotIndex] ||
    MASCOT_THINKING_POSES[(slotIndex - 1) % MASCOT_THINKING_POSES.length]?.prompt ||
    MASCOT_ACTION_META.thinking.description
  );
}
