import {
  nowIso,
  synthesizeLegacyCoreStyle,
  type CreateMascotStyleInput,
  type MascotProfile,
  type MascotStateVariant,
  type MascotStyle,
  type UpdateMascotSlotInput,
  type UpdateMascotStyleInput,
} from "@studio/shared";
import { RepositoryError } from "../errors.js";
import type { RepositoryRuntime } from "../runtime.js";
import { withMascotWriteLock } from "./mascotLock.js";

export function ensureMascotStyles(mascot: MascotProfile): MascotProfile {
  if (!mascot.styles || mascot.styles.length === 0) {
    const coreStyle = synthesizeLegacyCoreStyle(mascot);
    return {
      ...mascot,
      styles: [coreStyle],
      active_style_id: mascot.active_style_id || "core",
    };
  }
  if (!mascot.active_style_id) {
    return {
      ...mascot,
      active_style_id: mascot.styles.find((s) => s.is_default)?.id || mascot.styles[0]?.id || "core",
    };
  }
  return mascot;
}

export async function createMascotStyle(
  this: RepositoryRuntime,
  mascotId: string,
  input: CreateMascotStyleInput,
): Promise<{ mascot: MascotProfile; style: MascotStyle }> {
  return withMascotWriteLock(mascotId, async () => {
    const mascot = await this.getMascot(mascotId);
    const now = nowIso();
    let styleId = `style_${Date.now()}`;
    const existingIds = new Set((mascot.styles || []).map((s) => s.id));
    if (existingIds.has(styleId)) {
      styleId = `style_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    }

    const style: MascotStyle = {
      id: styleId,
      name: input.name,
      keyword: input.keyword || "",
      is_default: false,
      anchor_image_url: null,
      states: {
        thinking: Array.from({ length: 10 }, (_, i) => ({
          id: `slot_${i + 1}`,
          slot_index: i + 1,
          image_url: "",
        })),
        celebrate: Array.from({ length: 10 }, (_, i) => ({
          id: `slot_${i + 1}`,
          slot_index: i + 1,
          image_url: "",
        })),
      },
      created_at: now,
      updated_at: now,
    };

    const updatedMascot: MascotProfile = {
      ...mascot,
      styles: [...(mascot.styles || []), style],
      updated_at: now,
    };

    const saved = await this.saveMascot(updatedMascot);
    return { mascot: saved, style };
  });
}

export type UpdateMascotStylePayload = UpdateMascotStyleInput & {
  anchor_image_url?: string | null;
};

export async function updateMascotStyle(
  this: RepositoryRuntime,
  mascotId: string,
  styleId: string,
  input: UpdateMascotStylePayload,
): Promise<MascotProfile> {
  return withMascotWriteLock(mascotId, async () => {
    const mascot = await this.getMascot(mascotId);
    const styles = mascot.styles || [];
    const styleIndex = styles.findIndex((s) => s.id === styleId);
    if (styleIndex === -1) {
      throw new RepositoryError(`Style ${styleId} not found`, "STYLE_NOT_FOUND");
    }

    const existingStyle = styles[styleIndex];
    const now = nowIso();
    const updatedStyle: MascotStyle = {
      ...existingStyle,
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.keyword !== undefined ? { keyword: input.keyword } : {}),
      ...(input.anchor_image_url !== undefined ? { anchor_image_url: input.anchor_image_url } : {}),
      updated_at: now,
    };

    const updatedStyles = [...styles];
    updatedStyles[styleIndex] = updatedStyle;

    const updatedMascot: MascotProfile = {
      ...mascot,
      styles: updatedStyles,
      updated_at: now,
    };

    return this.saveMascot(updatedMascot);
  });
}

export async function saveMascotStyleConcept(
  this: RepositoryRuntime,
  mascotId: string,
  styleId: string,
  anchorImageUrl: string | null,
): Promise<MascotProfile> {
  return withMascotWriteLock(mascotId, async () => {
    const mascot = await this.getMascot(mascotId);
    const styles = mascot.styles || [];
    const styleIndex = styles.findIndex((s) => s.id === styleId);
    if (styleIndex === -1) {
      throw new RepositoryError(`Style ${styleId} not found`, "STYLE_NOT_FOUND");
    }

    const existingStyle = styles[styleIndex];
    const now = nowIso();
    const updatedStyle: MascotStyle = {
      ...existingStyle,
      anchor_image_url: anchorImageUrl,
      updated_at: now,
    };

    const updatedStyles = [...styles];
    updatedStyles[styleIndex] = updatedStyle;

    const updatedMascot: MascotProfile = {
      ...mascot,
      styles: updatedStyles,
      updated_at: now,
    };

    return this.saveMascot(updatedMascot);
  });
}

export async function deleteMascotStyle(this: RepositoryRuntime, mascotId: string, styleId: string): Promise<MascotProfile> {
  return withMascotWriteLock(mascotId, async () => {
    const mascot = await this.getMascot(mascotId);
    const styles = mascot.styles || [];
    const style = styles.find((s) => s.id === styleId);
    if (!style) {
      throw new RepositoryError(`Style ${styleId} not found`, "STYLE_NOT_FOUND");
    }

    if (style.id === "core" || style.is_default === true) {
      throw new RepositoryError("Cannot delete the default Core Style", "CANNOT_DELETE_DEFAULT_STYLE");
    }

    const updatedStyles = styles.filter((s) => s.id !== styleId);
    const now = nowIso();
    const updatedMascot: MascotProfile = {
      ...mascot,
      styles: updatedStyles,
      active_style_id: mascot.active_style_id === styleId ? "core" : mascot.active_style_id,
      updated_at: now,
    };

    return this.saveMascot(updatedMascot);
  });
}

export async function updateMascotSlot(this: RepositoryRuntime, mascotId: string, input: UpdateMascotSlotInput): Promise<MascotProfile> {
  return withMascotWriteLock(mascotId, async () => {
    const mascot = await this.getMascot(mascotId);
    const styles = mascot.styles || [];
    const styleIndex = styles.findIndex((s) => s.id === input.style_id);
    if (styleIndex === -1) {
      throw new RepositoryError(`Style ${input.style_id} not found`, "STYLE_NOT_FOUND");
    }

    const existingStyle = styles[styleIndex];
    const stateSlots = [...(existingStyle.states[input.state] || [])];
    const slotIndex = stateSlots.findIndex((s) => s.slot_index === input.slot_index);

    let updatedSlot: MascotStateVariant;
    if (slotIndex >= 0) {
      const current = stateSlots[slotIndex];
      updatedSlot = {
        ...current,
        ...(input.image_url !== undefined ? { image_url: input.image_url } : {}),
        ...(input.prompt_modifier !== undefined ? { prompt_modifier: input.prompt_modifier } : {}),
        ...(input.motion_preset !== undefined ? { motion_preset: input.motion_preset } : {}),
        ...(input.motion_speed !== undefined ? { motion_speed: input.motion_speed } : {}),
        ...(input.motion_intensity !== undefined ? { motion_intensity: input.motion_intensity } : {}),
      };
      stateSlots[slotIndex] = updatedSlot;
    } else {
      updatedSlot = {
        id: `slot_${input.slot_index}`,
        slot_index: input.slot_index,
        image_url: input.image_url || "",
        ...(input.prompt_modifier !== undefined ? { prompt_modifier: input.prompt_modifier } : {}),
        ...(input.motion_preset !== undefined ? { motion_preset: input.motion_preset } : {}),
        ...(input.motion_speed !== undefined ? { motion_speed: input.motion_speed } : {}),
        ...(input.motion_intensity !== undefined ? { motion_intensity: input.motion_intensity } : {}),
      };
      stateSlots.push(updatedSlot);
      stateSlots.sort((a, b) => a.slot_index - b.slot_index);
    }

    const now = nowIso();
    const updatedStyle: MascotStyle = {
      ...existingStyle,
      states: {
        ...existingStyle.states,
        [input.state]: stateSlots,
      },
      updated_at: now,
    };

    const updatedStyles = [...styles];
    updatedStyles[styleIndex] = updatedStyle;

    const updatedMascot: MascotProfile = {
      ...mascot,
      styles: updatedStyles,
      updated_at: now,
    };

    return this.saveMascot(updatedMascot);
  });
}

export async function setActiveMascotStyle(this: RepositoryRuntime, mascotId: string, styleId: string): Promise<MascotProfile> {
  return withMascotWriteLock(mascotId, async () => {
    const mascot = await this.getMascot(mascotId);
    const styles = mascot.styles || [];
    const style = styles.find((s) => s.id === styleId);
    if (!style) {
      throw new RepositoryError(`Style ${styleId} not found`, "STYLE_NOT_FOUND");
    }

    const now = nowIso();
    const updatedMascot: MascotProfile = {
      ...mascot,
      active_style_id: styleId,
      updated_at: now,
    };

    return this.saveMascot(updatedMascot);
  });
}
