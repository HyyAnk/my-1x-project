import { QuizShortSchema, type QuizShort } from "@studio/shared";

export function createMockQuizShort(overrides?: Partial<QuizShort>): QuizShort {
  return QuizShortSchema.parse({
    quiz_short_id: "qshort_test_001",
    channel_id: "channel-test-123",
    slug: "ocean-giants",
    topic: {
      topic_id: "topic_qs_001",
      channel_id: "channel-test-123",
      title: "Ocean Giants.",
      premise: "The biggest animals of the sea.",
      hook: "Which giant rules the deep?",
      origin: "discovery",
    },
    stage: "SCENE_READY",
    quiz_config: { question_count: 5, age_band: "7-9", palette_id: "aqua" },
    created_at: "2026-09-07T12:00:00.000Z",
    updated_at: "2026-09-07T12:00:00.000Z",
    ...overrides,
  });
}
