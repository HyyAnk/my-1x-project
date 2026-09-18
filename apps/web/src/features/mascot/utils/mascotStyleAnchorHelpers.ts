import type { MascotProfile, MascotStyle } from "@studio/shared";

/**
 * Checks whether a mascot style is the core/default style.
 */
export function isCoreStyle(style: MascotStyle): boolean {
  return style.id === "core" || Boolean(style.is_default);
}

/**
 * Resolves the display anchor image URL for a style.
 * For core styles, falls back to the master mascot concept image.
 */
export function resolveAnchorImageUrl(style: MascotStyle, editingMascot?: MascotProfile | null): string | null | undefined {
  const isCore = isCoreStyle(style);
  return isCore ? style.anchor_image_url || editingMascot?.master_image_url : style.anchor_image_url;
}

/**
 * Resolves the raw background image URL for downloading.
 * Handles both core styles and custom styles with fallback to convention-based replacement.
 */
export function resolveRawImageUrl(style: MascotStyle, editingMascot?: MascotProfile | null): string | null | undefined {
  const isCore = isCoreStyle(style);
  if (isCore) {
    return (
      style.raw_anchor_image_url ||
      editingMascot?.master_raw_image_url ||
      (editingMascot?.master_image_url?.includes("master_concept_")
        ? editingMascot.master_image_url.replace("master_concept_", "master_concept_raw_")
        : null)
    );
  }
  return (
    style.raw_anchor_image_url ||
    (style.anchor_image_url?.includes("_anchor_") ? style.anchor_image_url.replace("_anchor_", "_anchor_raw_") : null)
  );
}

/**
 * Parses style keywords string into an array of clean keyword tokens.
 * Returns empty array for core styles.
 */
export function parseKeywordsList(keyword?: string | null, isCore: boolean = false): string[] {
  if (isCore || !keyword) return [];
  return keyword
    .split(/[,\n;]+/)
    .map((k) => k.trim())
    .filter(Boolean);
}

/**
 * Counts total non-empty poses (thinking + celebrate) generated for a style.
 */
export function countFilledPoses(states?: MascotStyle["states"]): number {
  if (!states) return 0;
  const thinking = (states.thinking || []).filter((v) => Boolean(v.image_url)).length;
  const celebrate = (states.celebrate || []).filter((v) => Boolean(v.image_url)).length;
  return thinking + celebrate;
}

/**
 * Sanitizes an identifier name for safe use in file downloads or keys.
 */
export function sanitizeIdentifier(value?: string | null, fallback = "default"): string {
  return (value || fallback).toLowerCase().replace(/[^a-z0-9]/g, "_");
}
