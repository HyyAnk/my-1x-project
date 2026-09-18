import { describe as nodeDescribe, it as nodeIt } from "node:test";
import assert from "node:assert/strict";
import {
  QuestionContentTypeSchema,
  QuestionHistoryEntrySchema,
  inferQuestionHistoryContentType,
  BankQuestionCooldownSchema,
  BankQuestionWithCooldownSchema,
  type QuestionContentType,
  type QuestionHistoryEntry,
  type BankQuestionWithCooldown,
} from "../src/index.js";

type TestCallback = () => void | Promise<void>;

const describe = (name: string, suite: TestCallback): void => {
  void nodeDescribe(name, suite);
};

const it = (name: string, testCase: TestCallback): void => {
  void nodeIt(name, testCase);
};

describe("Question Content Type & History Schema Tests", () => {
  describe("QuestionContentTypeSchema", () => {
    it("accepts valid content types: episode and short_reel", () => {
      assert.equal(QuestionContentTypeSchema.parse("episode"), "episode");
      assert.equal(QuestionContentTypeSchema.parse("short_reel"), "short_reel");
    });

    it("rejects invalid content type values", () => {
      assert.throws(() => QuestionContentTypeSchema.parse("movie"));
      assert.throws(() => QuestionContentTypeSchema.parse("clip"));
      assert.throws(() => QuestionContentTypeSchema.parse(""));
      assert.throws(() => QuestionContentTypeSchema.parse(123));
      assert.throws(() => QuestionContentTypeSchema.parse(null));
    });
  });

  describe("QuestionHistoryEntrySchema", () => {
    const createBaseEntry = () => ({
      question_id: "q-geography-01",
      question_text: "What is the capital of France?",
      normalized_question: "what is the capital of france",
      choices: ["Paris", "Berlin", "Madrid"],
      correct_answer: "Paris",
      episode_id: "ep-geo-europe-01",
      episode_title: "European Capitals Showcase",
      channel_id: "ch-world-trivia",
      render_task_id: "task-render-101",
      rendered_at: "2026-09-13T08:00:00.000Z",
    });

    it("defaults content_type to 'episode' when omitted from input", () => {
      const parsed = QuestionHistoryEntrySchema.parse(createBaseEntry());
      assert.equal(parsed.content_type, "episode");
      assert.equal(parsed.question_id, "q-geography-01");
      assert.equal(parsed.episode_id, "ep-geo-europe-01");
    });

    it("accepts explicit content_type as 'short_reel'", () => {
      const parsed = QuestionHistoryEntrySchema.parse({
        ...createBaseEntry(),
        episode_id: "sreel_eiffel_tower_quick",
        episode_title: "Quick Paris Facts",
        content_type: "short_reel",
      });
      assert.equal(parsed.content_type, "short_reel");
      assert.equal(parsed.episode_id, "sreel_eiffel_tower_quick");
    });

    it("accepts explicit content_type as 'episode'", () => {
      const parsed = QuestionHistoryEntrySchema.parse({
        ...createBaseEntry(),
        content_type: "episode",
      });
      assert.equal(parsed.content_type, "episode");
    });

    it("rejects entry with invalid content_type", () => {
      assert.throws(() => {
        QuestionHistoryEntrySchema.parse({
          ...createBaseEntry(),
          content_type: "unsupported_type",
        });
      });
    });

    it("validates type compatibility with QuestionHistoryEntry interface", () => {
      const entry: QuestionHistoryEntry = QuestionHistoryEntrySchema.parse(createBaseEntry());
      const contentType: QuestionContentType = entry.content_type;
      assert.equal(contentType, "episode");
    });
  });

  describe("inferQuestionHistoryContentType", () => {
    it("returns explicit content_type when 'episode' even if episode_id has sreel_ prefix", () => {
      const result = inferQuestionHistoryContentType({
        episode_id: "sreel_paris_micro",
        content_type: "episode",
      });
      assert.equal(result, "episode");
    });

    it("returns explicit content_type when 'short_reel' even if episode_id has standard episode format", () => {
      const result = inferQuestionHistoryContentType({
        episode_id: "ep_full_feature_12",
        content_type: "short_reel",
      });
      assert.equal(result, "short_reel");
    });

    it("infers 'short_reel' from sreel_ prefix when content_type is undefined", () => {
      const result = inferQuestionHistoryContentType({
        episode_id: "sreel_daily_challenge_09",
      });
      assert.equal(result, "short_reel");
    });

    it("infers 'short_reel' from sreel_ prefix when content_type is null", () => {
      const result = inferQuestionHistoryContentType({
        episode_id: "sreel_daily_challenge_10",
        content_type: null,
      });
      assert.equal(result, "short_reel");
    });

    it("infers 'short_reel' from exact prefix sreel_", () => {
      const result = inferQuestionHistoryContentType({
        episode_id: "sreel_",
      });
      assert.equal(result, "short_reel");
    });

    it("falls back to 'episode' when episode_id does not start with sreel_", () => {
      assert.equal(
        inferQuestionHistoryContentType({
          episode_id: "ep-history-ancient-rome",
        }),
        "episode",
      );
      assert.equal(
        inferQuestionHistoryContentType({
          episode_id: "reel_not_sreel",
        }),
        "episode",
      );
      assert.equal(
        inferQuestionHistoryContentType({
          episode_id: "standard_episode_42",
          content_type: null,
        }),
        "episode",
      );
    });

    it("falls back to 'episode' when input has neither content_type nor episode_id", () => {
      assert.equal(inferQuestionHistoryContentType({}), "episode");
      assert.equal(
        inferQuestionHistoryContentType({
          episode_id: undefined,
          content_type: undefined,
        }),
        "episode",
      );
    });

    it("falls back to episode_id prefix check when content_type is an unknown string", () => {
      assert.equal(
        inferQuestionHistoryContentType({
          episode_id: "sreel_science_speed",
          content_type: "custom_type",
        }),
        "short_reel",
      );
      assert.equal(
        inferQuestionHistoryContentType({
          episode_id: "ep_science_long",
          content_type: "custom_type",
        }),
        "episode",
      );
    });
  });

  describe("BankQuestionWithCooldown & Cooldown Schema", () => {
    const createBaseBankQuestion = () => ({
      id: "bq_science_deep_01",
      archetype_id: "deep_trivia" as const,
      domain_id: "natural_sciences",
      subtopic_id: "astronomy",
      question: "Which galaxy is the nearest spiral galaxy to the Milky Way?",
      format: "multiple_choice" as const,
      choices: [
        { id: "c1", text: "Andromeda Galaxy", is_correct: true },
        { id: "c2", text: "Triangulum Galaxy", is_correct: false },
        { id: "c3", text: "Sombrero Galaxy", is_correct: false },
      ],
      correct_choice_id: "c1",
      explanation: "Andromeda is the closest spiral galaxy to our own Milky Way.",
      age_band: "family" as const,
      difficulty: 2,
      tags: ["astronomy", "space"],
      status: "approved" as const,
    });

    it("validates BankQuestionCooldownSchema with content_type 'short_reel'", () => {
      const cooldown = BankQuestionCooldownSchema.parse({
        is_cooldown: true,
        days_remaining: 14,
        last_used_at: "2026-09-10T12:00:00.000Z",
        episode_id: "sreel_space_speed_01",
        episode_title: "Space Facts in 60s",
        content_type: "short_reel",
      });

      assert.equal(cooldown.is_cooldown, true);
      assert.equal(cooldown.days_remaining, 14);
      assert.equal(cooldown.content_type, "short_reel");
      assert.equal(cooldown.episode_id, "sreel_space_speed_01");
    });

    it("validates BankQuestionCooldownSchema with content_type 'episode'", () => {
      const cooldown = BankQuestionCooldownSchema.parse({
        is_cooldown: false,
        days_remaining: 0,
        content_type: "episode",
      });

      assert.equal(cooldown.is_cooldown, false);
      assert.equal(cooldown.days_remaining, 0);
      assert.equal(cooldown.content_type, "episode");
    });

    it("allows BankQuestionCooldownSchema with optional content_type omitted", () => {
      const cooldown = BankQuestionCooldownSchema.parse({
        is_cooldown: true,
        days_remaining: 7,
      });

      assert.equal(cooldown.is_cooldown, true);
      assert.equal(cooldown.days_remaining, 7);
      assert.equal(cooldown.content_type, undefined);
    });

    it("rejects invalid content_type in BankQuestionCooldownSchema", () => {
      assert.throws(() => {
        BankQuestionCooldownSchema.parse({
          is_cooldown: true,
          days_remaining: 5,
          content_type: "podcast",
        });
      });
    });

    it("validates BankQuestionWithCooldownSchema with channel_cooldown containing short_reel content_type", () => {
      const raw = {
        ...createBaseBankQuestion(),
        channel_cooldown: {
          is_cooldown: true,
          days_remaining: 20,
          episode_id: "sreel_galaxy_01",
          episode_title: "Galaxy Reel",
          content_type: "short_reel" as const,
        },
      };

      const parsed = BankQuestionWithCooldownSchema.parse(raw);
      assert.equal(parsed.id, "bq_science_deep_01");
      assert.ok(parsed.channel_cooldown);
      assert.equal(parsed.channel_cooldown?.is_cooldown, true);
      assert.equal(parsed.channel_cooldown?.content_type, "short_reel");
    });

    it("validates BankQuestionWithCooldownSchema when channel_cooldown is omitted", () => {
      const raw = createBaseBankQuestion();
      const parsed = BankQuestionWithCooldownSchema.parse(raw);
      assert.equal(parsed.id, "bq_science_deep_01");
      assert.equal(parsed.channel_cooldown, undefined);
    });

    it("verifies BankQuestionWithCooldown type contract accepts content_type", () => {
      const item: BankQuestionWithCooldown = {
        ...createBaseBankQuestion(),
        channel_cooldown: {
          is_cooldown: true,
          days_remaining: 10,
          last_used_at: "2026-09-01T00:00:00.000Z",
          episode_id: "sreel_milky_way",
          episode_title: "Milky Way Short",
          content_type: "short_reel",
        },
      };

      assert.equal(item.channel_cooldown?.content_type, "short_reel");
    });
  });
});
