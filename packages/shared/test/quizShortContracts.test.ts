import assert from "node:assert/strict";
import nodeTest from "node:test";
import {
  ConfirmTopicResponseSchema,
  PORTRAIT_FRAME_GEOMETRY,
  QUIZ_GAMEPLAY_POLICIES,
  QUIZ_GAMEPLAY_POLICY_VERSION,
  QUIZ_PORTRAIT_LAYOUT_IDS,
  QUIZ_SHORT_DEFAULT_QUESTION_COUNT,
  QuizConfigSchema,
  QuizShortConfigSchema,
  QuizShortSchema,
  QuizShortTopicConfirmInputSchema,
  TopicCandidateSchema,
  TopicRunResultSchema,
  applyPacingProfile,
  episodeProductRef,
  gameplayTimingPolicy,
  getQuizImageSlotGeometry,
  inferQuestionHistoryContentType,
  quizShortProductRef,
  resolveQuizLayout,
} from "../src/index.js";

type TestCallback = () => void | Promise<void>;

const test = (name: string, testCase: TestCallback): void => {
  void nodeTest(name, testCase);
};

const now = "2026-10-10T00:00:00.000Z";

test("QS-00 quiz short config locks portrait output and short pacing", () => {
  const config = QuizShortConfigSchema.parse({});
  assert.equal(config.render_aspect_ratio, "9:16");
  assert.equal(config.thumbnail_aspect_ratio, "9:16");
  assert.equal(config.pacing_profile, "short");
  assert.equal(config.question_count, QUIZ_SHORT_DEFAULT_QUESTION_COUNT);
  assert.equal(config.outro_cta_enabled, true);
  assert.equal("intro_enabled" in config, false);
  assert.equal(QuizShortConfigSchema.safeParse({ render_aspect_ratio: "16:9" }).success, false);
  assert.equal(QuizShortConfigSchema.safeParse({ question_count: 12 }).success, false);
  // Episode config is untouched by the new product.
  assert.equal(QuizConfigSchema.parse({}).render_aspect_ratio, "16:9");
});

test("QS-01 quiz short record parses with media defaults", () => {
  const record = QuizShortSchema.parse({
    quiz_short_id: "qshort_1",
    channel_id: "ch_1",
    slug: "five-facts",
    topic: { title: "Five facts", premise: "Premise", hook: "Hook" },
    stage: "SELECTED",
    created_at: now,
    updated_at: now,
  });
  assert.equal(record.quiz_config.question_count, 5);
  assert.equal(record.render_stale, false);
  assert.equal(record.thumbnail_asset_path_9_16, null);
});

test("QS-02 topic candidates accept the quiz_short kind and require matching bindings", () => {
  const candidate = TopicCandidateSchema.parse({
    content_kind: "quiz_short",
    topic_id: "topic_qs_1",
    channel_id: "ch_1",
    title: "Ocean giants",
    premise: "Premise",
    why_it_fits: "Fits",
    hook: "Hook",
    estimated_potential: "High",
    generated_at: now,
    archetype: "deep_trivia",
  });
  assert.equal(candidate.content_kind, "quiz_short");
  if (candidate.content_kind === "quiz_short") {
    assert.equal(candidate.question_count, 5);
    assert.equal(candidate.aspect_ratio, "9:16");
  }
  const binding = (id: string) => ({
    source_question_id: id,
    source_hash_version: 1 as const,
    source_content_hash: "a".repeat(64),
    projection_provenance: { source_variant: "native", resolved_language: "en", translation_key: null, translation_provenance: "native" },
  });
  const run = TopicRunResultSchema.safeParse({
    run_id: "run_1",
    candidates: [{ ...candidate, slot_id: "slot_5", source_bindings: [binding("q1"), binding("q2")] }],
  });
  assert.equal(run.success, false);
  const okRun = TopicRunResultSchema.parse({
    run_id: "run_1",
    candidates: [{ ...candidate, slot_id: "slot_5", source_bindings: ["q1", "q2", "q3", "q4", "q5"].map(binding) }],
  });
  assert.equal(okRun.target_quiz_short_count, 4);
});

test("QS-03 confirm input and response carry the quiz_short discriminator", () => {
  assert.equal(QuizShortTopicConfirmInputSchema.safeParse({ render_aspect_ratio: "16:9" }).success, false);
  assert.equal(QuizShortTopicConfirmInputSchema.parse({ question_count: 3 }).question_count, 3);
  const response = ConfirmTopicResponseSchema.parse({
    content_kind: "quiz_short",
    quiz_short: QuizShortSchema.parse({
      quiz_short_id: "qshort_1",
      channel_id: "ch_1",
      slug: "s",
      topic: { title: "T", premise: "P", hook: "H" },
      stage: "SELECTED",
      created_at: now,
      updated_at: now,
    }),
  });
  assert.equal(response.content_kind, "quiz_short");
});

test("QS-04 question history infers quiz short entries from the id prefix", () => {
  assert.equal(inferQuestionHistoryContentType({ episode_id: "qshort_abc" }), "quiz_short");
  assert.equal(inferQuestionHistoryContentType({ episode_id: "sreel_abc" }), "short_reel");
  assert.equal(inferQuestionHistoryContentType({ episode_id: "ep_abc", content_type: "quiz_short" }), "quiz_short");
  assert.equal(inferQuestionHistoryContentType({ episode_id: "ep_abc" }), "episode");
});

test("QS-05 product refs name the kind explicitly", () => {
  assert.deepEqual(episodeProductRef("ch", "ep"), { kind: "episode", channel_id: "ch", product_id: "ep" });
  assert.deepEqual(quizShortProductRef("ch", "qs"), { kind: "quiz_short", channel_id: "ch", product_id: "qs" });
});

test("QS-06 short pacing never narrates choices and keeps a question under eleven seconds", () => {
  assert.equal(QUIZ_GAMEPLAY_POLICY_VERSION, 2);
  for (const policy of Object.values(QUIZ_GAMEPLAY_POLICIES)) {
    const shortPolicy = applyPacingProfile(policy, "short");
    assert.equal(shortPolicy.readChoices, false);
    const timing = gameplayTimingPolicy(shortPolicy, "7-9", 1, "short");
    const estimatedQuestionSeconds =
      timing.question_narration_lead_seconds +
      2.5 + // typical question narration
      timing.question_to_choices_pause_seconds +
      timing.choices_enter_delay_seconds +
      timing.maximum_thinking_seconds +
      timing.countdown_seconds * 0 + // countdown overlaps the thinking window
      timing.reveal_seconds +
      timing.reveal_hold_seconds +
      timing.explanation_hold_seconds +
      timing.transition_seconds;
    assert.ok(estimatedQuestionSeconds <= 11, `${policy.id} estimated ${estimatedQuestionSeconds}s`);
  }
  const standard = gameplayTimingPolicy(QUIZ_GAMEPLAY_POLICIES.deep_trivia, "7-9");
  assert.ok(standard.maximum_thinking_seconds > 8);
});

test("QS-07 portrait layouts resolve automatically for 9:16 and never leak into 16:9", () => {
  const portrait = resolveQuizLayout({
    requestedLayout: "auto",
    archetype: "deep_trivia",
    questionFormat: "multiple_choice",
    choiceCount: 3,
    aspectRatio: "9:16",
    media: [],
  });
  assert.equal(portrait.ok, true);
  if (portrait.ok) assert.equal(portrait.layoutId, "short_stack_list");

  const verdict = resolveQuizLayout({
    requestedLayout: "auto",
    archetype: "verdict_yes_no",
    questionFormat: "yes_no",
    choiceCount: 2,
    aspectRatio: "9:16",
  });
  assert.equal(verdict.ok, true);
  if (verdict.ok) assert.equal(verdict.layoutId, "short_verdict_yes_no");

  const landscape = resolveQuizLayout({
    requestedLayout: "auto",
    archetype: "deep_trivia",
    questionFormat: "multiple_choice",
    choiceCount: 3,
    aspectRatio: "16:9",
  });
  assert.equal(landscape.ok, true);
  if (landscape.ok) assert.equal((QUIZ_PORTRAIT_LAYOUT_IDS as readonly string[]).includes(landscape.layoutId), false);

  const rejected = resolveQuizLayout({
    requestedLayout: "short_stack_list",
    archetype: "deep_trivia",
    questionFormat: "multiple_choice",
    choiceCount: 3,
    aspectRatio: "16:9",
  });
  assert.equal(rejected.ok, false);
});

test("QS-08 portrait image slots stay inside the safe area", () => {
  const safe = PORTRAIT_FRAME_GEOMETRY.safeArea;
  const hero = getQuizImageSlotGeometry({
    layoutId: "short_media_top_choices",
    purpose: "hero_question_image",
    presentation: "text",
    choiceCount: 3,
    canvasAspectRatio: "9:16",
  });
  assert.ok(hero);
  assert.deepEqual(hero.canvas, { width: 1080, height: 1920 });
  assert.ok(hero.viewports[0].width <= safe.width);
  const choice = getQuizImageSlotGeometry({
    layoutId: "short_versus_two",
    purpose: "answer_option",
    presentation: "visual",
    choiceCount: 2,
    canvasAspectRatio: "9:16",
  });
  assert.ok(choice);
  assert.equal(
    getQuizImageSlotGeometry({
      layoutId: "short_stack_list",
      purpose: "hero_question_image",
      presentation: "text",
      choiceCount: 3,
      canvasAspectRatio: "9:16",
    }),
    null,
  );
  assert.equal(
    getQuizImageSlotGeometry({
      layoutId: "media_left_choices_right",
      purpose: "hero_question_image",
      presentation: "text",
      choiceCount: 3,
      canvasAspectRatio: "9:16",
    }),
    null,
  );
});
