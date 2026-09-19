import { type MascotProfile, getMascotSlotDefaultPreset, pickRandomUnusedPose } from "@studio/shared";
import type { RepositoryService } from "../../../repository.js";
import type { StudioLogger } from "../../../logger.js";
import { loadMasterReferenceImageBase64, loadMascotAssetBase64ByUrl } from "../services/mascotAssetLoader.js";

export function deletePreviousMascotAsset(
  repository: RepositoryService,
  mascotId: string,
  prevUrl?: string | null,
  newFilename?: string,
): void {
  if (!prevUrl) return;
  const prevFilename = prevUrl.split("/").pop();
  if (prevFilename && prevFilename !== newFilename && typeof repository.deleteMascotAssetFile === "function") {
    void repository.deleteMascotAssetFile(mascotId, prevFilename);
  }
}

export function resolveSlotPromptModifier(
  style: NonNullable<MascotProfile["styles"]>[number],
  state: "thinking" | "celebrate" | "idle" | "wave" | "point" | "oops" | "outro",
  slotIndex: number,
  explicitPrompt?: string,
): string | undefined {
  if (explicitPrompt?.trim()) return explicitPrompt.trim();
  if (state !== "thinking" && state !== "celebrate") return undefined;
  const otherSlots = (style.states[state] || []).filter((s) => s.slot_index !== slotIndex);
  const otherUsed = otherSlots
    .map((s) => s.prompt_modifier?.trim() || (s.image_url?.trim() ? getMascotSlotDefaultPreset(state, s.slot_index) : ""))
    .filter(Boolean);
  return pickRandomUnusedPose(state, otherUsed).prompt;
}

export async function resolveSlotReferenceImage(
  repository: RepositoryService,
  mascot: MascotProfile,
  styleOrAnchorUrl?: string | { id?: string; anchor_image_url?: string | null; is_default?: boolean } | null,
  logger?: StudioLogger,
): Promise<{ referenceImageBase64?: string; hasStyleAnchor: boolean }> {
  let styleAnchorUrl: string | null | undefined;
  let isCore = false;

  if (typeof styleOrAnchorUrl === "string") {
    styleAnchorUrl = styleOrAnchorUrl;
    if (
      (mascot.master_image_url && styleAnchorUrl === mascot.master_image_url) ||
      (mascot.master_raw_image_url && styleAnchorUrl === mascot.master_raw_image_url)
    ) {
      isCore = true;
    }
  } else if (styleOrAnchorUrl && typeof styleOrAnchorUrl === "object") {
    isCore = styleOrAnchorUrl.id === "core" || Boolean(styleOrAnchorUrl.is_default);
    styleAnchorUrl = styleOrAnchorUrl.anchor_image_url;
  }

  // Core style is always anchored to the master concept reference
  if (isCore) {
    const masterBase64 = await loadMasterReferenceImageBase64(repository, mascot, logger);
    return { referenceImageBase64: masterBase64, hasStyleAnchor: false };
  }

  // For custom styles, use the generated style anchor if available
  if (styleAnchorUrl) {
    const anchorBase64 = await loadMascotAssetBase64ByUrl(repository, mascot.id, styleAnchorUrl, logger);
    if (anchorBase64) {
      return { referenceImageBase64: anchorBase64, hasStyleAnchor: true };
    }
  }

  // Gracefully fall back to the master concept reference if style anchor is absent or unloaded
  const masterBase64 = await loadMasterReferenceImageBase64(repository, mascot, logger);
  return { referenceImageBase64: masterBase64, hasStyleAnchor: false };
}
