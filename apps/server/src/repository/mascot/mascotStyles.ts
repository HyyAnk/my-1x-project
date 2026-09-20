import {
  findBuiltInPresetById,
  findMascotStyleByBuiltInPreset,
  isUncustomizedBuiltInMascotStyle,
  nowIso,
  reconcileMascotBuiltInStyles,
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
  return reconcileMascotBuiltInStyles(mascot);
}

export async function createMascotStyle(
  this: RepositoryRuntime,
  mascotId: string,
  input: CreateMascotStyleInput,
): Promise<{ mascot: MascotProfile; style: MascotStyle }> {
  return withMascotWriteLock(mascotId, async () => {
    const mascot = ensureMascotStyles(await this.getMascot(mascotId));
    const now = nowIso();
    if (input.built_in_preset_id && !findBuiltInPresetById(input.built_in_preset_id)) {
      throw new RepositoryError(`Built-in preset ${input.built_in_preset_id} not found`, "BUILT_IN_PRESET_NOT_FOUND");
    }
    const targetStyle = input.built_in_preset_id
      ? findMascotStyleByBuiltInPreset(mascot, input.built_in_preset_id)
      : mascot.styles?.find(isUncustomizedBuiltInMascotStyle);
    if (!targetStyle) {
      throw new RepositoryError("All Built-in Style slots are already configured", "MASCOT_STYLE_CAPACITY_REACHED");
    }

    const style: MascotStyle = {
      ...targetStyle,
      name: input.name,
      keyword: input.keyword || "",
      style_revision: (targetStyle.style_revision ?? 1) + 1,
      updated_at: now,
    };

    const updatedMascot: MascotProfile = {
      ...mascot,
      styles: (mascot.styles || []).map((candidate) => (candidate.id === style.id ? style : candidate)),
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
      style_revision: (existingStyle.style_revision ?? 1) + 1,
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
      style_revision: (existingStyle.style_revision ?? 1) + 1,
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

    if (style.built_in_preset_id || style.id === "core" || style.is_default === true) {
      throw new RepositoryError("Cannot delete a Built-in Style", "CANNOT_DELETE_MANAGED_STYLE");
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
      const isNewImage = input.image_url !== undefined && input.image_url !== current.image_url;
      updatedSlot = {
        ...current,
        ...(input.image_url !== undefined ? { image_url: input.image_url } : {}),
        ...(input.raw_image_url !== undefined ? { raw_image_url: input.raw_image_url } : {}),
        ...(input.transparent_image_url !== undefined ? { transparent_image_url: input.transparent_image_url } : {}),
        ...(input.prompt_modifier !== undefined ? { prompt_modifier: input.prompt_modifier } : {}),
        ...(input.motion_preset !== undefined ? { motion_preset: input.motion_preset } : {}),
        ...(input.motion_speed !== undefined ? { motion_speed: input.motion_speed } : {}),
        ...(input.motion_intensity !== undefined ? { motion_intensity: input.motion_intensity } : {}),
      };
      if (isNewImage && updatedSlot.animation) {
        delete updatedSlot.animation;
      }
      stateSlots[slotIndex] = updatedSlot;
    } else {
      updatedSlot = {
        id: `slot_${input.slot_index}`,
        slot_index: input.slot_index,
        image_url: input.image_url || "",
        ...(input.raw_image_url !== undefined ? { raw_image_url: input.raw_image_url } : {}),
        ...(input.transparent_image_url !== undefined ? { transparent_image_url: input.transparent_image_url } : {}),
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
      style_revision: (existingStyle.style_revision ?? 1) + 1,
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
