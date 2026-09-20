import {
  MASCOT_ACTION_META,
  type MascotActionType,
  type MascotConceptOrigin,
  type MascotProfile,
  getMascotSlotDefaultPreset,
} from "@studio/shared";
import {
  MASCOT_STEP2_SOURCE_ISOLATION_TAGS,
  MASCOT_STUDIO_ISOLATION_TAGS,
  MASCOT_STYLE_PROMPTS,
} from "./mascotPromptConstants.js";

export interface MascotPromptBuildOptions {
  prompt?: string;
  keyword?: string;
  hasReferenceImage?: boolean;
  hasStyleAnchor?: boolean;
  slotIndex?: number;
  composition?: "full_body" | "half_body_16_9";
}

type MascotActionPromptProfile = Pick<
  MascotProfile,
  "name" | "description" | "visual_style" | "master_prompt" | "color_theme"
> & {
  concept_origin?: MascotConceptOrigin;
  master_image_url?: string | null;
};

const HALF_BODY_COMPOSITION_DIRECTIVE =
  "Composition: Large half-body subject on a 16:9 widescreen canvas (1280x720), centered and neutral with respect to final placement. Positioned in lower-middle frame with generous upper headroom: top one-third of the frame must remain empty flat chroma key green background to allow character animation jumps and vertical motions without clipping. The lower torso continues beyond the bottom edge of the frame; head, ears, and hands remain within safe margins below the top one-third boundary line. Strictly no corner placement, no bottom-left anchoring, no floor, no pedestal, no scenery.";

const HALF_BODY_ISOLATION_DIRECTIVE =
  "Strictly one single standalone mascot character in large half-body view positioned in lower-middle frame with top one-third headroom and lower body continuing beyond bottom edge. Centered neutral composition. No bottom-left placement, no corner placement, no multiple views, no character sheet, no sprite sheet, no turnaround, no collage.";

const FULL_BODY_ISOLATION_DIRECTIVE =
  "Strictly one single standalone mascot character in full-body view from head to toe. Single viewpoint, centered in canvas. No multiple views, no character sheet, no sprite sheet, no sprite strip, no spritesheet, no turnaround, no collage.";

function removeTrailingPeriod(value: string): string {
  return value.endsWith(".") ? value.slice(0, -1) : value;
}

function isUploadedMascot(mascot: MascotActionPromptProfile): boolean {
  return mascot.concept_origin === "user_uploaded" || (Boolean(mascot.master_image_url) && !mascot.master_prompt?.trim());
}

function resolveActionText(action: MascotActionType, options: MascotPromptBuildOptions): string {
  const meta = MASCOT_ACTION_META[action] || MASCOT_ACTION_META.idle;
  const fallbackPose =
    options.slotIndex !== undefined && (action === "thinking" || action === "celebrate")
      ? getMascotSlotDefaultPreset(action, options.slotIndex)
      : meta.description;
  return removeTrailingPeriod(options.prompt?.trim() || fallbackPose);
}

function resolveCostume(keyword?: string): { cleanKeyword?: string; directive?: string } {
  const rawKeyword = keyword?.trim();
  const cleanKeyword = rawKeyword ? removeTrailingPeriod(rawKeyword) : undefined;
  return {
    cleanKeyword,
    directive: cleanKeyword ? `Theme & Costume: Styled in authentic ${cleanKeyword} attire and accessories.` : undefined,
  };
}

function buildStyleAnchorReferencePrompt(
  mascot: MascotActionPromptProfile,
  isHalfBody: boolean,
  actionDirective: string,
  isolationTags: string,
): string {
  const continuityDirective = isUploadedMascot(mascot)
    ? `Strictly preserve character identity, outfit, costume details, colors, and accessories from @1 for "${mascot.name}". Maintain strict fidelity to the reference image character identity, color palette, and recognizable anatomical features. The character must wear the exact same costume shown in @1; only modify the pose, action, and facial expression.`
    : `Strictly preserve character identity, outfit, costume details, colors, and accessories from @1 for "${mascot.name}". The character must wear the exact same costume shown in @1; only modify the pose, action, and facial expression.`;

  return [continuityDirective, ...(isHalfBody ? [HALF_BODY_COMPOSITION_DIRECTIVE] : []), actionDirective, isolationTags].join(" ");
}

function buildMasterReferencePrompt(
  mascot: MascotActionPromptProfile,
  isHalfBody: boolean,
  actionText: string,
  actionDirective: string,
  costumeDirective: string | undefined,
  isolationTags: string,
): string {
  const continuityDirective = isUploadedMascot(mascot)
    ? `Strictly preserve character identity from @1 for "${mascot.name}": face, fur/skin tone, eye shape, and chibi 1:2 head-to-body proportions matching the master reference image. Maintain strong fidelity to the reference image character identity, color palette, and recognizable anatomical features while performing the pose: ${actionText}.`
    : `Strictly preserve character identity from @1 for "${mascot.name}": face, fur/skin tone, eye shape, and chibi 1:2 head-to-body proportions matching the master reference image.`;

  return [
    continuityDirective,
    ...(costumeDirective ? [costumeDirective] : []),
    ...(isHalfBody ? [HALF_BODY_COMPOSITION_DIRECTIVE] : []),
    actionDirective,
    isolationTags,
  ].join(" ");
}

function buildCharacterDna(
  mascot: MascotActionPromptProfile,
  costumeDirective: string | undefined,
  cleanKeyword: string | undefined,
): string {
  const styleDesc = MASCOT_STYLE_PROMPTS[mascot.visual_style] || MASCOT_STYLE_PROMPTS.pixar_3d;
  const baseDesc = mascot.master_prompt?.trim() || mascot.description?.trim() || `${mascot.name} cute friendly companion`;
  const continuityDirective = costumeDirective
    ? `${costumeDirective} STRICT CHARACTER CONTINUITY: Identical face, eyes, head shape, and colors matching master reference image; only the costume and accessories reflect the ${cleanKeyword} theme.`
    : "STRICT CHARACTER CONTINUITY: Identical face, eyes, head shape, costume, accessories, and colors matching master reference image. Keep the same exact character identity.";

  return [
    `Character: "${mascot.name}"`,
    `Visual Appearance: ${baseDesc}`,
    `Color Palette: Primary theme ${mascot.color_theme || "#06b6d4"}`,
    `Style & Proportions: Chibi 1:2 head-to-body proportion, large expressive sparkling eyes, ${styleDesc}`,
    continuityDirective,
  ].join(". ");
}

function buildStandalonePrompt(
  mascot: MascotActionPromptProfile,
  isHalfBody: boolean,
  actionDirective: string,
  costumeDirective: string | undefined,
  cleanKeyword: string | undefined,
  isolationTags: string,
): string {
  const characterDna = buildCharacterDna(mascot, costumeDirective, cleanKeyword);
  if (isHalfBody) {
    return [
      `Large half-body single character pose of "${mascot.name}" on a 16:9 canvas.`,
      `${characterDna}.`,
      HALF_BODY_COMPOSITION_DIRECTIVE,
      actionDirective,
      isolationTags,
      HALF_BODY_ISOLATION_DIRECTIVE,
    ].join(" ");
  }

  return [
    `Full-body single character pose of "${mascot.name}".`,
    `${characterDna}.`,
    actionDirective,
    isolationTags,
    FULL_BODY_ISOLATION_DIRECTIVE,
  ].join(" ");
}

/** Builds the canonical action state prompt for Step 2 (Expressive Studio). */
export function buildMascotActionPrompt(
  mascot: MascotActionPromptProfile,
  action: MascotActionType,
  options: MascotPromptBuildOptions = {},
): string {
  const isHalfBody = options.composition === "half_body_16_9";
  const actionText = resolveActionText(action, options);
  const actionDirective = `Pose and Action: ${actionText}.`;
  const { cleanKeyword, directive: costumeDirective } = resolveCostume(options.keyword);
  const isolationTags = isHalfBody ? MASCOT_STEP2_SOURCE_ISOLATION_TAGS : MASCOT_STUDIO_ISOLATION_TAGS;

  if (options.hasReferenceImage) {
    return options.hasStyleAnchor
      ? buildStyleAnchorReferencePrompt(mascot, isHalfBody, actionDirective, isolationTags)
      : buildMasterReferencePrompt(mascot, isHalfBody, actionText, actionDirective, costumeDirective, isolationTags);
  }

  return buildStandalonePrompt(mascot, isHalfBody, actionDirective, costumeDirective, cleanKeyword, isolationTags);
}
