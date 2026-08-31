import { z } from "zod";

export const QuizImageStyleSchema = z.enum(["pixar_3d", "flat_vector", "kawaii_chibi", "natural_realism", "plastic_toy"]);
export type QuizImageStyle = z.infer<typeof QuizImageStyleSchema>;

export const ALL_QUIZ_IMAGE_STYLES: QuizImageStyle[] = ["pixar_3d", "flat_vector", "kawaii_chibi", "natural_realism", "plastic_toy"];

export const QUIZ_IMAGE_STYLE_LABELS: Record<QuizImageStyle, string> = {
  pixar_3d: "3D Pixar Animation",
  flat_vector: "2D Flat Vector",
  kawaii_chibi: "Chibi Kawaii Anime",
  natural_realism: "Cinematic Realism",
  plastic_toy: "3D Glossy Vinyl Toy",
};

export const QuizVisualThemeSchema = z.enum(["candy_arcade", "candy_pop", "space_lab", "jungle_jamboree", "ocean_explorer"]);
export type QuizVisualTheme = z.infer<typeof QuizVisualThemeSchema>;

export const QuizThinkingBarStyleSchema = z.enum([
  "auto",
  "star_slider",
  "capsule_liquid",
  "energy_laser",
  "construction_machine",
  "flame_fuse",
  "cosmic_rocket",
]);
export type QuizThinkingBarStyle = z.infer<typeof QuizThinkingBarStyleSchema>;

export const ALL_THINKING_BAR_STYLES: QuizThinkingBarStyle[] = [
  "star_slider",
  "capsule_liquid",
  "energy_laser",
  "construction_machine",
  "flame_fuse",
  "cosmic_rocket",
];

export const THINKING_BAR_STYLE_LABELS: Record<Exclude<QuizThinkingBarStyle, "auto">, string> = {
  star_slider: "Arcade Star Runner",
  capsule_liquid: "Neon Jelly Liquid",
  energy_laser: "Cyber Plasma Bar",
  construction_machine: "Dozer Crate Push",
  flame_fuse: "Dynamite Fuse Spark",
  cosmic_rocket: "Cosmic Rocket Warp",
};

export const THINKING_BAR_STYLE_DESCRIPTIONS: Record<Exclude<QuizThinkingBarStyle, "auto">, string> = {
  star_slider: "Classic bright star sliding over milestone stars with 5-4-3-2-1 countdown marker and sparkles.",
  capsule_liquid: "Glowing translucent capsule filled with bubbling neon fluid draining down with dynamic color shift.",
  energy_laser: "Sci-Fi high-voltage plasma laser beam with pulsing electric arcs and intense charge decay.",
  construction_machine:
    "Cheerful construction bulldozer pushing a wooden countdown crate along a hazard-striped dirt trench towards the build-site target.",
  flame_fuse: "Thrilling dynamite burning rope fuse with animated ember sparks racing towards the finale point.",
  cosmic_rocket: "Retro-futuristic 3D space rocket boosting with fiery exhaust through a cosmic nebula warp highway.",
};

export const QuizQuestionCounterStyleSchema = z.enum(["auto", "hanging_woodsign", "neon_badge", "floating_balloon", "golden_shield"]);
export type QuizQuestionCounterStyle = z.infer<typeof QuizQuestionCounterStyleSchema>;

export const ALL_QUESTION_COUNTER_STYLES: QuizQuestionCounterStyle[] = [
  "hanging_woodsign",
  "neon_badge",
  "floating_balloon",
  "golden_shield",
];

export const QUESTION_COUNTER_STYLE_LABELS: Record<Exclude<QuizQuestionCounterStyle, "auto">, string> = {
  hanging_woodsign: "Hanging Wood Sign",
  neon_badge: "Cyber Neon Badge",
  floating_balloon: "Floating Party Balloon",
  golden_shield: "Golden Trophy Shield",
};

export const QUESTION_COUNTER_STYLE_DESCRIPTIONS: Record<Exclude<QuizQuestionCounterStyle, "auto">, string> = {
  hanging_woodsign: "Classic rustic wooden plank suspended by dangling ropes.",
  neon_badge: "Futuristic glowing neon badge with high-voltage border.",
  floating_balloon: "Whimsical floating helium balloon gently bobbing with question number.",
  golden_shield: "Arcade metallic gold shield with glistening highlight.",
};

export const QuizQuestionBoxStyleSchema = z.enum(["auto", "candy_pop", "comic_bubble", "glass_morphism", "parchment_scroll"]);
export type QuizQuestionBoxStyle = z.infer<typeof QuizQuestionBoxStyleSchema>;

export const ALL_QUESTION_BOX_STYLES: QuizQuestionBoxStyle[] = ["candy_pop", "comic_bubble", "glass_morphism", "parchment_scroll"];

export const QUESTION_BOX_STYLE_LABELS: Record<Exclude<QuizQuestionBoxStyle, "auto">, string> = {
  candy_pop: "Candy Pop Card",
  comic_bubble: "Comic Book Bubble",
  glass_morphism: "Frosted Glassmorphism",
  parchment_scroll: "Adventure Parchment Scroll",
};

export const QUESTION_BOX_STYLE_DESCRIPTIONS: Record<Exclude<QuizQuestionBoxStyle, "auto">, string> = {
  candy_pop: "Vibrant card with rounded 3D borders, stars, and candy corner accents.",
  comic_bubble: "Playful comic speech bubble with bold outline, halftone dots, and tail.",
  glass_morphism: "Ultra-modern translucent frosted glass card with glowing outline.",
  parchment_scroll: "Classic rolled parchment banner with ancient adventurous aesthetics.",
};

export const QuizAnswerCardStyleSchema = z.enum(["auto", "glossy_arcade", "comic_chunky", "glass_neon", "minimal_soft"]);
export type QuizAnswerCardStyle = z.infer<typeof QuizAnswerCardStyleSchema>;

export const ALL_ANSWER_CARD_STYLES: QuizAnswerCardStyle[] = ["glossy_arcade", "comic_chunky", "glass_neon", "minimal_soft"];

export const ANSWER_CARD_STYLE_LABELS: Record<Exclude<QuizAnswerCardStyle, "auto">, string> = {
  glossy_arcade: "Glossy Arcade 3D",
  comic_chunky: "Comic Pop Art",
  glass_neon: "Glassmorphism Neon",
  minimal_soft: "Minimalist Soft Card",
};

export const ANSWER_CARD_STYLE_DESCRIPTIONS: Record<Exclude<QuizAnswerCardStyle, "auto">, string> = {
  glossy_arcade: "Vibrant candy 3D glossy pill with circular letter badge, dashed border & shine.",
  comic_chunky: "Retro comic book style with thick ink borders, shadow offsets & pop-art fonts.",
  glass_neon: "Translucent frosted acrylic panel with luminous edge glows & cyber typography.",
  minimal_soft: "Ultra-clean modern card with subtle shadows, rounded pill badge & soft elegance.",
};

export const QuizBackgroundStyleSchema = z.enum(["auto", "candy_rays", "aurora_glow"]);
export type QuizBackgroundStyle = z.infer<typeof QuizBackgroundStyleSchema>;

export const ALL_BACKGROUND_STYLES: QuizBackgroundStyle[] = ["candy_rays", "aurora_glow"];

export const BACKGROUND_STYLE_LABELS: Record<Exclude<QuizBackgroundStyle, "auto">, string> = {
  candy_rays: "Candy Rays",
  aurora_glow: "Aurora Glow",
};

export const BACKGROUND_STYLE_DESCRIPTIONS: Record<Exclude<QuizBackgroundStyle, "auto">, string> = {
  candy_rays: "Vibrant rotating candy rays with sprinkles, floating shapes, and sparkle stars.",
  aurora_glow: "Soft undulating aurora glow with luminous ambient orbs and gentle stardust.",
};

export const QuizPaletteIdSchema = z.enum(["auto", "lime", "aqua", "sunny", "purple", "pink", "orange", "red", "blue"]);
export type QuizPaletteId = z.infer<typeof QuizPaletteIdSchema>;

export const ALL_QUIZ_PALETTES: QuizPaletteId[] = ["lime", "aqua", "sunny", "purple", "pink", "orange", "red", "blue"];

export const QUIZ_PALETTE_LABELS: Record<Exclude<QuizPaletteId, "auto">, string> = {
  lime: "Lime Mint",
  aqua: "Aqua Blue",
  sunny: "Sunny Gold",
  purple: "Purple Galaxy",
  pink: "Candy Pink",
  orange: "Sunset Orange",
  red: "Ruby Burst",
  blue: "Ocean Deep",
};

export const QUIZ_PALETTE_COLORS: Record<Exclude<QuizPaletteId, "auto">, { primary: string; secondary: string; accent: string }> = {
  lime: { primary: "#99D93E", secondary: "#31B87A", accent: "#FF6C78" },
  aqua: { primary: "#21C8CF", secondary: "#1973CF", accent: "#FF7A63" },
  sunny: { primary: "#FFD23F", secondary: "#FF9D31", accent: "#E94F6D" },
  purple: { primary: "#9A66E6", secondary: "#594DDC", accent: "#FFAA42" },
  pink: { primary: "#FF82AF", secondary: "#E94F8A", accent: "#FFD44D" },
  orange: { primary: "#FF964F", secondary: "#EF5A62", accent: "#3BC7C9" },
  red: { primary: "#F15B68", secondary: "#C93D78", accent: "#FFD047" },
  blue: { primary: "#438CE8", secondary: "#2A55C8", accent: "#FFCE45" },
};
