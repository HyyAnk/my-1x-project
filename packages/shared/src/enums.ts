import { z } from "zod";

export const ChannelStatusSchema = z.enum(["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"]);

export type ChannelStatus = z.infer<typeof ChannelStatusSchema>;

export const EpisodeStageSchema = z.enum([
  "IDEA",
  "SELECTED",
  "RESEARCH",
  "RESEARCH_READY",
  "TREATMENT",
  "TREATMENT_READY",
  "SCRIPT",
  "SCRIPT_READY",
  "VISUAL_BIBLE",
  "VISUAL_BIBLE_READY",
  "SCENE_BREAKDOWN",
  "SCENE_READY",
  "NARRATION_READY",
  "READY_FOR_GENERATION",
  "VIDEO_RENDERING",
  "VIDEO_READY",
]);

export type EpisodeStage = z.infer<typeof EpisodeStageSchema>;

export const TaskStatusSchema = z.enum(["QUEUED", "RUNNING", "WAITING_APPROVAL", "COMPLETED", "FAILED", "CANCELLED"]);

export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskTypeSchema = z.enum([
  "GENERATE_DNA",
  "SUGGEST_TOPICS",
  "GENERATE_RESEARCH",
  "GENERATE_TREATMENT",
  "GENERATE_SCRIPT",
  "GENERATE_VISUAL_BIBLE",
  "GENERATE_SCENES",
  "GENERATE_SEQUENCE_SCENES",
  "GENERATE_PIPELINE",
  "REGENERATE_DIALOGUE",
  "REGENERATE_PROMPT",
  "REGENERATE_BOTH",
  "GENERATE_NARRATION",
  "GENERATE_AUDIO",
  "GENERATE_BUNDLE_IMAGE",
  "GENERATE_VIDEO",
]);

export type TaskType = z.infer<typeof TaskTypeSchema>;

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

export const MascotActionTypeSchema = z.enum(["idle", "wave", "thinking", "point", "celebrate", "oops", "outro"]);

export type MascotActionType = z.infer<typeof MascotActionTypeSchema>;

export const ALL_MASCOT_ACTIONS: MascotActionType[] = ["idle", "wave", "thinking", "point", "celebrate", "oops", "outro"];

export const MascotMotionPresetSchema = z.enum(["breathe", "sway", "jump", "shake", "wave", "point", "pulse", "float", "none"]);

export type MascotMotionPreset = z.infer<typeof MascotMotionPresetSchema>;

export const MascotMotionIntensitySchema = z.enum(["subtle", "normal", "dynamic"]);

export type MascotMotionIntensity = z.infer<typeof MascotMotionIntensitySchema>;

export const MASCOT_ACTION_META: Record<
  MascotActionType,
  {
    label: string;
    description: string;
    defaultFps: number;
    defaultFrames: number;
    icon: string;
    usage: string;
    motionPreset: MascotMotionPreset;
  }
> = {
  idle: {
    label: "Idle / Listening (Breathing Pose)",
    description: "Natural subtle breathing and blinking pose while questions are read",
    defaultFps: 6,
    defaultFrames: 1,
    icon: "🧘",
    usage: "During question reading and transitions",
    motionPreset: "breathe",
  },
  wave: {
    label: "Wave Hello (Intro Greeting)",
    description: "Playful welcoming wave gesture at opening",
    defaultFps: 8,
    defaultFrames: 1,
    icon: "👋",
    usage: "Episode intro opening",
    motionPreset: "wave",
  },
  thinking: {
    label: "Thinking (Question & Countdown)",
    description: "Chin-resting, pondering or companion pose while question is presented and timer counts down",
    defaultFps: 8,
    defaultFrames: 1,
    icon: "🤔",
    usage: "Question presentation and countdown phase",
    motionPreset: "sway",
  },
  point: {
    label: "Point Board (Explanation Highlight)",
    description: "Pointing hand or pointer stick at question / explanation card",
    defaultFps: 8,
    defaultFrames: 1,
    icon: "👉",
    usage: "Answer explanation & Fact Card",
    motionPreset: "point",
  },
  celebrate: {
    label: "Celebrate (Reveal & Fact Reading)",
    description: "Jumping with joy, raised hands or celebratory pose during reveal and fun fact",
    defaultFps: 10,
    defaultFrames: 1,
    icon: "🎉",
    usage: "Answer reveal and Fact reading phase",
    motionPreset: "jump",
  },
  oops: {
    label: "Oops / Confused (Time Out)",
    description: "Scratching head or shrugging with playful comical reaction",
    defaultFps: 8,
    defaultFrames: 1,
    icon: "😅",
    usage: "Time out / Wrong answer",
    motionPreset: "shake",
  },
  outro: {
    label: "Wave Bye & CTA (Ending)",
    description: "Waving goodbye and pointing to Like, Subscribe, Comment",
    defaultFps: 8,
    defaultFrames: 1,
    icon: "🌟",
    usage: "Episode outro ending",
    motionPreset: "wave",
  },
};

export const MascotPositionSchema = z.enum(["bottom_left", "bottom_right"]);

export type MascotPosition = z.infer<typeof MascotPositionSchema>;

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
  construction_machine: "Cheerful construction bulldozer pushing a wooden countdown crate along a hazard-striped dirt trench towards the build-site target.",
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

export const QuizQuestionFormatSchema = z.enum(["multiple_choice", "image_guess", "true_false", "odd_one_out"]);

export type QuizQuestionFormat = z.infer<typeof QuizQuestionFormatSchema>;

export const QuizAgeBandSchema = z.enum(["4-6", "7-9", "10-12", "family"]);

export type QuizAgeBand = z.infer<typeof QuizAgeBandSchema>;

export const DirectorArchetypeSchema = z.enum([
  "text_multiple_choice",
  "illustrated_multiple_choice",
  "visual_multiple_choice",
  "image_guess",
  "true_false",
  "odd_one_out",
  "visual_reveal",
  "speed_round",
  "final_challenge",
]);

export type DirectorArchetype = z.infer<typeof DirectorArchetypeSchema>;

export const DirectorEnergySchema = z.enum(["gentle", "curious", "playful", "excited", "triumphant"]);

export const DirectorVisualDensitySchema = z.enum(["calm", "focused", "lively", "burst"]);

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

export const QuizLayoutIdSchema = z.enum(["auto", "media_left_choices_right", "visual_choices_three"]);

export type QuizLayoutId = z.infer<typeof QuizLayoutIdSchema>;

export const QuizMotionIdSchema = z.enum([
  "auto",
  "enter.pop",
  "enter.slideUp",
  "enter.slideLeft",
  "enter.slideRight",
  "enter.scale",
  "idle.float",
  "idle.push",
  "idle.pulse",
  "emphasis.wiggle",
  "emphasis.punch",
  "emphasis.glow",
  "reveal.correct",
  "reveal.incorrect",
  "exit.fade",
  "exit.slide",
]);

export type QuizMotionId = z.infer<typeof QuizMotionIdSchema>;

export const QuizTransitionIdSchema = z.enum(["auto", "bubble_splash", "brush_wave", "lightning_brush"]);

export type QuizTransitionId = z.infer<typeof QuizTransitionIdSchema>;

export const DirectorBeatIntentSchema = z.enum([
  "question_enter",
  "choice_reveal",
  "thinking",
  "countdown",
  "answer_reveal",
  "explanation",
  "fun_fact",
  "celebrate",
  "transition",
]);

export const DirectorAssetIntentSchema = z.enum([
  "question_illustration",
  "choice_illustration",
  "answer_reveal",
  "background",
  "mascot_pose",
]);

export const MascotStateSchema = z.enum(["idle", "wave", "curious", "thinking", "point", "surprised", "celebrate", "encourage"]);

export type MascotState = z.infer<typeof MascotStateSchema>;

export const SfxIntentSchema = z.enum([
  "ui_pop",
  "ui_soft",
  "countdown_tick",
  "countdown_final",
  "correct_small",
  "correct_medium",
  "correct_big",
  "transition_soft",
  "transition_fast",
  "score_gain",
  "streak",
]);

export type SfxIntent = z.infer<typeof SfxIntentSchema>;

export const TransitionIntentSchema = z.enum(["cut", "slide", "wipe", "zoom"]);

export const RewardIntensitySchema = z.enum(["small", "medium", "big"]);

export const QuizAssetPurposeSchema = z.enum([
  "answer_option",
  "question_illustration",
  "hero_question_image",
  "answer_reveal",
  "background",
  "mascot",
]);

export const QuizAssetStyleSchema = z.enum(["cute_illustration", "bold_icon", "photo_reference", "abstract_shape", "mascot_pose"]);

export const ImageAspectRatioSchema = z.enum(["1:1", "16:9", "9:16", "4:3", "3:4", "2:3", "3:2"]);

export type ImageAspectRatio = z.infer<typeof ImageAspectRatioSchema>;

export const QuizAssetAspectRatioSchema = ImageAspectRatioSchema;

export type QuizAssetAspectRatio = z.infer<typeof QuizAssetAspectRatioSchema>;

export const VoiceSegmentRoleSchema = z.enum([
  "intro",
  "question",
  "choice",
  "thinking_prompt",
  "countdown",
  "reveal",
  "explanation",
  "fun_fact",
  "midpoint",
  "outro",
]);

export type VoiceSegmentRole = z.infer<typeof VoiceSegmentRoleSchema>;

export const VoicePhraseDeliverySchema = z.enum(["normal", "emphasis", "question_end", "playful", "warm"]);

export type VoicePhraseDelivery = z.infer<typeof VoicePhraseDeliverySchema>;

export const VoicePauseClassSchema = z.enum(["micro", "phrase", "anticipation", "long", "none"]);

export type VoicePauseClass = z.infer<typeof VoicePauseClassSchema>;

export const QuizIssueStageSchema = z.enum(["semantic", "director", "assets", "voice", "timeline", "layout", "render"]);

export const EngineIdSchema = z.enum(["codex", "antigravity"]);

export type EngineId = z.infer<typeof EngineIdSchema>;

export const ImageProviderIdSchema = z.enum(["gpti2", "shopaikey", "custom"]);

export type ImageProviderId = z.infer<typeof ImageProviderIdSchema>;

export const ImageModelIdSchema = z.enum(["gpt-image-2", "nano-banana-2"]);

export type ImageModelId = z.infer<typeof ImageModelIdSchema>;
