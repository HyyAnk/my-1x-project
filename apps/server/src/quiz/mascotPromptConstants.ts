import type { QuizImageStyle } from "@studio/shared";

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
 * Strict studio isolation tags for Step 2 16:9 large half-body source image generation.
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

/**
 * Reinforced prompt tags appended during green-screen ingress retry when validation fails.
 * Guarantees explicit background isolation and zero transparency instructions.
 */
export const MASCOT_GREEN_SCREEN_REINFORCEMENT_TAGS =
  "solid flat chroma key green background (#00FF00), completely opaque, pure uniform green backdrop, zero transparency, solid green background";

