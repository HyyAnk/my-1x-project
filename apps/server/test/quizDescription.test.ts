import { describe, expect, it } from "vitest";
import type { Channel, Episode, QuizV2 } from "@studio/shared";
import {
  calculateScoringTiers,
  formatScoringRange,
  compileVideoDescriptionPrompt,
  assembleFullDescription,
  normalizeHashtags,
  parseDescriptionJsonResponse,
  generateVideoDescription,
} from "../src/quiz/description/index.js";
import type { LLMClient } from "../src/utils/promptSanitizer.js";

describe("Quiz Video Description Engine (Step 2)", () => {
  const sampleChannel: Channel = {
    channel_id: "channel-1",
    slug: "quiz-master",
    display_name: "Quiz Master VN",
    description: "Kênh câu đố kiến thức hấp dẫn",
    target_audience: "Gia đình và học sinh",
    language: "Vietnamese",
    country: "VN",
    market: "Vietnam",
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
      title: "Kỳ Quan Thế Giới Cổ Đại",
      premise: "Thử thách kiến thức về các kỳ quan cổ đại",
      hook: "Bạn có biết kỳ quan nào còn tồn tại đến ngày nay?",
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
    language: "Vietnamese",
    questions: [
      {
        id: "q-01",
        number: 1,
        format: "multiple_choice",
        difficulty: 1,
        question: "Kim tự tháp Giza nằm ở quốc gia nào?",
        choices: [
          { id: "choice-a", text: "Ai Cập" },
          { id: "choice-b", text: "Hy Lạp" },
          { id: "choice-c", text: "La Mã" },
        ],
        correct_choice_id: "choice-a",
        explanation: "Kim tự tháp Giza là kỳ quan cổ đại duy nhất còn nguyên vẹn, nằm tại Ai Cập.",
        fun_fact: "Xây dựng trong hơn 20 năm.",
        source_ids: ["src-1"],
        visual_opportunity: "Kim tự tháp Giza sừng sững trên sa mạc",
        validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
      },
      {
        id: "q-02",
        number: 2,
        format: "multiple_choice",
        difficulty: 2,
        question: "Vườn treo Babylon được cho là nằm ở quốc gia hiện đại nào?",
        choices: [
          { id: "choice-a", text: "Iraq" },
          { id: "choice-b", text: "Iran" },
          { id: "choice-c", text: "Thổ Nhĩ Kỳ" },
        ],
        correct_choice_id: "choice-a",
        explanation: "Vườn treo Babylon huyền thoại nằm bên dòng sông Euphrates tại Iraq ngày nay.",
        fun_fact: "Được vua Nebuchadnezzar II xây dựng.",
        source_ids: ["src-2"],
        visual_opportunity: "Khu vườn bậc thang xanh mướt giữa sa mạc",
        validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
      },
    ],
  };

  describe("calculateScoringTiers", () => {
    it("calculates correct tier bounds for various question counts", () => {
      const t3 = calculateScoringTiers(3);
      expect(t3).toEqual({
        questionCount: 3,
        tier1: { min: 1, max: 1 },
        tier2: { min: 2, max: 2 },
        tier3: { min: 3, max: 3 },
      });

      const t5 = calculateScoringTiers(5);
      expect(t5).toEqual({
        questionCount: 5,
        tier1: { min: 1, max: 1 },
        tier2: { min: 2, max: 3 },
        tier3: { min: 4, max: 5 },
      });

      const t8 = calculateScoringTiers(8);
      expect(t8).toEqual({
        questionCount: 8,
        tier1: { min: 1, max: 2 },
        tier2: { min: 3, max: 5 },
        tier3: { min: 6, max: 8 },
      });

      const t10 = calculateScoringTiers(10);
      expect(t10).toEqual({
        questionCount: 10,
        tier1: { min: 1, max: 3 },
        tier2: { min: 4, max: 6 },
        tier3: { min: 7, max: 10 },
      });

      const t15 = calculateScoringTiers(15);
      expect(t15).toEqual({
        questionCount: 15,
        tier1: { min: 1, max: 5 },
        tier2: { min: 6, max: 10 },
        tier3: { min: 11, max: 15 },
      });

      const t30 = calculateScoringTiers(30);
      expect(t30).toEqual({
        questionCount: 30,
        tier1: { min: 1, max: 10 },
        tier2: { min: 11, max: 20 },
        tier3: { min: 21, max: 30 },
      });
    });

    it("formats scoring range strings properly", () => {
      expect(formatScoringRange(1, 3)).toBe("1–3 pts");
      expect(formatScoringRange(5, 5)).toBe("5 pts");
      expect(formatScoringRange(1, 3, "English")).toBe("1–3 pts");
      expect(formatScoringRange(5, 5, "English")).toBe("5 pts");
    });
  });

  describe("normalizeHashtags", () => {
    it("deduplicates and cleans hashtags correctly", () => {
      const input = ["#quiz", "trivia", "##QUIZ", "dovui", "  #KiếnThức  "];
      const result = normalizeHashtags(input);
      expect(result).toEqual(["#quiz", "#trivia", "#dovui", "#KiếnThức"]);
    });
  });

  describe("compileVideoDescriptionPrompt", () => {
    it("compiles a comprehensive prompt embedding all ground truth and rules", () => {
      const prompt = compileVideoDescriptionPrompt({
        quiz: sampleQuiz,
        channel: sampleChannel,
        episode: sampleEpisode,
        toneHint: "Góc nhìn hài hước khám phá",
      });

      expect(prompt).toContain("Quiz Master VN");
      expect(prompt).toContain("Kỳ Quan Thế Giới Cổ Đại");
      expect(prompt).toContain("Total Questions (Exact Ground Truth): 2");
      expect(prompt).toContain("Q1: Kim tự tháp Giza nằm ở quốc gia nào?");
      expect(prompt).toContain("Ai Cập");
      expect(prompt).toContain("Góc nhìn hài hước khám phá");
      expect(prompt).toContain("11 MANDATORY GENERATION RULES");
      expect(prompt).toContain('"topic_category":');
      expect(prompt).toContain('"primary_keyword":');
      expect(prompt).toContain('"semantic_paragraph":');
      expect(prompt).toContain('"scoring_cta":');
    });
  });

  describe("parseDescriptionJsonResponse", () => {
    it("parses pure json strings", () => {
      const json = '{"topic_category": "Lịch sử", "primary_keyword": "đố vui lịch sử"}';
      const parsed = parseDescriptionJsonResponse(json);
      expect(parsed.topic_category).toBe("Lịch sử");
      expect(parsed.primary_keyword).toBe("đố vui lịch sử");
    });

    it("parses json wrapped in markdown code fences", () => {
      const json = '```json\n{"topic_category": "Khoa học", "primary_keyword": "câu đố khoa học"}\n```';
      const parsed = parseDescriptionJsonResponse(json);
      expect(parsed.topic_category).toBe("Khoa học");
      expect(parsed.primary_keyword).toBe("câu đố khoa học");
    });

    it("parses json surrounded by conversational preamble", () => {
      const text = 'Here is the requested description metadata:\n\n{"topic_category": "Địa lý"}\n\nHope this helps!';
      const parsed = parseDescriptionJsonResponse(text);
      expect(parsed.topic_category).toBe("Địa lý");
    });
  });

  describe("assembleFullDescription", () => {
    it("assembles complete description text with proper sections and character count", () => {
      const result = assembleFullDescription({
        hookLines: "Khám phá 8 kỳ quan thế giới cổ đại!\nCùng thử thách trí nhớ xem bạn biết được bao nhiêu kỳ quan.",
        semanticParagraph:
          "Video đưa bạn khám phá Kim tự tháp Giza hùng vĩ tại Ai Cập và Vườn treo Babylon huyền thoại bên dòng sông Euphrates.",
        scoringCta: {
          beginner: "1–2 câu: Mới nhập môn",
          intermediate: "3–5 câu: Hiểu biết sâu rộng",
          expert: "6–8 câu: Bậc thầy kỳ quan",
          cta_text: "Bạn trả lời đúng bao nhiêu câu? Hãy bình luận kết quả nhé!",
        },
        suggestedPlaylistCategory: "Kỳ Quan & Lịch Sử",
        hashtags: ["#quiz", "#kyquan", "#lichsu", "#trivia"],
        language: "Vietnamese",
      });

      expect(result.fullText).toContain("Khám phá 8 kỳ quan thế giới cổ đại!");
      expect(result.fullText).toContain("🏆 SCORING TIERS:");
      expect(result.fullText).toContain("• 1–2 câu: Mới nhập môn");
      expect(result.fullText).toContain("• 6–8 câu: Bậc thầy kỳ quan");
      expect(result.fullText).toContain("👉 Bạn trả lời đúng bao nhiêu câu? Hãy bình luận kết quả nhé!");
      expect(result.fullText).toContain("📂 Playlist Category: Kỳ Quan & Lịch Sử");
      expect(result.fullText).toContain("#quiz #kyquan #lichsu #trivia");
      expect(result.charCount).toBeGreaterThan(100);
      expect(result.charCount).toBeLessThan(900);
    });
  });

  describe("generateVideoDescription", () => {
    it("generates and validates a VideoDescription object using mock LLM client", async () => {
      const mockClient: LLMClient = {
        connect: async () => {},
        startThread: async () => "thread-1",
        startTurn: async () => "turn-1",
        interruptTurn: async () => {},
        resumeThread: async () => "thread-1",
        on: (event: string, handler: (data: unknown) => void) => {
          if (event === "notification") {
            setTimeout(() => {
              handler({
                method: "item/agentMessage/delta",
                params: {
                  threadId: "thread-1",
                  turnId: "turn-1",
                  delta: JSON.stringify({
                    topic_category: "Kỳ quan cổ đại",
                    primary_keyword: "đố vui kỳ quan thế giới",
                    keyword_variations: ["trắc nghiệm kỳ quan cổ đại", "câu đố kim tự tháp"],
                    question_count: 2,
                    hook_lines: "Đố vui kỳ quan thế giới - Bạn biết bao nhiêu điều bí ẩn?\nCùng thử thách kiến thức cổ đại ngay!",
                    semantic_paragraph:
                      "Tìm hiểu những sự thật thú vị về Kim tự tháp Giza tại Ai Cập và Vườn treo Babylon tại Iraq qua các câu hỏi hấp dẫn.",
                    scoring_cta: {
                      beginner: "1 câu: Tập sự",
                      intermediate: "1 câu: Hiểu biết",
                      expert: "2 câu: Bậc thầy kiến thức",
                      cta_text: "Bạn đúng được mấy câu? Hãy bình luận bên dưới nhé!",
                    },
                    suggested_playlist_category: "Địa Lý & Lịch Sử",
                    hashtags: ["#quiz", "#dovui", "#kyquan", "#lichsu"],
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

      expect(description.topic_category).toBe("Kỳ quan cổ đại");
      expect(description.primary_keyword).toBe("đố vui kỳ quan thế giới");
      expect(description.question_count).toBe(2);
      expect(description.scoring_cta.expert).toContain("Bậc thầy kiến thức");
      expect(description.hashtags).toContain("#quiz");
      expect(description.full_description_text).toContain("🏆 SCORING TIERS:");
      expect(description.char_count).toBeGreaterThan(50);
    });

    it("falls back gracefully when LLM client throws an error", async () => {
      const failingClient: LLMClient = {
        connect: async () => {},
        startThread: async () => {
          throw new Error("LLM connection failed");
        },
      } as unknown as LLMClient;

      const fallback = await generateVideoDescription({
        client: failingClient,
        channel: sampleChannel,
        episode: sampleEpisode,
        quiz: sampleQuiz,
      });

      expect(fallback.topic_category).toBe("Kỳ Quan Thế Giới Cổ Đại");
      expect(fallback.question_count).toBe(2);
      expect(fallback.scoring_cta.beginner).toContain("Beginner");
      expect(fallback.full_description_text).toContain("Kỳ Quan Thế Giới Cổ Đại");
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
        connect: async () => {},
        startThread: async () => {
          throw new Error("LLM offline");
        },
      } as unknown as LLMClient;

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
      expect(fallback.semantic_paragraph).not.toContain("Hãy cùng khám phá");
      expect(fallback.scoring_cta.beginner).toContain("Beginner");
      expect(fallback.scoring_cta.cta_text).toContain("How many did you get right? Comment below!");
      expect(fallback.full_description_text).toContain("🏆 SCORING TIERS:");
      expect(fallback.full_description_text).toContain("📂 Playlist Category: Super Inventions");
      expect(fallback.full_description_text).not.toMatch(/[\u00C0-\u024F\u1E00-\u1EFF]/); // No Vietnamese diacritics
    });
  });
});
