import {
  type MascotActionType,
  type MascotConceptOrigin,
  type MascotProfile,
  type MascotStyle,
  findBuiltInPresetById,
  getMascotPoses,
  getUnusedMascotPoses,
  pickRandomUnusedPose,
  pickShuffledUnusedPoses,
} from "@studio/shared";
import { buildMascotActionPrompt, type MascotPromptBuildOptions } from "./mascotActionPromptBuilder.js";
import { MASCOT_STEP2_SOURCE_ISOLATION_TAGS, MASCOT_STUDIO_ISOLATION_TAGS, MASCOT_STYLE_PROMPTS } from "./mascotPromptConstants.js";

export { getMascotPoses, getUnusedMascotPoses, pickRandomUnusedPose, pickShuffledUnusedPoses };
export { buildMascotActionPrompt, MASCOT_STEP2_SOURCE_ISOLATION_TAGS, MASCOT_STUDIO_ISOLATION_TAGS, MASCOT_STYLE_PROMPTS };
export type { MascotPromptBuildOptions };

/**
 * Builds the canonical concept art prompt for Step 1 (Master Identity)
 */
export function buildMascotConceptPrompt(
  mascot: Pick<MascotProfile, "name" | "description" | "visual_style" | "master_prompt" | "color_theme">,
  overridePrompt?: string,
): string {
  const styleDesc = MASCOT_STYLE_PROMPTS[mascot.visual_style] || MASCOT_STYLE_PROMPTS.pixar_3d;
  const userPrompt =
    overridePrompt?.trim() || mascot.master_prompt?.trim() || mascot.description?.trim() || `${mascot.name} cute friendly animal companion`;

  return [
    `Full-body single character concept illustration of ${userPrompt}.`,
    `Single centered subject standing proudly facing camera, cute chibi proportions (1:2 head-to-body), large expressive sparkling eyes, friendly and joyful expression.`,
    `Primary color theme ${mascot.color_theme || "#06b6d4"}.`,
    `${styleDesc}.`,
    `${MASCOT_STUDIO_ISOLATION_TAGS}.`,
    `Strictly one single standalone mascot character in full-body view from head to toe. Single viewpoint, centered in canvas. No multiple views, no character sheet, no sprite sheet, no sprite strip, no spritesheet, no model sheet, no turnaround, no front-and-back poses, no multiple angles, no side-by-side poses, no duplicate characters, no grid, no split screen, no collage, no text, no watermark.`,
  ].join(" ");
}

/**
 * Builds the canonical concept art prompt for a themed Mascot Style, preserving
 * the master character identity (@1 reference) while applying the style costume.
 */
export function buildMascotStyleConceptPrompt(
  mascot: Pick<MascotProfile, "name" | "description" | "visual_style" | "master_prompt" | "color_theme"> & {
    concept_origin?: MascotConceptOrigin;
    master_image_url?: string | null;
  },
  style: Pick<MascotStyle, "name" | "keyword" | "built_in_preset_id">,
  overridePrompt?: string,
): string {
  const isUserUploaded = mascot.concept_origin === "user_uploaded" || (Boolean(mascot.master_image_url) && !mascot.master_prompt?.trim());

  const baseRenderStyle = MASCOT_STYLE_PROMPTS[mascot.visual_style] || MASCOT_STYLE_PROMPTS.pixar_3d;
  const builtInPreset = findBuiltInPresetById(style.built_in_preset_id);
  const themeName = builtInPreset?.name || style.name;
  const presetCostume = builtInPreset?.mascot_style_prompt?.trim();
  const customKeywords = style.keyword?.trim();
  const costumeDetails = [presetCostume, customKeywords].filter((value): value is string => Boolean(value)).join(", ") || themeName;

  const continuityDirective = isUserUploaded
    ? `Strictly preserve the exact character identity from @1 for "${mascot.name}". Keep the same species, face, fur or skin colors, eye shape and size, anatomy, silhouette, and head-to-body proportions from the master reference. Do not redesign or reinterpret the character.`
    : `Strictly preserve character identity from @1 for "${mascot.name}": keep the same face, fur or skin colors, eye shape and size, anatomy, silhouette, and head-to-body proportions from the master reference.`;

  const renderStyleDirective = `Rendering style lock: match @1 exactly and retain the configured base medium: ${baseRenderStyle}. The "${themeName}" preset changes wardrobe, materials, accent colors, and accessories only. Do not change the art medium, rendering technique, facial design language, or character proportions.`;
  const costumeDirective = `Theme wardrobe for "${themeName}": ${costumeDetails}. Keep all additions wearable and subordinate to the original character identity.`;

  const customDirective = overridePrompt?.trim()
    ? `Additional user wardrobe or accessory direction: ${overridePrompt.trim().replace(/\.+$/, "")}. This direction must not override the identity or rendering style locks.`
    : "";

  const conceptPose = [
    `Full-body single character concept illustration of "${mascot.name}" wearing the "${themeName}" themed outfit.`,
    ...(customDirective ? [customDirective] : []),
    `Single centered subject standing proudly facing camera. Preserve the exact proportions, facial geometry, eye scale, and recognizable body features shown in @1, with a friendly and joyful expression.`,
  ].join(" ");

  const isolationConstraints = [
    MASCOT_STUDIO_ISOLATION_TAGS,
    `Strictly one single standalone mascot character in full-body view from head to toe. Single viewpoint, centered in canvas. No multiple views, no character sheet, no sprite sheet, no sprite strip, no spritesheet, no model sheet, no turnaround, no front-and-back poses, no multiple angles, no side-by-side poses, no duplicate characters, no grid, no split screen, no collage, no text, no watermark.`,
  ].join(" ");

  return [continuityDirective, renderStyleDirective, costumeDirective, conceptPose, isolationConstraints].join(" ");
}

/**
 * Builds the canonical prompt for a mascot style state slot (Thinking, Celebrate, Idle, etc.).
 * When concept_origin is "user_uploaded", enforces strong reference image fidelity.
 */
export function buildMascotSlotPrompt(
  mascot: Parameters<typeof buildMascotActionPrompt>[0],
  action: MascotActionType,
  options: MascotPromptBuildOptions = {},
): string {
  return buildMascotActionPrompt(mascot, action, options);
}

/**
 * Builds the canonical Step 2 source image prompt for Thinking and Celebrate states.
 * Strictly enforces 16:9 widescreen canvas, large half-body composition, safe margins,
 * neutral placement, and exclusion of final corner placement.
 */
export function buildMascotSourceImagePrompt(
  mascot: Pick<MascotProfile, "name" | "description" | "visual_style" | "master_prompt" | "color_theme">,
  state: "thinking" | "celebrate",
  options: Omit<MascotPromptBuildOptions, "composition"> = {},
): string {
  return buildMascotActionPrompt(mascot, state, {
    ...options,
    composition: "half_body_16_9",
  });
}

/**
 * Validates that a prompt conforms strictly to the Step 2 16:9 half-body source image contract:
 * - 16:9 canvas directive
 * - Large half-body subject (not floating, lower body continuing beyond bottom edge)
 * - Head/ears/hands within safe margins
 * - Centered neutral framing with NO corner/bottom-left placement
 * - No floor, pedestal, scenery, or text
 * - @1 reference image if hasReferenceImage is true
 */
export function validateMascotSourceImagePrompt(prompt: string, hasReferenceImage = false): boolean {
  if (!prompt || typeof prompt !== "string") return false;
  if (hasReferenceImage && !prompt.includes("@1")) return false;

  const has16x9 = prompt.includes("16:9");
  const hasHalfBody = prompt.includes("half-body") || prompt.includes("half body");
  const hasSafeMargins = prompt.includes("safe margins") || prompt.includes("safely inside frame margins") || prompt.includes("headroom");
  const hasNoCorner = prompt.includes("no corner placement") || prompt.includes("no bottom-left placement");
  const hasNeutralPlacement = prompt.includes("neutral");
  const hasNoFloorOrPedestal = prompt.includes("no floor") && prompt.includes("no pedestal");
  const hasNoGroundShadow = prompt.includes("no ground shadow");

  return has16x9 && hasHalfBody && hasSafeMargins && hasNoCorner && hasNeutralPlacement && hasNoFloorOrPedestal && hasNoGroundShadow;
}

/**
 * Validates that any prompt adheres to the mandatory studio isolation contract.
 * Supports both Step 1 full-body concept contracts and Step 2 16:9 half-body source contracts.
 */
export function validateMascotPromptContract(prompt: string, hasReferenceImage = false): boolean {
  if (!prompt || typeof prompt !== "string") return false;

  // Step 2 16:9 Half-body Source Image Contract
  if (validateMascotSourceImagePrompt(prompt, hasReferenceImage)) {
    return true;
  }

  // Step 1 Full-Body Concept / Default Action Contract
  if (hasReferenceImage) {
    return prompt.includes("@1") && prompt.includes("floating character") && prompt.includes("no ground shadow");
  }
  return prompt.includes("floating character") && prompt.includes("no ground shadow") && prompt.includes("rim lighting");
}
