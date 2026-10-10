import { rm } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QUIZ_GAMEPLAY_POLICY_VERSION, type VoiceSegment } from "@studio/shared";
import sharp from "sharp";
import { QUIZ_SHORT_STAGE_SEGMENT_IDS } from "../src/quiz/timeline/quizShortTimelinePolicy.js";
import { getRecommendationForAssetRequirement } from "../src/quiz/assets/imageMetadataValidator.js";
import type { ProviderAssetInput } from "../src/quiz/assets/resolvers/types/providerAsset.types.js";
import * as orchestrator from "../src/quiz/pipeline/orchestrator.js";
import { directorPlanNeedsRefresh } from "../src/quiz/pipeline/directorPlanFreshness.js";
import { quizProductViewFromQuizShort } from "../src/quiz/pipeline/quizProductView.js";
import {
  createQuizShortPipelineHarness,
  fakeNarrationDurationSeconds,
  fakeWav,
  type QuizShortPipelineHarness,
} from "./fixtures/quizShortPipelineHarness.js";

vi.mock("../src/quiz/assets/resolvers/providerAssetResolver.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/quiz/assets/resolvers/providerAssetResolver.js")>()),
  generateAssetWithProvider: vi.fn(async (input: ProviderAssetInput) => {
    const size = getRecommendationForAssetRequirement(input.request).recommended;
    const png = await sharp({ create: { width: size.width, height: size.height, channels: 3, background: "#4477aa" } })
      .png()
      .toBuffer();
    const assetPath = await input.repository.writeQuizImageAsset(
      input.channelId,
      input.episodeId,
      input.request.asset_id,
      input.fingerprint,
      png,
    );
    return {
      entry: { ...input.request, fingerprint: input.fingerprint, path: assetPath, source: "provider" as const },
      tier3Fallback: false,
    };
  }),
}));

vi.mock("../src/quiz/audio/performanceSegmentRenderer.js", () => ({
  renderPerformanceSegment: vi.fn(async (_config: unknown, segment: VoiceSegment) => fakeWav(fakeNarrationDurationSeconds(segment.text))),
}));

vi.mock("../src/quiz/audio/narrationAssembler.js", () => ({
  assembleQuizNarration: vi.fn(
    async (input: {
      repository: QuizShortPipelineHarness["repository"];
      channelId: string;
      episodeId: string;
      voicePlan: { segments: VoiceSegment[] };
      timeline: { duration_seconds: number };
    }) => {
      const audio = fakeWav(input.timeline.duration_seconds);
      const assetPath = await input.repository.writeQuizNarrationAudio(input.channelId, input.episodeId, audio);
      await input.repository.saveNarrationMetadata(
        input.channelId,
        input.episodeId,
        assetPath,
        input.timeline.duration_seconds,
        input.voicePlan.segments.length,
        40,
      );
      return { assetPath, durationSeconds: input.timeline.duration_seconds, diagnostics: {} };
    },
  ),
}));

const harnesses: QuizShortPipelineHarness[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    harnesses.splice(0).map((harness) => rm(harness.root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })),
  );
});

async function createHarness(): Promise<QuizShortPipelineHarness> {
  const harness = await createQuizShortPipelineHarness();
  harnesses.push(harness);
  return harness;
}

describe("Quiz Short pipeline", () => {
  it("produces portrait director, short voice, bookend-free timeline, clean QA and stage timings", async () => {
    const harness = await createHarness();
    await harness.runPipeline();
    const { repository, channelId, ref } = harness;

    const director = await repository.readDirectorPlan(channelId, ref);
    expect(director?.gameplay_policy_version).toBe(QUIZ_GAMEPLAY_POLICY_VERSION);
    expect(director?.beats.map((beat) => beat.layout_id)).toEqual([
      "short_stack_list",
      "short_verdict_yes_no",
      "short_stack_list",
      "short_verdict_yes_no",
      "short_stack_list",
    ]);

    const voicePlan = await repository.readVoicePlan(channelId, ref);
    expect(voicePlan?.segments.some((segment) => segment.role === "choice")).toBe(false);
    expect(voicePlan?.segments.every((segment) => segment.duration_seconds !== null)).toBe(true);

    const timeline = await repository.readQuizTimeline(channelId, ref);
    const segmentIds = new Set(timeline?.events.map((event) => event.segment_id));
    expect(segmentIds.has(QUIZ_SHORT_STAGE_SEGMENT_IDS.kickoff)).toBe(true);
    expect(segmentIds.has(QUIZ_SHORT_STAGE_SEGMENT_IDS.scoreCta)).toBe(true);
    expect(segmentIds.has("intro")).toBe(false);
    expect(segmentIds.has("outro")).toBe(false);
    const eventTypes = new Set(timeline?.events.map((event) => event.type));
    expect(eventTypes.has("bridge.topic.enter")).toBe(false);
    expect(eventTypes.has("bridge.cta.enter")).toBe(false);
    expect(eventTypes.has("pre_outro.enter")).toBe(false);
    expect(timeline?.duration_seconds).toBeLessThanOrEqual(75);

    const assessment = await repository.readQuizAssessment(channelId, ref);
    expect(assessment?.issues.filter((issue) => issue.severity === "blocker")).toEqual([]);

    const timings = await repository.readQuizStageTimings(channelId, ref);
    expect(Object.keys(timings?.stages ?? {})).toEqual(expect.arrayContaining(["quizContent", "qaGates"]));
  });

  it("reuses the director, voice and timeline artifacts on a second run", async () => {
    const harness = await createHarness();
    await harness.runPipeline();
    const firstDirector = await harness.repository.readDirectorPlan(harness.channelId, harness.ref);
    const firstTimeline = await harness.repository.readQuizTimeline(harness.channelId, harness.ref);

    const directorSpy = vi.spyOn(orchestrator, "generateDirector");
    const voiceSpy = vi.spyOn(orchestrator, "generateVoice");
    const timelineSpy = vi.spyOn(orchestrator, "compileTimeline");
    await harness.runPipeline();

    expect(directorSpy).not.toHaveBeenCalled();
    expect(voiceSpy).not.toHaveBeenCalled();
    expect(timelineSpy).not.toHaveBeenCalled();
    expect(await harness.repository.readDirectorPlan(harness.channelId, harness.ref)).toEqual(firstDirector);
    expect(await harness.repository.readQuizTimeline(harness.channelId, harness.ref)).toEqual(firstTimeline);
  });

  it("regenerates a resumed director plan that carries policy version 1", async () => {
    const harness = await createHarness();
    await harness.runPipeline();
    const current = await harness.repository.readDirectorPlan(harness.channelId, harness.ref);
    await harness.repository.writeDirectorPlan(harness.channelId, harness.ref, { ...current!, gameplay_policy_version: 1 });

    const directorSpy = vi.spyOn(orchestrator, "generateDirector");
    await harness.runPipeline();

    expect(directorSpy).toHaveBeenCalledTimes(1);
    const regenerated = await harness.repository.readDirectorPlan(harness.channelId, harness.ref);
    expect(regenerated?.gameplay_policy_version).toBe(QUIZ_GAMEPLAY_POLICY_VERSION);
    expect(regenerated?.beats.map((beat) => beat.layout_id)).toEqual(current?.beats.map((beat) => beat.layout_id));
  });

  it("flags stale Quiz Short plans by policy version and landscape layouts without touching episodes", async () => {
    const harness = await createHarness();
    await harness.runPipeline();
    const view = quizProductViewFromQuizShort(await harness.repository.getQuizShort(harness.channelId, harness.quizShortId));
    const plan = (await harness.repository.readDirectorPlan(harness.channelId, harness.ref))!;

    expect(directorPlanNeedsRefresh(plan, view)).toBe(false);
    expect(directorPlanNeedsRefresh(null, view)).toBe(true);
    expect(directorPlanNeedsRefresh({ ...plan, gameplay_policy_version: 1 }, view)).toBe(true);
    const landscape = { ...plan, beats: plan.beats.map((beat, index) => (index === 2 ? { ...beat, layout_id: "full_stack_list" } : beat)) };
    expect(directorPlanNeedsRefresh(landscape, view)).toBe(true);
  });
});
