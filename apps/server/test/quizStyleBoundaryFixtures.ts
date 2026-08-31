import {
  ChannelSchema,
  QuizConfigSchema,
  QuizV2Schema,
  type QuizConfig,
  type QuizStyleProvenanceSource,
  type QuizStyleResolutionContext,
  type ResolvedQuizStyleWithProvenance,
} from "@studio/shared";

export const styleBoundaryQuiz = QuizV2Schema.parse({
  schema_version: 2,
  episode_id: "style-contract",
  age_band: "7-9",
  language: "English",
  questions: [
    styleBoundaryQuestion("q1", 1, "Which animal has stripes?", ["Tiger", "Dolphin", "Elephant"]),
    styleBoundaryQuestion("q2", 2, "Which planet has rings?", ["Saturn", "Mars", "Venus"]),
  ],
});

export function styleBoundaryChannel() {
  return ChannelSchema.parse({
    channel_id: "channel-style-contract",
    slug: "channel-style-contract",
    display_name: "Style Channel",
    channel_dna_path: "channels/style/channel_dna.md",
    status: "ACTIVE",
    created_at: "2026-08-31T00:00:00.000Z",
    updated_at: "2026-08-31T00:00:00.000Z",
    default_palette_id: "purple",
    default_thinking_bar_style: "energy_laser",
    default_question_box_style: "comic_bubble",
    default_answer_card_style: "glass_neon",
    default_counter_style: "golden_shield",
    default_background_style: "aurora_glow",
  });
}

export function styleBoundaryEpisode(overrides: Partial<QuizConfig> = {}) {
  return QuizConfigSchema.parse({
    question_count: 3,
    quiz_format: "multiple_choice",
    visual_theme: "candy_arcade",
    palette_id: "auto",
    answer_card_style: "auto",
    background_style: "auto",
    ...overrides,
  });
}

type StyleField = Exclude<keyof ResolvedQuizStyleWithProvenance, "theme" | "channelBrandName" | "provenance">;

export type StyleAxisCase = {
  name: string;
  field: StyleField;
  layers: Array<{
    context: QuizStyleResolutionContext;
    value: string;
    provenance: QuizStyleProvenanceSource;
  }>;
};

const layeredContext = {
  theme: "space_lab",
  channel: {
    default_palette_id: "purple",
    default_thinking_bar_style: "energy_laser",
    default_question_box_style: "comic_bubble",
    default_answer_card_style: "glass_neon",
    default_counter_style: "golden_shield",
    default_background_style: "aurora_glow",
  },
  episode: {
    palette_id: "orange",
    thinking_bar_style: "construction_machine",
    question_box_style: "parchment_scroll",
    answer_card_style: "comic_chunky",
    question_counter_style: "floating_balloon",
    background_style: "candy_rays",
  },
} satisfies QuizStyleResolutionContext;

export const styleAxisCases: StyleAxisCase[] = [
  axisCase("palette", "paletteId", "aqua", "purple", "orange", "blue", "palette_id"),
  axisCase("thinking bar", "thinkingBarStyle", "cosmic_rocket", "energy_laser", "construction_machine", "flame_fuse", "thinking_bar_style"),
  axisCase("question box", "questionBoxStyle", "glass_morphism", "comic_bubble", "parchment_scroll", "candy_pop", "question_box_style"),
  axisCase("answer card", "answerCardStyle", "minimal_soft", "glass_neon", "comic_chunky", "glossy_arcade", "answer_card_style"),
  axisCase("counter", "counterStyle", "neon_badge", "golden_shield", "floating_balloon", "hanging_woodsign", "question_counter_style"),
  axisCase("background", "backgroundStyle", "candy_rays", "aurora_glow", "candy_rays", "aurora_glow", "background_style"),
];

function axisCase(
  name: string,
  field: StyleField,
  themeValue: string,
  channelValue: string,
  episodeValue: string,
  beatValue: string,
  beatField: keyof NonNullable<QuizStyleResolutionContext["beat"]>,
): StyleAxisCase {
  return {
    name,
    field,
    layers: [
      { context: { theme: "space_lab" }, value: themeValue, provenance: "theme" },
      { context: { theme: "space_lab", channel: layeredContext.channel }, value: channelValue, provenance: "channel" },
      { context: layeredContext, value: episodeValue, provenance: "episode" },
      { context: { ...layeredContext, beat: { [beatField]: beatValue } }, value: beatValue, provenance: "beat" },
    ],
  };
}

function styleBoundaryQuestion(id: string, number: number, text: string, choices: [string, string, string]) {
  return {
    id,
    number,
    format: "multiple_choice",
    difficulty: 1,
    question: text,
    choices: choices.map((choice, index) => ({ id: `${id}-c${index + 1}`, text: choice })),
    correct_choice_id: `${id}-c1`,
    explanation: `${choices[0]} is correct.`,
    fun_fact: "A useful fact.",
    source_ids: ["S01"],
    visual_opportunity: text,
    validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
  } as const;
}
