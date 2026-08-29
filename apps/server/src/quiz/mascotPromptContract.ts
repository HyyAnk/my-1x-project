import { MASCOT_ACTION_META, type MascotActionType, type MascotProfile, type QuizImageStyle } from "@studio/shared";

export const MASCOT_STYLE_PROMPTS: Record<QuizImageStyle, string> = {
  pixar_3d:
    "3D Pixar animation style, soft volumetric lighting, smooth stylized textures, cute rounded features, vibrant saturated colors, cinema 4D octane render, highly expressive",
  flat_vector: "2D flat vector art, clean bold outlines, solid color blocks, minimalist modern mascot, sticker style",
  kawaii_chibi: "Chibi kawaii anime style, oversized cute sparkling eyes, mini body, joyful expression, pastel accents, cute anime mascot",
  voxel_lowpoly: "Voxel art 3D low-poly style, isometric grid cubes, playful blocky character, vibrant lighting",
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
  "solid neutral light gray background (#E8E8E8)",
  "high contrast studio rim lighting",
  "floating character",
  "no ground shadow",
  "no floor",
  "no contact shadow",
  "no pedestal",
  "pure uniform backdrop",
  "single standalone character only",
  "no character sheet",
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
    `Strictly one single standalone mascot character in full-body view from head to toe. Single viewpoint, centered in canvas. No multiple views, no character sheet, no model sheet, no turnaround, no front-and-back poses, no multiple angles, no side-by-side poses, no duplicate characters, no grid, no split screen, no collage, no text, no watermark.`,
  ].join(" ");
}

/**
 * Builds the canonical action state prompt for Step 2 (Expressive Studio)
 */
export function buildMascotActionPrompt(
  mascot: Pick<MascotProfile, "name" | "description" | "visual_style" | "master_prompt" | "color_theme">,
  action: MascotActionType,
  options: {
    prompt?: string;
    framesCount?: number;
    hasReferenceImage?: boolean;
  } = {},
): string {
  const meta = MASCOT_ACTION_META[action] || MASCOT_ACTION_META.idle;
  const framesCount = options.framesCount ?? 1;
  const styleDesc = MASCOT_STYLE_PROMPTS[mascot.visual_style] || MASCOT_STYLE_PROMPTS.pixar_3d;
  const baseDesc = mascot.master_prompt?.trim() || mascot.description?.trim() || `${mascot.name} cute friendly companion`;
  const actionSpecific = options.prompt?.trim() || meta.description;

  const characterDna = [
    `Character: "${mascot.name}"`,
    `Visual Appearance: ${baseDesc}`,
    `Color Palette: Primary theme ${mascot.color_theme || "#06b6d4"}`,
    `Style & Proportions: Chibi 1:2 head-to-body proportion, large expressive sparkling eyes, ${styleDesc}`,
    `STRICT CHARACTER CONTINUITY: Identical face, eyes, head shape, costume, accessories, and colors matching master reference image. Keep the same exact character identity.`,
  ].join(". ");

  if (framesCount === 1) {
    if (options.hasReferenceImage) {
      return [
        `Giữ nguyên nhân vật ${mascot.name} trong @1 (màu lông/da, đặc điểm khuôn mặt, kính mắt, trang phục, tỷ lệ chibi 1:2).`,
        `Tư thế và hành động hiện tại: ${actionSpecific}.`,
        `Single centered full-body character standing facing camera, dynamic posture, sharp clean silhouette, solid neutral light gray background (#E8E8E8), high contrast studio rim lighting, floating character, no ground shadow, no floor, no contact shadow, no pedestal, pure uniform backdrop, single standalone character only, no character sheet, no multiple angles, no multiple views, no turnaround, no collage, no split screen.`,
      ].join(" ");
    } else {
      return [
        `Full-body single character pose of "${mascot.name}".`,
        `${characterDna}.`,
        `Current pose and expression: ${actionSpecific}.`,
        `${MASCOT_STUDIO_ISOLATION_TAGS}.`,
        `Strictly one single standalone mascot character in full-body view from head to toe. Single viewpoint, centered in canvas. No multiple views, no character sheet, no turnaround, no collage.`,
      ].join(" ");
    }
  }

  return [
    `Horizontal 2D sprite strip keyframe breakdown of character "${mascot.name}".`,
    `${characterDna}.`,
    `Performing ${action} action: ${actionSpecific}.`,
    `Exactly ${framesCount} sequential keyframe animation poses arranged horizontally in 1 row from left to right.`,
    `Frame 1 to ${framesCount} smooth continuous loop motion animation.`,
    `Solid neutral light gray seamless background (#E8E8E8), uniform studio lighting, floating character, no ground shadow, no floor, no pedestal, consistent character proportion across all frames.`,
  ].join(" ");
}

/**
 * Validates that any prompt adheres to the mandatory studio isolation contract
 */
export function validateMascotPromptContract(prompt: string, hasReferenceImage = false): boolean {
  if (!prompt || typeof prompt !== "string") return false;
  if (hasReferenceImage) {
    return prompt.includes("@1") && prompt.includes("floating character") && prompt.includes("no ground shadow");
  }
  return prompt.includes("floating character") && prompt.includes("no ground shadow") && prompt.includes("rim lighting");
}
