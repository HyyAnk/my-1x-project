import test from "node:test";
import assert from "node:assert/strict";
import {
  QuestionImageSlotSchema,
  QuestionImageItemSchema,
  QuestionImagesOverviewResponseSchema,
  UploadQuestionImageInputSchema,
  ResetQuestionImageResponseSchema,
  GenerateQuestionImageInputSchema,
} from "../src/schemas/quiz/quizQuestionImages.js";

test("QuestionImageSlotSchema validates choice and hero slots", () => {
  const slot = {
    slot_id: "c1",
    asset_id: "asset-q1-c1",
    label: "Choice A",
    choice_id: "c1",
    choice_text: "Jupiter",
    purpose: "answer_option" as const,
    aspect_ratio: "1:1",
    status: "ai_generated" as const,
    source: "provider" as const,
    image_url: "/assets/c1.png",
    prompt: "Planet Jupiter close-up",
    user_selected: false,
  };

  const parsed = QuestionImageSlotSchema.parse(slot);
  assert.equal(parsed.slot_id, "c1");
  assert.equal(parsed.label, "Choice A");
  assert.equal(parsed.aspect_ratio, "1:1");
  assert.equal(parsed.purpose, "answer_option");
});

test("QuestionImageItemSchema supports multi-slot 3-choice questions", () => {
  const multiSlotItem = {
    question_number: 1,
    question_id: "q-1",
    question_text: "Which planet is the largest?",
    layout_id: "visual_choices_three",
    asset_id: "asset-q1-c1",
    status: "ai_generated" as const,
    source: "provider" as const,
    image_url: "/assets/c1.png",
    prompt: "Summary prompt",
    aspect_ratio: "1:1",
    slots: [
      {
        slot_id: "c1",
        asset_id: "asset-q1-c1",
        label: "Choice A",
        choice_id: "c1",
        choice_text: "Jupiter",
        purpose: "answer_option" as const,
        aspect_ratio: "1:1",
        status: "ai_generated" as const,
        source: "provider" as const,
        image_url: "/assets/c1.png",
      },
      {
        slot_id: "c2",
        asset_id: "asset-q1-c2",
        label: "Choice B",
        choice_id: "c2",
        choice_text: "Saturn",
        purpose: "answer_option" as const,
        aspect_ratio: "1:1",
        status: "ai_generated" as const,
        source: "provider" as const,
        image_url: "/assets/c2.png",
      },
      {
        slot_id: "c3",
        asset_id: "asset-q1-c3",
        label: "Choice C",
        choice_id: "c3",
        choice_text: "Mars",
        purpose: "answer_option" as const,
        aspect_ratio: "1:1",
        status: "missing" as const,
        source: "none" as const,
      },
    ],
  };

  const parsed = QuestionImageItemSchema.parse(multiSlotItem);
  assert.equal(parsed.layout_id, "visual_choices_three");
  assert.equal(parsed.slots.length, 3);
  assert.equal(parsed.slots[0].label, "Choice A");
  assert.equal(parsed.slots[1].label, "Choice B");
  assert.equal(parsed.slots[2].status, "missing");
});

test("QuestionImageItemSchema validates a complete question image item", () => {
  const item = {
    question_number: 1,
    question_id: "q-1",
    question_text: "What is the largest planet?",
    asset_id: "q1_hero",
    status: "ai_generated",
    source: "provider",
    image_url: "/channels/test/episodes/ep-1/assets/quiz-images/q1_hero.png",
    prompt: "A majestic rendering of planet Jupiter",
    aspect_ratio: "16:9",
    user_selected: false,
    price_vnd: 200,
    model: "recraft-v3",
    dimensions: { width: 1920, height: 1080 },
    filename: "q1_hero.png",
    updated_at: "2026-10-05T09:00:00.000Z",
  };

  const parsed = QuestionImageItemSchema.parse(item);
  assert.equal(parsed.question_number, 1);
  assert.equal(parsed.status, "ai_generated");
  assert.equal(parsed.user_selected, false);
  assert.equal(parsed.aspect_ratio, "16:9");
});

test("QuestionImageItemSchema defaults optional fields properly for missing image", () => {
  const minimalItem = {
    question_number: 2,
    question_id: "q-2",
    question_text: "Which planet is closest to the sun?",
    asset_id: "q2_hero",
    status: "missing",
    source: "none",
  };

  const parsed = QuestionImageItemSchema.parse(minimalItem);
  assert.equal(parsed.question_number, 2);
  assert.equal(parsed.status, "missing");
  assert.equal(parsed.source, "none");
  assert.equal(parsed.image_url, null);
  assert.equal(parsed.prompt, "");
  assert.equal(parsed.aspect_ratio, "16:9");
  assert.equal(parsed.user_selected, false);
});

test("QuestionImagesOverviewResponseSchema parses summary structure accurately", () => {
  const overview = {
    episode_id: "ep-01",
    channel_id: "ch-01",
    total_questions: 2,
    ready_count: 1,
    uploaded_count: 0,
    missing_count: 1,
    items: [
      {
        question_number: 1,
        question_id: "q-1",
        question_text: "Q1 text",
        asset_id: "q1_hero",
        status: "ai_generated",
        source: "provider",
        image_url: "url1",
      },
      {
        question_number: 2,
        question_id: "q-2",
        question_text: "Q2 text",
        asset_id: "q2_hero",
        status: "missing",
        source: "none",
      },
    ],
  };

  const parsed = QuestionImagesOverviewResponseSchema.parse(overview);
  assert.equal(parsed.total_questions, 2);
  assert.equal(parsed.ready_count, 1);
  assert.equal(parsed.missing_count, 1);
  assert.equal(parsed.items.length, 2);
});

test("UploadQuestionImageInputSchema validates payload and mime type", () => {
  const validPayload = {
    data: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    filename: "custom_saturn.png",
    mime_type: "image/png",
  };

  const parsed = UploadQuestionImageInputSchema.parse(validPayload);
  assert.equal(parsed.filename, "custom_saturn.png");
  assert.equal(parsed.mime_type, "image/png");

  assert.throws(() => {
    UploadQuestionImageInputSchema.parse({ data: "" });
  });
});

test("ResetQuestionImageResponseSchema and GenerateQuestionImageInputSchema validate correctly", () => {
  const resetRes = {
    success: true,
    item: {
      question_number: 1,
      question_id: "q-1",
      question_text: "Q1",
      asset_id: "q1_hero",
      status: "missing",
      source: "none",
    },
    invalidated: ["timeline", "render"],
  };

  const parsedReset = ResetQuestionImageResponseSchema.parse(resetRes);
  assert.equal(parsedReset.success, true);
  assert.deepEqual(parsedReset.invalidated, ["timeline", "render"]);

  const genInput = {
    prompt_override: "A detailed 3D planet",
    force: true,
  };
  const parsedGen = GenerateQuestionImageInputSchema.parse(genInput);
  assert.equal(parsedGen.prompt_override, "A detailed 3D planet");
  assert.equal(parsedGen.force, true);
});
