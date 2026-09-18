import {
  MASCOT_ACTION_META,
  type MascotActionType,
  type MascotProfile,
  type MascotStyle,
  type QuizImageStyle,
  getMascotSlotDefaultPreset,
  getMascotPoses,
  getUnusedMascotPoses,
  pickRandomUnusedPose,
  pickShuffledUnusedPoses,
} from "@studio/shared";

export { getMascotPoses, getUnusedMascotPoses, pickRandomUnusedPose, pickShuffledUnusedPoses };

export const MASCOT_STYLE_PROMPTS: Record<QuizImageStyle, string> = {
  pixar_3d:
    "3D Pixar animation style, soft volumetric lighting, smooth stylized textures, cute rounded features, vibrant saturated colors, cinema 4D octane render, highly expressive",
  flat_vector: "2D flat vector art, clean bold outlines, solid color blocks, minimalist modern mascot, sticker style",
  kawaii_chibi: "Chibi kawaii anime style, oversized cute sparkling eyes, mini body, joyful expression, pastel accents, cute anime mascot",
  natural_realism:
    "Hyper-realistic live-action CGI creature style, intricate lifelike fur and feather textures, realistic sparkling eyes, natural soft studio lighting, cinema 4D photoreal render",
  plastic_toy: "Glossy vinyl designer toy style, smooth plastic reflections, pop mart blind box aesthetic, studio lighting",
};

/**
 * Strict studio isolation tags mandatory for all mascot generations to guarantee
 * perfect transparency and effortless AI matting with RMBG-1.4.
 */
export const MASCOT_STUDIO_ISOLATION_TAGS = [
  "Single centered subject standing proudly facing camera",
  "dynamic posture",
  "sharp clean silhouette",
  "solid flat chroma key green background (#00FF00)",
  "high contrast studio rim lighting",
  "floating character",
  "no ground shadow",
  "no floor",
  "no contact shadow",
  "no pedestal",
  "pure uniform backdrop",
  "single standalone character only",
  "no character sheet",
  "no sprite sheet",
  "no sprite strip",
  "no spritesheet",
  "no multiple angles",
  "no multiple views",
  "no turnaround",
  "no collage",
  "no split screen",
].join(", ");

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
  mascot: Pick<MascotProfile, "name" | "description" | "visual_style" | "master_prompt" | "color_theme">,
  style: Pick<MascotStyle, "name" | "keyword">,
  overridePrompt?: string,
): string {
  const continuityDirective = `Strictly preserve character identity from @1 for "${mascot.name}": face, fur/skin tone, eye shape, and chibi 1:2 head-to-body proportions matching the master reference image.`;

  const costumeTarget = style.keyword?.trim() || style.name;
  const costumeDirective = `Theme & Costume: Styled in authentic ${costumeTarget} attire, costume, and accessories.`;

  const customDirective = overridePrompt?.trim()
    ? overridePrompt.trim().endsWith(".")
      ? overridePrompt.trim()
      : `${overridePrompt.trim()}.`
    : "";

  const conceptPose = [
    `Full-body single character concept illustration of "${mascot.name}" dressed in ${style.name} style.`,
    ...(customDirective ? [customDirective] : []),
    `Single centered subject standing proudly facing camera, cute chibi proportions (1:2 head-to-body), large expressive sparkling eyes, friendly and joyful expression.`,
  ].join(" ");

  const isolationConstraints = [
    MASCOT_STUDIO_ISOLATION_TAGS,
    `Strictly one single standalone mascot character in full-body view from head to toe. Single viewpoint, centered in canvas. No multiple views, no character sheet, no sprite sheet, no sprite strip, no spritesheet, no model sheet, no turnaround, no front-and-back poses, no multiple angles, no side-by-side poses, no duplicate characters, no grid, no split screen, no collage, no text, no watermark.`,
  ].join(" ");

  return [continuityDirective, costumeDirective, conceptPose, isolationConstraints].join(" ");
}

/**
 * Strict studio isolation tags for Step 2 16:9 large half-body source image generation.
 * Enforces a 16:9 canvas (1280x720 composition), large half-body subject positioned in lower-middle framing,
 * safe margins with generous top 1/3 headroom for animation jump clearance, lower body continuing cleanly beyond bottom edge,
 * neutral flat background, and zero baked-in corner/bottom-left placement.
 */
export const MASCOT_STEP2_SOURCE_ISOLATION_TAGS = [
  "16:9 widescreen canvas",
  "1280x720 composition",
  "large half-body subject positioned in lower-middle frame",
  "generous upper headroom with top one-third of frame kept as empty flat chroma key green space (#00FF00)",
  "at least 30 percent open headspace above head and ears for animation jumping clearance",
  "centered neutral composition",
  "no bottom-left placement",
  "no corner placement",
  "head, ears, hands, and expressive features safely inside frame margins below upper one-third boundary",
  "lower body and torso continue cleanly beyond bottom edge of canvas by design",
  "not a floating portrait",
  "not a small corner mascot",
  "solid flat chroma key green background (#00FF00)",
  "high contrast studio rim lighting",
  "fixed camera angle facing forward",
  "consistent character scale and lighting direction",
  "no floor",
  "no pedestal",
  "no ground shadow",
  "no contact shadow",
  "no scenery",
  "no text",
  "no watermark",
  "no frame border",
  "single standalone character only",
  "no character sheet",
  "no sprite sheet",
  "no multiple angles",
  "no multiple views",
  "no turnaround",
  "no collage",
  "no split screen",
].join(", ");

export interface MascotPromptBuildOptions {
  prompt?: string;
  keyword?: string;
  hasReferenceImage?: boolean;
  hasStyleAnchor?: boolean;
  slotIndex?: number;
  composition?: "full_body" | "half_body_16_9";
}

/**
 * Builds the canonical action state prompt for Step 2 (Expressive Studio)
 */
export function buildMascotActionPrompt(
  mascot: Pick<MascotProfile, "name" | "description" | "visual_style" | "master_prompt" | "color_theme">,
  action: MascotActionType,
  options: MascotPromptBuildOptions = {},
): string {
  const isHalfBody = options.composition === "half_body_16_9";
  const meta = MASCOT_ACTION_META[action] || MASCOT_ACTION_META.idle;
  const styleDesc = MASCOT_STYLE_PROMPTS[mascot.visual_style] || MASCOT_STYLE_PROMPTS.pixar_3d;
  const baseDesc = mascot.master_prompt?.trim() || mascot.description?.trim() || `${mascot.name} cute friendly companion`;

  const fallbackPose =
    options.slotIndex !== undefined && (action === "thinking" || action === "celebrate")
      ? getMascotSlotDefaultPreset(action, options.slotIndex)
      : meta.description;
  const rawAction = options.prompt?.trim() || fallbackPose;
  const actionText = rawAction.endsWith(".") ? rawAction.slice(0, -1) : rawAction;
  const actionDirective = `Pose and Action: ${actionText}.`;

  const rawKeyword = options.keyword?.trim();
  const cleanKeyword = rawKeyword ? (rawKeyword.endsWith(".") ? rawKeyword.slice(0, -1) : rawKeyword) : undefined;
  const costumeDirective = cleanKeyword ? `Theme & Costume: Styled in authentic ${cleanKeyword} attire and accessories.` : undefined;

  const isolationTags = isHalfBody ? MASCOT_STEP2_SOURCE_ISOLATION_TAGS : MASCOT_STUDIO_ISOLATION_TAGS;

  if (options.hasReferenceImage) {
    if (options.hasStyleAnchor) {
      const continuityDirective = `Strictly preserve character identity, outfit, costume details, colors, and accessories from @1 for "${mascot.name}". The character must wear the exact same costume shown in @1; only modify the pose, action, and facial expression.`;

      if (isHalfBody) {
        const compositionDirective = `Composition: Large half-body subject on a 16:9 widescreen canvas (1280x720), centered and neutral with respect to final placement. Positioned in lower-middle frame with generous upper headroom: top one-third of the frame must remain empty flat chroma key green background to allow character animation jumps and vertical motions without clipping. The lower torso continues beyond the bottom edge of the frame; head, ears, and hands remain within safe margins below the top one-third boundary line. Strictly no corner placement, no bottom-left anchoring, no floor, no pedestal, no scenery.`;
        return [continuityDirective, compositionDirective, actionDirective, isolationTags].join(" ");
      }

      const parts = [continuityDirective, actionDirective, isolationTags];
      return parts.join(" ");
    }

    const continuityDirective = `Strictly preserve character identity from @1 for "${mascot.name}": face, fur/skin tone, eye shape, and chibi 1:2 head-to-body proportions matching the master reference image.`;

    if (isHalfBody) {
      const compositionDirective = `Composition: Large half-body subject on a 16:9 widescreen canvas (1280x720), centered and neutral with respect to final placement. Positioned in lower-middle frame with generous upper headroom: top one-third of the frame must remain empty flat chroma key green background to allow character animation jumps and vertical motions without clipping. The lower torso continues beyond the bottom edge of the frame; head, ears, and hands remain within safe margins below the top one-third boundary line. Strictly no corner placement, no bottom-left anchoring, no floor, no pedestal, no scenery.`;
      return [
        continuityDirective,
        ...(costumeDirective ? [costumeDirective] : []),
        compositionDirective,
        actionDirective,
        isolationTags,
      ].join(" ");
    }

    const parts = [continuityDirective, ...(costumeDirective ? [costumeDirective] : []), actionDirective, isolationTags];
    return parts.join(" ");
  }

  const characterDna = [
    `Character: "${mascot.name}"`,
    `Visual Appearance: ${baseDesc}`,
    `Color Palette: Primary theme ${mascot.color_theme || "#06b6d4"}`,
    `Style & Proportions: Chibi 1:2 head-to-body proportion, large expressive sparkling eyes, ${styleDesc}`,
    costumeDirective
      ? `${costumeDirective} STRICT CHARACTER CONTINUITY: Identical face, eyes, head shape, and colors matching master reference image; only the costume and accessories reflect the ${cleanKeyword} theme.`
      : `STRICT CHARACTER CONTINUITY: Identical face, eyes, head shape, costume, accessories, and colors matching master reference image. Keep the same exact character identity.`,
  ].join(". ");

  if (isHalfBody) {
    const compositionDirective = `Composition: Large half-body subject on a 16:9 widescreen canvas (1280x720), centered and neutral with respect to final placement. Positioned in lower-middle frame with generous upper headroom: top one-third of the frame must remain empty flat chroma key green background to allow character animation jumps and vertical motions without clipping. The lower torso continues beyond the bottom edge of the frame; head, ears, and hands remain within safe margins below the top one-third boundary line. Strictly no corner placement, no bottom-left anchoring, no floor, no pedestal, no scenery.`;
    return [
      `Large half-body single character pose of "${mascot.name}" on a 16:9 canvas.`,
      `${characterDna}.`,
      compositionDirective,
      actionDirective,
      isolationTags,
      `Strictly one single standalone mascot character in large half-body view positioned in lower-middle frame with top one-third headroom and lower body continuing beyond bottom edge. Centered neutral composition. No bottom-left placement, no corner placement, no multiple views, no character sheet, no sprite sheet, no turnaround, no collage.`,
    ].join(" ");
  }

  return [
    `Full-body single character pose of "${mascot.name}".`,
    `${characterDna}.`,
    actionDirective,
    isolationTags,
    `Strictly one single standalone mascot character in full-body view from head to toe. Single viewpoint, centered in canvas. No multiple views, no character sheet, no sprite sheet, no sprite strip, no spritesheet, no turnaround, no collage.`,
  ].join(" ");
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
