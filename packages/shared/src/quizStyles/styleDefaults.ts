import type {
  QuizAnswerCardStyle,
  QuizBackgroundStyle,
  QuizPaletteId,
  QuizQuestionBoxStyle,
  QuizQuestionCounterStyle,
  QuizThinkingBarStyle,
  QuizVisualTheme,
} from "../enums.js";
import type { ResolvedQuizStyle } from "../quizStyles.types.js";

export const DEFAULT_QUIZ_VISUAL_THEME: QuizVisualTheme = "candy_arcade";
export const DEFAULT_QUIZ_PALETTE_ID: Exclude<QuizPaletteId, "auto"> = "lime";
export const DEFAULT_QUIZ_THINKING_BAR_STYLE: Exclude<QuizThinkingBarStyle, "auto"> = "star_slider";
export const DEFAULT_QUIZ_QUESTION_BOX_STYLE: Exclude<QuizQuestionBoxStyle, "auto"> = "candy_pop";
export const DEFAULT_QUIZ_ANSWER_CARD_STYLE: Exclude<QuizAnswerCardStyle, "auto"> = "glossy_arcade";
export const DEFAULT_QUIZ_COUNTER_STYLE: Exclude<QuizQuestionCounterStyle, "auto"> = "hanging_woodsign";
export const DEFAULT_QUIZ_BACKGROUND_STYLE: Exclude<QuizBackgroundStyle, "auto"> = "candy_rays";

export const DEFAULT_QUIZ_STYLE_BY_THEME: Record<QuizVisualTheme, ResolvedQuizStyle> = {
  candy_arcade: {
    theme: "candy_arcade",
    paletteId: "lime",
    thinkingBarStyle: "star_slider",
    questionBoxStyle: "candy_pop",
    answerCardStyle: "glossy_arcade",
    counterStyle: "hanging_woodsign",
    backgroundStyle: "candy_rays",
    channelBrandName: "",
  },
  candy_pop: {
    theme: "candy_pop",
    paletteId: "lime",
    thinkingBarStyle: "star_slider",
    questionBoxStyle: "candy_pop",
    answerCardStyle: "glossy_arcade",
    counterStyle: "hanging_woodsign",
    backgroundStyle: "candy_rays",
    channelBrandName: "",
  },
  space_lab: {
    theme: "space_lab",
    paletteId: "aqua",
    thinkingBarStyle: "cosmic_rocket",
    questionBoxStyle: "glass_morphism",
    answerCardStyle: "minimal_soft",
    counterStyle: "neon_badge",
    backgroundStyle: "candy_rays",
    channelBrandName: "",
  },
  jungle_jamboree: {
    theme: "jungle_jamboree",
    paletteId: "lime",
    thinkingBarStyle: "star_slider",
    questionBoxStyle: "candy_pop",
    answerCardStyle: "glossy_arcade",
    counterStyle: "hanging_woodsign",
    backgroundStyle: "candy_rays",
    channelBrandName: "",
  },
  ocean_explorer: {
    theme: "ocean_explorer",
    paletteId: "aqua",
    thinkingBarStyle: "capsule_liquid",
    questionBoxStyle: "glass_morphism",
    answerCardStyle: "glass_neon",
    counterStyle: "neon_badge",
    backgroundStyle: "candy_rays",
    channelBrandName: "",
  },
};

export const DEFAULT_QUIZ_PALETTE_FALLBACK = {
  backgroundPrimary: "#99D93E",
  backgroundSecondary: "#31B87A",
  accent: "#FF6C78",
  surfaceAccent: "#C0394B",
  onAccent: "#0F172A",
  answerBadge: "#FF6C78",
  correct: "#27B96C",
  incorrect: "#7B8DA1",
  surface: "#FFFDF7",
  text: "#152A57",
  muted: "#E8F5DF",
} as const;
