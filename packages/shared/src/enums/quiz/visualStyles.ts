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

const thinkingBarBuiltInSchema = z.enum([
  "auto",
  "star_slider",
  "capsule_liquid",
  "energy_laser",
  "construction_machine",
  "flame_fuse",
  "cosmic_rocket",
  "treasure_trail",
]);
export const QuizThinkingBarStyleSchema = z.union([
  thinkingBarBuiltInSchema,
  z.string().regex(/^[a-z][a-z0-9-]*\.thinking-bar\.[a-z][a-z0-9-]*$/),
]);
export type QuizThinkingBarStyle = z.infer<typeof QuizThinkingBarStyleSchema>;
export type QuizThinkingBarStyleId = Exclude<QuizThinkingBarStyle, "auto">;

export const ALL_THINKING_BAR_STYLES: QuizThinkingBarStyle[] = [
  "star_slider",
  "capsule_liquid",
  "energy_laser",
  "construction_machine",
  "flame_fuse",
  "cosmic_rocket",
  "treasure_trail",
];

export const THINKING_BAR_STYLE_LABELS: Record<Exclude<QuizThinkingBarStyle, "auto">, string> = {
  star_slider: "Arcade Star Runner",
  capsule_liquid: "Neon Jelly Liquid",
  energy_laser: "Cyber Plasma Bar",
  construction_machine: "Dozer Crate Push",
  flame_fuse: "Ember Trail",
  cosmic_rocket: "Cosmic Rocket Warp",
  treasure_trail: "Expedition Map Trail",
};

export const THINKING_BAR_STYLE_DESCRIPTIONS: Record<Exclude<QuizThinkingBarStyle, "auto">, string> = {
  star_slider: "Classic bright star sliding over milestone stars with 5-4-3-2-1 countdown marker and sparkles.",
  capsule_liquid: "Glowing translucent capsule filled with bubbling neon fluid draining down with dynamic color shift.",
  energy_laser: "Sci-Fi high-voltage plasma laser beam with pulsing electric arcs and intense charge decay.",
  construction_machine:
    "Cheerful construction bulldozer pushing a wooden countdown crate along a hazard-striped dirt trench towards the build-site target.",
  flame_fuse: "A glowing ember burns across a braided fuse, leaving a charred trail with a clear 5–1 countdown.",
  cosmic_rocket: "Retro-futuristic 3D space rocket boosting with fiery exhaust through a cosmic nebula warp highway.",
  treasure_trail:
    "Dotted adventurer expedition route across an antique parchment track with milestone waypoint islands and a sliding galleon compass ship.",
};

const counterBuiltInSchema = z.enum([
  "auto",
  "hanging_woodsign",
  "neon_badge",
  "floating_balloon",
  "golden_shield",
  "space_radar",
  "bubble_badge",
  "golden_compass",
]);
export const QuizQuestionCounterStyleSchema = z.union([
  counterBuiltInSchema,
  z.string().regex(/^[a-z][a-z0-9-]*\.counter\.[a-z][a-z0-9-]*$/),
]);
export type QuizQuestionCounterStyle = z.infer<typeof QuizQuestionCounterStyleSchema>;
export type QuizQuestionCounterStyleId = Exclude<QuizQuestionCounterStyle, "auto">;

export const ALL_QUESTION_COUNTER_STYLES: QuizQuestionCounterStyle[] = [
  "hanging_woodsign",
  "neon_badge",
  "floating_balloon",
  "golden_shield",
  "space_radar",
  "bubble_badge",
  "golden_compass",
];

export const QUESTION_COUNTER_STYLE_LABELS: Record<Exclude<QuizQuestionCounterStyle, "auto">, string> = {
  hanging_woodsign: "Hanging Wood Sign",
  neon_badge: "Cyber Neon Badge",
  floating_balloon: "Floating Party Balloon",
  golden_shield: "Golden Trophy Shield",
  space_radar: "Space Radar Scope",
  bubble_badge: "Glossy Bubble Badge",
  golden_compass: "Ancient Golden Compass",
};

export const QUESTION_COUNTER_STYLE_DESCRIPTIONS: Record<Exclude<QuizQuestionCounterStyle, "auto">, string> = {
  hanging_woodsign: "Classic rustic wooden plank suspended by dangling ropes.",
  neon_badge: "Futuristic glowing neon badge with high-voltage border.",
  floating_balloon: "Whimsical floating helium balloon gently bobbing with question number.",
  golden_shield: "Arcade metallic gold shield with glistening highlight.",
  space_radar:
    "Circular tactical radar sweep display tracking quiz question progression with concentric grid rings and glowing sweep ping.",
  bubble_badge: "Translucent glossy soap bubble sphere with bouncing highlight glints and iridescent refraction border.",
  golden_compass:
    "Ornate brass mariner's astrolabe and nautical compass with rotating needle and cardinal degree markers tracking question progression.",
};

const questionBoxBuiltInSchema = z.enum([
  "auto",
  "candy_pop",
  "comic_bubble",
  "glass_morphism",
  "parchment_scroll",
  "hazard_stripes",
  "cockpit_hud",
  "pastel_cloud",
]);
export const QuizQuestionBoxStyleSchema = z.union([
  questionBoxBuiltInSchema,
  z.string().regex(/^[a-z][a-z0-9-]*\.question-box\.[a-z][a-z0-9-]*$/),
]);
export type QuizQuestionBoxStyle = z.infer<typeof QuizQuestionBoxStyleSchema>;
export type QuizQuestionBoxStyleId = Exclude<QuizQuestionBoxStyle, "auto">;

export const ALL_QUESTION_BOX_STYLES: QuizQuestionBoxStyle[] = [
  "candy_pop",
  "comic_bubble",
  "glass_morphism",
  "parchment_scroll",
  "hazard_stripes",
  "cockpit_hud",
  "pastel_cloud",
];

export const QUESTION_BOX_STYLE_LABELS: Record<Exclude<QuizQuestionBoxStyle, "auto">, string> = {
  candy_pop: "Candy Pop Card",
  comic_bubble: "Comic Book Bubble",
  glass_morphism: "Frosted Glassmorphism",
  parchment_scroll: "Adventure Parchment Scroll",
  hazard_stripes: "Hazard Worksite Frame",
  cockpit_hud: "Cockpit Sci-Fi HUD",
  pastel_cloud: "Pastel Fluffy Cloud",
};

export const QUESTION_BOX_STYLE_DESCRIPTIONS: Record<Exclude<QuizQuestionBoxStyle, "auto">, string> = {
  candy_pop: "Vibrant card with rounded 3D borders, stars, and candy corner accents.",
  comic_bubble: "Playful comic speech bubble with bold outline, halftone dots, and tail.",
  glass_morphism: "Ultra-modern translucent frosted glass card with glowing outline.",
  parchment_scroll: "Classic rolled parchment banner with ancient adventurous aesthetics.",
  hazard_stripes: "Heavy-duty industrial container accented with bold diagonal hazard caution stripes and steel rivets.",
  cockpit_hud:
    "Futuristic aerospace HUD terminal with targeted reticles, cyan digital telemetry brackets, and holographic display borders.",
  pastel_cloud: "Soft fluffy cumulus cloud container with gentle curved billows, pastel perimeter aura, and dreamy aesthetic.",
};

const answerCardBuiltInSchema = z.enum([
  "auto",
  "glossy_arcade",
  "comic_chunky",
  "glass_neon",
  "minimal_soft",
  "steel_beam_plate",
  "pastel_marshmallow",
  "rustic_wood_plank",
]);
export const QuizAnswerCardStyleSchema = z.union([
  answerCardBuiltInSchema,
  z.string().regex(/^[a-z][a-z0-9-]*\.answer-card\.[a-z][a-z0-9-]*$/),
]);
export type QuizAnswerCardStyle = z.infer<typeof QuizAnswerCardStyleSchema>;
export type QuizAnswerCardStyleId = Exclude<QuizAnswerCardStyle, "auto">;

export const ALL_ANSWER_CARD_STYLES: QuizAnswerCardStyle[] = [
  "glossy_arcade",
  "comic_chunky",
  "glass_neon",
  "minimal_soft",
  "steel_beam_plate",
  "pastel_marshmallow",
  "rustic_wood_plank",
];

export const ANSWER_CARD_STYLE_LABELS: Record<Exclude<QuizAnswerCardStyle, "auto">, string> = {
  glossy_arcade: "Glossy Arcade 3D",
  comic_chunky: "Comic Pop Art",
  glass_neon: "Glassmorphism Neon",
  minimal_soft: "Minimalist Soft Card",
  steel_beam_plate: "Steel Beam Plate",
  pastel_marshmallow: "Pastel Marshmallow",
  rustic_wood_plank: "Rustic Wood Plank",
};

export const ANSWER_CARD_STYLE_DESCRIPTIONS: Record<Exclude<QuizAnswerCardStyle, "auto">, string> = {
  glossy_arcade: "Vibrant candy 3D glossy pill with circular letter badge, dashed border & shine.",
  comic_chunky: "Retro comic book style with thick ink borders, shadow offsets & pop-art fonts.",
  glass_neon: "Translucent frosted acrylic panel with luminous edge glows & cyber typography.",
  minimal_soft: "Ultra-clean modern card with subtle shadows, rounded pill badge & soft elegance.",
  steel_beam_plate: "Heavy industrial steel girder card with riveted metallic corners, diamond tread texture, and bold mechanical bevels.",
  pastel_marshmallow: "Ultra-plush marshmallow rounded card with soft bouncy shadow, candy confection accents, and playful bouncy badge.",
  rustic_wood_plank:
    "Hand-hewn antique oak plank with brass corner braces, iron nail studs, warm parchment text, and glowing royal seal badges.",
};

const backgroundBuiltInSchema = z.enum([
  "auto",
  "candy_rays",
  "aurora_glow",
  "comic_burst",
  "construction_blueprint",
  "cosmic_starfield",
  "floating_clouds",
  "treasure_map",
]);
export const QuizBackgroundStyleSchema = z.union([
  backgroundBuiltInSchema,
  z.string().regex(/^[a-z][a-z0-9-]*\.background\.[a-z][a-z0-9-]*$/),
]);
export type QuizBackgroundStyle = z.infer<typeof QuizBackgroundStyleSchema>;
export type QuizBackgroundStyleId = Exclude<QuizBackgroundStyle, "auto">;

export const ALL_BACKGROUND_STYLES: QuizBackgroundStyle[] = [
  "candy_rays",
  "aurora_glow",
  "comic_burst",
  "construction_blueprint",
  "cosmic_starfield",
  "floating_clouds",
  "treasure_map",
];

export const BACKGROUND_STYLE_LABELS: Record<Exclude<QuizBackgroundStyle, "auto">, string> = {
  candy_rays: "Candy Rays",
  aurora_glow: "Aurora Glow",
  comic_burst: "Comic Action Burst",
  construction_blueprint: "Construction Blueprint",
  cosmic_starfield: "Cosmic Starfield",
  floating_clouds: "Floating Clouds",
  treasure_map: "Antique Treasure Map",
};

export const BACKGROUND_STYLE_DESCRIPTIONS: Record<Exclude<QuizBackgroundStyle, "auto">, string> = {
  candy_rays: "Vibrant rotating candy rays with sprinkles, floating shapes, and sparkle stars.",
  aurora_glow: "Soft undulating aurora glow with luminous ambient orbs and gentle stardust.",
  comic_burst: "Dynamic comic book action background with dramatic radial sunburst rays, speed dots, and pop-art energy.",
  construction_blueprint:
    "Technical architectural blueprint grid with subtle construction crosshairs, ruler measurements, and drafting lines.",
  cosmic_starfield: "Deep space cosmic starfield with twinkling starlight, glowing constellations, and celestial nebula glow.",
  floating_clouds: "Gentle drifting pastel clouds across a dreamy sky with soft daylight gradients and floating sparkles.",
  treasure_map:
    "Aged sepia parchment nautical chart with rotating compass rose, latitude rhumb lines, island archipelago contours, and floating amber dust motes.",
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
