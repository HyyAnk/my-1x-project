import { describe, expect, it } from "vitest";
import { checkQuestionsAgainstHistory } from "../src/quiz/qa/questionHistory.js";
import type { QuestionHistoryEntry, QuizQuestion } from "@studio/shared";

describe("Question History Scope & Content Type Separation", () => {
  const sampleQuestion: QuizQuestion = {
    id: "q-test-1",
    number: 1,
    format: "multiple_choice_text",
    difficulty: 2,
    question: "What is the capital city of France?",
    choices: [
      { id: "choice_a", text: "Paris" },
      { id: "choice_b", text: "London" },
      { id: "choice_c", text: "Berlin" },
      { id: "choice_d", text: "Rome" },
    ],
    correct_choice_id: "choice_a",
    explanation: "Paris is the capital of France.",
    fun_fact: "The Eiffel Tower is located in Paris.",
    source_ids: [],
    visual_opportunity: "",
    validation: { semantic_status: "validated", source_coverage: false, fact_locked: true },
  };

  const shortReelEntry: QuestionHistoryEntry = {
    question_id: "hist-short-1",
    question_text: "What is the capital city of France?",
    normalized_question: "what is the capital city of france",
    choices: ["Paris", "London", "Berlin", "Rome"],
    correct_answer: "Paris",
    episode_id: "sreel_123",
    episode_title: "Quick Geography Facts",
    channel_id: "channel-1",
    rendered_at: new Date().toISOString(),
    content_type: "short_reel",
  };

  const episodeEntry: QuestionHistoryEntry = {
    question_id: "hist-ep-1",
    question_text: "What is the capital city of France?",
    normalized_question: "what is the capital city of france",
    choices: ["Paris", "London", "Berlin", "Rome"],
    correct_answer: "Paris",
    episode_id: "ep_456",
    episode_title: "European Capitals Deep Dive",
    channel_id: "channel-1",
    rendered_at: new Date().toISOString(),
    content_type: "episode",
  };

  it("ignores short_reel history entries when checking against episode target", () => {
    const result = checkQuestionsAgainstHistory(
      "ep_current",
      [sampleQuestion],
      [shortReelEntry],
      0,
      "episode",
    );

    expect(result.duplicate_count).toBe(0);
    expect(result.passed).toBe(true);
    expect(result.items[0].status).toBe("passed");
    expect(result.items[0].matched_entry).toBeNull();
  });

  it("ignores episode history entries when checking against short_reel target", () => {
    const result = checkQuestionsAgainstHistory(
      "sreel_current",
      [sampleQuestion],
      [episodeEntry],
      0,
      "short_reel",
    );

    expect(result.duplicate_count).toBe(0);
    expect(result.passed).toBe(true);
    expect(result.items[0].status).toBe("passed");
    expect(result.items[0].matched_entry).toBeNull();
  });

  it("correctly flags duplicates when target and entry content types match", () => {
    // Both are episode
    const episodeResult = checkQuestionsAgainstHistory(
      "ep_current",
      [sampleQuestion],
      [episodeEntry],
      0,
      "episode",
    );
    expect(episodeResult.duplicate_count).toBe(1);
    expect(episodeResult.passed).toBe(false);
    expect(episodeResult.items[0].status).toBe("duplicate");
    expect(episodeResult.items[0].matched_entry?.question_id).toBe("hist-ep-1");

    // Both are short_reel
    const shortReelResult = checkQuestionsAgainstHistory(
      "sreel_current",
      [sampleQuestion],
      [shortReelEntry],
      0,
      "short_reel",
    );
    expect(shortReelResult.duplicate_count).toBe(1);
    expect(shortReelResult.passed).toBe(false);
    expect(shortReelResult.items[0].status).toBe("duplicate");
    expect(shortReelResult.items[0].matched_entry?.question_id).toBe("hist-short-1");
  });

  it("handles backward compatibility when entries lack content_type via fallback inference", () => {
    // Entry without explicit content_type, but episode_id starts with 'sreel_' -> inferred as 'short_reel'
    const legacyShortEntry: QuestionHistoryEntry = {
      question_id: "hist-legacy-short",
      question_text: "What is the capital city of France?",
      normalized_question: "what is the capital city of france",
      choices: ["Paris", "London", "Berlin", "Rome"],
      correct_answer: "Paris",
      episode_id: "sreel_999",
      episode_title: "Legacy Short Reel",
      channel_id: "channel-1",
      rendered_at: new Date().toISOString(),
      content_type: undefined as unknown as "short_reel",
    };

    // Entry without explicit content_type and normal episode_id -> inferred as 'episode'
    const legacyEpisodeEntry: QuestionHistoryEntry = {
      question_id: "hist-legacy-ep",
      question_text: "What is the capital city of France?",
      normalized_question: "what is the capital city of france",
      choices: ["Paris", "London", "Berlin", "Rome"],
      correct_answer: "Paris",
      episode_id: "ep_999",
      episode_title: "Legacy Episode",
      channel_id: "channel-1",
      rendered_at: new Date().toISOString(),
      content_type: undefined as unknown as "episode",
    };

    // When checking for episode, legacyShortEntry is ignored while legacyEpisodeEntry is matched
    const epResult = checkQuestionsAgainstHistory(
      "ep_current",
      [sampleQuestion],
      [legacyShortEntry, legacyEpisodeEntry],
      0,
      "episode",
    );
    expect(epResult.duplicate_count).toBe(1);
    expect(epResult.items[0].matched_entry?.question_id).toBe("hist-legacy-ep");

    // When checking for short_reel, legacyEpisodeEntry is ignored while legacyShortEntry is matched
    const shortResult = checkQuestionsAgainstHistory(
      "sreel_current",
      [sampleQuestion],
      [legacyShortEntry, legacyEpisodeEntry],
      0,
      "short_reel",
    );
    expect(shortResult.duplicate_count).toBe(1);
    expect(shortResult.items[0].matched_entry?.question_id).toBe("hist-legacy-short");
  });
});
