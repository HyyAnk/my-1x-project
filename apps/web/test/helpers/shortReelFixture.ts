import {
  BankQuestionSchema,
  ChannelSchema,
  createEnglishSourceSnapshot,
  createInitialShortReel,
  type Channel,
  type ShortReelRecord,
} from "@studio/shared";

export function createMockChannel(overrides?: Partial<Channel>): Channel {
  return ChannelSchema.parse({
    channel_id: "channel-test-123",
    slug: "nature-mysteries",
    display_name: "Nature Mysteries",
    description: "Channel for nature trivia",
    target_audience: "Curious Minds",
    language: "en",
    country: "US",
    market: "US",
    channel_dna_path: "channels/nature-mysteries/dna.md",
    style_guide_path: null,
    status: "ACTIVE",
    created_at: "2026-09-07T12:00:00.000Z",
    updated_at: "2026-09-07T12:00:00.000Z",
    episode_count: 0,
    voice_reference_path: null,
    ...overrides,
  });
}

export function createMockShortReel(overrides?: Partial<ShortReelRecord>): ShortReelRecord {
  const bankQuestion = BankQuestionSchema.parse({
    id: "bank-predators-001",
    archetype_id: "versus_faceoff",
    domain_id: "nature_animals",
    subtopic_id: "predators",
    language: "en",
    question: "Which animal has the fastest recorded land sprint speed?",
    format: "multiple_choice",
    choices: [
      { id: "A", text: "Cheetah", is_correct: true },
      { id: "B", text: "Greyhound", is_correct: false },
    ],
    correct_choice_id: "A",
    explanation: "Cheetahs can accelerate from 0 to 60 mph in under three seconds.",
    status: "approved",
    age_band: "family",
    difficulty: 2,
    thinking_seconds: 5,
    created_at: "2026-09-07T12:00:00.000Z",
    updated_at: "2026-09-07T12:00:00.000Z",
  });

  const sourceSnapshot = createEnglishSourceSnapshot(bankQuestion);

  const baseReel = createInitialShortReel({
    channel_id: "channel-test-123",
    reel_id: "sreel_test_999",
    topic: {
      topic_id: "topic_test_001",
      channel_id: "channel-test-123",
      title: "Cheetah vs Greyhound Speed.",
      premise: "Comparing raw sprint acceleration across terrain.",
      hook: "Who hits 60 mph faster than a sports car?",
      origin: "discovery",
    },
    source: sourceSnapshot,
  });

  return {
    ...baseReel,
    ...overrides,
  };
}
