import test from "node:test";
import assert from "node:assert/strict";
import {
  QuizAssetPlanSchema,
  QuizAssetRequirementSchema,
  QuizResolvedAssetSchema,
  PersistedImageSizingSchema,
} from "../src/schemas/quiz/quizAssets.js";

test("QuizAssetPlanSchema parses legacy plan without sizing metadata", () => {
  const legacyPlan = {
    schema_version: 2,
    episode_id: "ep-123",
    assets: [
      {
        asset_id: "asset-1",
        question_id: "q-1",
        subject: "Jupiter with storms",
        purpose: "answer_option",
        style: "photo_reference",
        aspect_ratio: "1:1",
        transparent_background: false,
        required: true,
        semantic_key: "choice_1_jupiter",
        consistency_group_id: null,
      },
    ],
    consistency_groups: [],
  };

  const parsed = QuizAssetPlanSchema.parse(legacyPlan);
  assert.equal(parsed.assets[0].sizing, undefined);
  assert.equal(parsed.assets[0].subject, "Jupiter with storms");
});

test("QuizAssetPlanSchema round-trips plan with valid sizing metadata", () => {
  const sizingData = {
    policy_version: 1 as const,
    layout_id: "visual_choices_three" as const,
    geometry_key: "geo_vc3_432x336_cover",
    recommended_width: 672,
    recommended_height: 504,
  };

  const newPlan = {
    schema_version: 2,
    episode_id: "ep-124",
    assets: [
      {
        asset_id: "asset-1",
        question_id: "q-1",
        subject: "Saturn with rings",
        purpose: "answer_option",
        style: "photo_reference",
        aspect_ratio: "4:3",
        transparent_background: false,
        required: true,
        semantic_key: "choice_1_saturn",
        consistency_group_id: null,
        sizing: sizingData,
      },
    ],
    consistency_groups: [],
  };

  const parsed = QuizAssetPlanSchema.parse(newPlan);
  assert.deepEqual(parsed.assets[0].sizing, sizingData);
});

test("PersistedImageSizingSchema rejects invalid dimensions, policy_version, or empty geometry_key", () => {
  // Negative width
  assert.throws(() => {
    PersistedImageSizingSchema.parse({
      policy_version: 1,
      layout_id: "visual_choices_three",
      geometry_key: "geo_key",
      recommended_width: -100,
      recommended_height: 500,
    });
  });

  // Zero height
  assert.throws(() => {
    PersistedImageSizingSchema.parse({
      policy_version: 1,
      layout_id: "visual_choices_three",
      geometry_key: "geo_key",
      recommended_width: 672,
      recommended_height: 0,
    });
  });

  // Empty geometry_key
  assert.throws(() => {
    PersistedImageSizingSchema.parse({
      policy_version: 1,
      layout_id: "visual_choices_three",
      geometry_key: "",
      recommended_width: 672,
      recommended_height: 504,
    });
  });

  // Unsupported policy_version
  assert.throws(() => {
    PersistedImageSizingSchema.parse({
      policy_version: 2,
      layout_id: "visual_choices_three",
      geometry_key: "geo_key",
      recommended_width: 672,
      recommended_height: 504,
    });
  });

  // 'auto' layout is excluded from resolved layout in sizing
  assert.throws(() => {
    PersistedImageSizingSchema.parse({
      policy_version: 1,
      layout_id: "auto",
      geometry_key: "geo_key",
      recommended_width: 672,
      recommended_height: 504,
    });
  });
});

test("QuizResolvedAssetSchema accepts optional actual_dimensions", () => {
  const resolvedAsset = {
    asset_id: "asset-1",
    question_id: "q-1",
    subject: "Saturn with rings",
    purpose: "answer_option",
    style: "photo_reference",
    aspect_ratio: "4:3",
    transparent_background: false,
    required: true,
    semantic_key: "choice_1_saturn",
    consistency_group_id: null,
    fingerprint: "a".repeat(64),
    path: "/tmp/saturn.png",
    source: "provider" as const,
    actual_dimensions: {
      width: 1024,
      height: 768,
    },
  };

  const parsed = QuizResolvedAssetSchema.parse(resolvedAsset);
  assert.deepEqual(parsed.actual_dimensions, { width: 1024, height: 768 });
});
