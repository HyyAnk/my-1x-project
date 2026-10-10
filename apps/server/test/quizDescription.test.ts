import { describe, expect, it } from "vitest";
import type { Channel, Episode, QuizV2 } from "@studio/shared";
import {
  calculateScoringTiers,
  formatScoringRange,
  compileVideoDescriptionPrompt,
  assembleFullDescription,
  normalizeHashtags,
  parseDescriptionJsonResponse,
  assembleDescriptionFields,
  buildFallbackDescription,
  resolveDescriptionDefaults,
  generateVideoDescription,
} from "../src/quiz/description/index.js";
import type { LLMClient } from "../src/utils/promptSanitizer.js";

describe("Quiz Video Description Engine (Step 2)", () => {
  const sampleChannel: Channel = {
    channel_id: "channel-1",
    slug: "quiz-master",
    display_name: "Quiz Master US",
    description: "An engaging general knowledge quiz channel",
    target_audience: "Families and students",
    language: "English",
    country: "US",
    market: "United States",
    channel_dna_path: "channels/quiz-master/channel_dna.md",
    style_guide_path: null,
    status: "ACTIVE",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    episode_count: 5,
    voice_reference_path: null,
    group_id: "quiz",
    engine: "quiz",
    selected_styles: ["pixar_3d"],
    default_thinking_bar_style: "auto",
    default_question_box_style: "auto",
    default_answer_card_style: "auto",
    default_counter_style: "auto",
    default_background_style: "auto",
    default_palette_id: "auto",
    mascot_id: null,
    mascot_config: { enabled: true, position: "bottom_left", scale: 1.0 },
  };

  const sampleEpisode: Episode = {
    episode_id: "ep-01",
    channel_id: "channel-1",
    slug: "ep-01-world-wonders",
    topic: {
      title: "Ancient Wonders of the World",
      premise: "A knowledge challenge about the ancient wonders",
      hook: "Do you know which wonder still stands today?",
    },
    stage: "SCRIPT_READY",
    script_path: "channels/quiz-master/episodes/ep-01-world-wonders/script.md",
    research_path: null,
    treatment_path: null,
    visual_bible_path: null,
    scene_plan_path: "scene_plan.md",
    dialogue_script_path: "dialogue_script.md",
    video_prompts_path: "video_prompts.md",
    target_duration_minutes: 8,
    target_word_count: 1050,
    narration_asset_path: null,
    narration_generated_at: null,
    narration_duration_seconds: null,
    narration_segment_count: 0,
    measured_narration_words_per_second: null,
    quiz_config: {
      question_count: 8,
      quiz_format: "multiple_choice",
      age_band: "7-9",
      answer_mode: "voice_and_reveal",
      visual_theme: "candy_arcade",
      visual_style: "pixar_3d",
      resolved_visual_style: "pixar_3d",
      thinking_bar_style: "auto",
      question_counter_style: "auto",
      question_box_style: "auto",
      answer_card_style: "auto",
      background_style: "auto",
      palette_id: "auto",
      channel_brand_name: "Quiz Master",
    },
    video_asset_path: null,
    video_generated_at: null,
    video_duration_seconds: null,
    render_manifest_path: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const sampleQuiz: QuizV2 = {
    schema_version: 2,
    episode_id: "ep-01",
    age_band: "7-9",
    language: "English",
    questions: [
      {
        id: "q-01",
        number: 1,
        format: "multiple_choice",
        difficulty: 1,
        question: "In which country is the Great Pyramid of Giza?",
        choices: [
          { id: "choice-a", text: "Egypt" },
          { id: "choice-b", text: "Greece" },
          { id: "choice-c", text: "Rome" },
        ],
        correct_choice_id: "choice-a",
        explanation: "The Great Pyramid of Giza is the only ancient wonder still largely intact, and it stands in Egypt.",
        fun_fact: "It took more than 20 years to build.",
        source_ids: ["src-1"],
        visual_opportunity: "The Great Pyramid of Giza towering over the desert",
        validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
      },
      {
        id: "q-02",
        number: 2,
        format: "multiple_choice",
        difficulty: 2,
        question: "In which modern country were the Hanging Gardens of Babylon said to be?",
        choices: [
          { id: "choice-a", text: "Iraq" },
          { id: "choice-b", text: "Iran" },
          { id: "choice-c", text: "Turkey" },
        ],
        correct_choice_id: "choice-a",
        explanation: "The legendary Hanging Gardens of Babylon stood beside the Euphrates River in present-day Iraq.",
        fun_fact: "They were built by King Nebuchadnezzar II.",
        source_ids: ["src-2"],
        visual_opportunity: "Lush green terraced gardens in the middle of the desert",
        validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
      },
    ],
  };

  describe("calculateScoringTiers", () => {
    it("calculates correct tier bounds for various question counts", () => {
      const t3 = calculateScoringTiers(3);
      expect(t3).toEqual({
        questionCount: 3,
        tier1: { min: 0, max: 1 },
        tier2: { min: 2, max: 2 },
        tier3: { min: 3, max: 3 },
      });

      const t5 = calculateScoringTiers(5);
      expect(t5).toEqual({
        questionCount: 5,
        tier1: { min: 0, max: 1 },
        tier2: { min: 2, max: 3 },
        tier3: { min: 4, max: 5 },
      });

      const t8 = calculateScoringTiers(8);
      expect(t8).toEqual({
        questionCount: 8,
        tier1: { min: 0, max: 2 },
        tier2: { min: 3, max: 5 },
        tier3: { min: 6, max: 8 },
      });

      const t10 = calculateScoringTiers(10);
      expect(t10).toEqual({
        questionCount: 10,
        tier1: { min: 0, max: 3 },
        tier2: { min: 4, max: 6 },
        tier3: { min: 7, max: 10 },
      });

      const t15 = calculateScoringTiers(15);
      expect(t15).toEqual({
        questionCount: 15,
        tier1: { min: 0, max: 5 },
        tier2: { min: 6, max: 10 },
        tier3: { min: 11, max: 15 },
      });

      const t30 = calculateScoringTiers(30);
      expect(t30).toEqual({
        questionCount: 30,
        tier1: { min: 0, max: 10 },
        tier2: { min: 11, max: 20 },
        tier3: { min: 21, max: 30 },
      });
    });

    it("formats scoring range strings properly", () => {
      expect(formatScoringRange(1, 3)).toBe("1–3 points");
      expect(formatScoringRange(5, 5)).toBe("5 points");
      expect(formatScoringRange(1, 1, "English")).toBe("1 point");
      expect(formatScoringRange(0, 0, "fr")).toBe("0 point");
      expect(formatScoringRange(0, 2, "de")).toBe("0–2 Punkte");
      expect(formatScoringRange(4, 7, "ja")).toBe("4–7点");
    });
  });

  describe("normalizeHashtags", () => {
    it("deduplicates and cleans hashtags correctly", () => {
      const input = ["#quiz", "trivia", "##QUIZ", "funfacts", "  #BrainTeaser  "];
      const result = normalizeHashtags(input);
      expect(result).toEqual(["#quiz", "#trivia", "#funfacts", "#BrainTeaser"]);
    });
  });

  describe("compileVideoDescriptionPrompt", () => {
    it("compiles a comprehensive prompt embedding all ground truth and rules", () => {
      const prompt = compileVideoDescriptionPrompt({
        quiz: sampleQuiz,
        channel: sampleChannel,
        episode: sampleEpisode,
        toneHint: "A playful, curious point of view",
      });

      expect(prompt).toContain("Quiz Master US");
      expect(prompt).toContain("Ancient Wonders of the World");
      expect(prompt).toContain("Total Questions (Exact Ground Truth): 2");
      expect(prompt).toContain("Q1: In which country is the Great Pyramid of Giza?");
      expect(prompt).toContain("Egypt");
      expect(prompt).toContain("A playful, curious point of view");
      expect(prompt).toContain("12 MANDATORY GENERATION RULES");
      expect(prompt).toContain("NO SPOILERS");
      expect(prompt).not.toContain("Ans:");
      expect(prompt).not.toContain("Exp:");
      expect(prompt).toContain('"topic_category":');
      expect(prompt).toContain('"primary_keyword":');
      expect(prompt).toContain('"semantic_paragraph":');
      expect(prompt).toContain('"scoring_cta":');
    });
  });

  describe("parseDescriptionJsonResponse", () => {
    it("parses pure json strings", () => {
      const json = '{"topic_category": "History", "primary_keyword": "history trivia"}';
      const parsed = parseDescriptionJsonResponse(json);
      expect(parsed.topic_category).toBe("History");
      expect(parsed.primary_keyword).toBe("history trivia");
    });

    it("parses json wrapped in markdown code fences", () => {
      const json = '```json\n{"topic_category": "Science", "primary_keyword": "science quiz"}\n```';
      const parsed = parseDescriptionJsonResponse(json);
      expect(parsed.topic_category).toBe("Science");
      expect(parsed.primary_keyword).toBe("science quiz");
    });

    it("parses json surrounded by conversational preamble", () => {
      const text = 'Here is the requested description metadata:\n\n{"topic_category": "Geography"}\n\nHope this helps!';
      const parsed = parseDescriptionJsonResponse(text);
      expect(parsed.topic_category).toBe("Geography");
    });
  });

  describe("descriptionFallbackLocales", () => {
    it("builds fallback descriptions for supported locales (en, de, fr, es)", () => {
      const tiers = calculateScoringTiers(5);
      const enFallback = buildFallbackDescription("en", sampleEpisode, 5, tiers);
      expect(enFallback.primary_keyword).toBe("ancient wonders of the world");
      expect(enFallback.hook_lines).toContain("5 Question Challenge!");
      expect(enFallback.suggested_playlist_category).toBe(sampleEpisode.topic.title);

      const deFallback = buildFallbackDescription("de", sampleEpisode, 5, tiers);
      expect(deFallback.hook_lines).toContain("5 Fragen!");

      const frFallback = buildFallbackDescription("fr", sampleEpisode, 5, tiers);
      expect(frFallback.hook_lines).toContain("Défi 5 Questions !");

      const esFallback = buildFallbackDescription("es", sampleEpisode, 5, tiers);
      expect(esFallback.hook_lines).toContain("¡Desafío de 5 preguntas!");

      const zhFallback = buildFallbackDescription("zh", sampleEpisode, 5, tiers);
      expect(zhFallback.hook_lines).toContain("5\u9053\u9898\u76ee\u6311\u6218");
    });

    it("throws RepositoryError for unsupported locale", () => {
      const tiers = calculateScoringTiers(5);
      expect(() => buildFallbackDescription("unsupported_xyz", sampleEpisode, 5, tiers)).toThrow(/DESCRIPTION_LOCALIZATION_FAILED/);
    });

    it("resolves description defaults across locales", () => {
      const tiers = calculateScoringTiers(5);
      const enDefaults = resolveDescriptionDefaults("en", sampleEpisode, tiers);
      expect(enDefaults.defaultCtaText).toBe("How many did you get right? Comment below!");
      expect(enDefaults.defaultBeginner).toContain("Beginner");

      const deDefaults = resolveDescriptionDefaults("de", sampleEpisode, tiers);
      expect(deDefaults.defaultCtaText).toBe("Wie viele hast du richtig? Kommentiere unten!");

      const fallbackDefaults = resolveDescriptionDefaults("unknown_lang", sampleEpisode, tiers);
      expect(fallbackDefaults.defaultHookLines).toBeUndefined();
      expect(fallbackDefaults.defaultBeginner).toContain("Beginner");
    });
  });

  describe("assembleDescriptionFields", () => {
    it("assembles fields with proper defaults and hashtag normalization", () => {
      const tiers = calculateScoringTiers(5);
      const defaults = resolveDescriptionDefaults("en", sampleEpisode, tiers);
      const assembled = assembleDescriptionFields(
        {
          topic_category: "World Wonders",
          primary_keyword: "ancient wonders",
          hashtags: ["#quiz", "#wonders", "trivia"],
        },
        sampleEpisode,
        "en",
        defaults,
      );

      expect(assembled.topicCategory).toBe("World Wonders");
      expect(assembled.primaryKeyword).toBe("ancient wonders");
      expect(assembled.hookLines).toBe(defaults.defaultHookLines);
      expect(assembled.semanticParagraph).toBe(defaults.defaultSemantic);
      expect(assembled.hashtags).toEqual(["#quiz", "#wonders", "#trivia"]);
    });

    it("throws when missing mandatory fields without locale defaults", () => {
      const emptyDefaults = {
        defaultHookLines: undefined,
        defaultSemantic: undefined,
        defaultBeginner: "1 pt",
        defaultIntermediate: "2 pts",
        defaultExpert: "3 pts",
        defaultCtaText: "Comment below!",
      };

      expect(() => assembleDescriptionFields({}, sampleEpisode, "unknown", emptyDefaults)).toThrow(
        /Missing hook lines for unknown description/,
      );
    });
  });

  describe("assembleFullDescription", () => {
    it("assembles complete description text with proper sections and character count", () => {
      const result = assembleFullDescription({
        hookLines: "Explore the 8 ancient wonders of the world!\nTest your memory and see how many wonders you know.",
        semanticParagraph:
          "This video takes you to the majestic Great Pyramid of Giza in Egypt and the legendary Hanging Gardens of Babylon beside the Euphrates.",
        scoringCta: {
          beginner: "1–2 correct: Newcomer",
          intermediate: "3–5 correct: Well-Read Explorer",
          expert: "6–8 correct: Wonder Master",
          cta_text: "How many did you answer correctly? Share your score in the comments!",
        },
        suggestedPlaylistCategory: "Wonders & History",
        hashtags: ["#quiz", "#wonders", "#history", "#trivia"],
        language: "English",
      });

      expect(result.fullText).toContain("Explore the 8 ancient wonders of the world!");
      expect(result.fullText).toContain("🏆 SCORING TIERS:");
      expect(result.fullText).toContain("• 1–2 correct: Newcomer");
      expect(result.fullText).toContain("• 6–8 correct: Wonder Master");
      expect(result.fullText).toContain("👉 How many did you answer correctly? Share your score in the comments!");
      // The playlist category is internal taxonomy and must not leak into the public text.
      expect(result.fullText).not.toContain("Playlist Category");
      expect(result.fullText).toContain("#quiz #wonders #history #trivia");
      expect(result.charCount).toBeGreaterThan(100);
      expect(result.charCount).toBeLessThan(900);
    });
  });

  describe("generateVideoDescription", () => {
    it("generates and validates a VideoDescription object using mock LLM client", async () => {
      const mockClient: LLMClient = {
        connect: () => Promise.resolve(),
        startThread: () => Promise.resolve("thread-1"),
        startTurn: () => Promise.resolve("turn-1"),
        interruptTurn: () => Promise.resolve(),
        resumeThread: () => Promise.resolve("thread-1"),
        on: (event: string, handler: (data: unknown) => void) => {
          if (event === "notification") {
            setTimeout(() => {
              handler({
                method: "item/agentMessage/delta",
                params: {
                  threadId: "thread-1",
                  turnId: "turn-1",
                  delta: JSON.stringify({
                    topic_category: "Ancient Wonders",
                    primary_keyword: "world wonders trivia",
                    keyword_variations: ["ancient wonders quiz", "pyramid trivia"],
                    question_count: 2,
                    hook_lines: "World wonders trivia - How many mysteries do you know?\nTest your ancient history knowledge now!",
                    semantic_paragraph:
                      "Uncover fun facts about the Great Pyramid of Giza and the Hanging Gardens of Babylon through exciting questions.",
                    scoring_cta: {
                      beginner: "1 correct: Apprentice",
                      intermediate: "1 correct: Explorer",
                      expert: "2 correct: Knowledge Master",
                      cta_text: "How many did you get right? Tell us below!",
                    },
                    suggested_playlist_category: "Geography & History",
                    hashtags: ["#quiz", "#trivia", "#wonders", "#history"],
                  }),
                },
              });
              handler({
                method: "turn/completed",
                params: { threadId: "thread-1", turnId: "turn-1", turn: { status: "completed" } },
              });
            }, 10);
          }
          return mockClient;
        },
        off: () => mockClient,
      } as unknown as LLMClient;

      const description = await generateVideoDescription({
        client: mockClient,
        channel: sampleChannel,
        episode: sampleEpisode,
        quiz: sampleQuiz,
      });

      expect(description.topic_category).toBe("Ancient Wonders");
      expect(description.primary_keyword).toBe("world wonders trivia");
      expect(description.question_count).toBe(2);
      expect(description.scoring_cta.expert).toContain("Knowledge Master");
      expect(description.hashtags).toContain("#quiz");
      expect(description.full_description_text).toContain("🏆 SCORING TIERS:");
      expect(description.char_count).toBeGreaterThan(50);
    });

    it("falls back gracefully when LLM client throws an error", async () => {
      const failingClient: LLMClient = {
        connect: () => Promise.resolve(),
        startThread: () => Promise.reject(new Error("LLM connection failed")),
      };

      const fallback = await generateVideoDescription({
        client: failingClient,
        channel: sampleChannel,
        episode: sampleEpisode,
        quiz: sampleQuiz,
      });

      expect(fallback.topic_category).toBe("Ancient Wonders of the World");
      expect(fallback.question_count).toBe(2);
      expect(fallback.scoring_cta.beginner).toContain("Beginner");
      expect(fallback.full_description_text).toContain("Ancient Wonders of the World");
    });

    it("strictly adheres to English when channel language is English during fallback", async () => {
      const englishChannel: Channel = {
        ...sampleChannel,
        language: "English",
        country: "US",
      };
      const englishEpisode: Episode = {
        ...sampleEpisode,
        topic: {
          title: "Super Inventions",
          premise: "Test your invention knowledge",
          hook: "Can you spot the odd machine?",
        },
      };

      const failingClient: LLMClient = {
        connect: () => Promise.resolve(),
        startThread: () => Promise.reject(new Error("LLM offline")),
      };

      const fallback = await generateVideoDescription({
        client: failingClient,
        channel: englishChannel,
        episode: englishEpisode,
        quiz: sampleQuiz,
      });

      expect(fallback.language).toBe("English");
      expect(fallback.hook_lines).toContain("Super Inventions - 2 Question Challenge!");
      expect(fallback.hook_lines).toContain("Test your knowledge");
      expect(fallback.semantic_paragraph).toContain("Can you spot the odd machine?");
      // The fallback teases the episode's own questions so it differs per episode.
      expect(fallback.semantic_paragraph).toContain("Inside this challenge: In which country is the Great Pyramid of Giza?");
      expect(fallback.hashtags[0]).toBe("#SuperInventions");
      expect(fallback.scoring_cta.beginner).toContain("Beginner");
      // Age band 7-9 is Made for Kids, so the comment CTA is replaced with a play-along CTA.
      expect(fallback.made_for_kids).toBe(true);
      expect(fallback.scoring_cta.cta_text).toBe("Keep score, then challenge your family to beat it!");
      expect(fallback.full_description_text).toContain("🏆 SCORING TIERS:");
      expect(fallback.full_description_text).not.toContain("Playlist Category");
      expect(fallback.full_description_text).not.toMatch(/[\u00C0-\u024F\u1E00-\u1EFF]/); // No accented Latin characters
    });
  });
});
