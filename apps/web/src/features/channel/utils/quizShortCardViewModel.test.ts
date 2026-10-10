import { describe, expect, it } from "vitest";
import type { Task } from "@studio/shared";
import { createMockQuizShort } from "../../../../test/helpers/quizShortFixture";
import {
  buildQuizShortCardViewModel,
  cleanQuizShortTitle,
  computeQuizShortStatus,
  formatQuizShortStage,
  matchesQuizShortSearch,
} from "./quizShortCardViewModel";

function makeTask(overrides: Partial<Task>): Task {
  return {
    task_id: "task_1",
    task_type: "GENERATE_PIPELINE",
    channel_id: "channel-test-123",
    episode_id: "qshort_test_001",
    product_kind: "quiz_short",
    status: "RUNNING",
    progress_message: "Compiling timeline",
    created_at: "2026-09-07T12:00:00.000Z",
    updated_at: "2026-09-07T12:00:00.000Z",
    ...overrides,
  } as Task;
}

describe("quizShortCardViewModel", () => {
  it("cleans titles and formats stages", () => {
    expect(cleanQuizShortTitle("Ocean Giants...")).toBe("Ocean Giants");
    expect(formatQuizShortStage("SCENE_READY")).toBe("Scene ready");
    expect(formatQuizShortStage("VIDEO_READY")).toBe("Video ready");
  });

  it("derives draft, generating, stale and ready statuses", () => {
    const draft = createMockQuizShort();
    expect(computeQuizShortStatus(draft, []).status).toBe("draft");

    const generating = computeQuizShortStatus(draft, [makeTask({})]);
    expect(generating.status).toBe("generating");
    expect(generating.activeProgressMessage).toBe("Compiling timeline");

    const otherProductTask = makeTask({ episode_id: "ep_other", product_kind: "episode" });
    expect(computeQuizShortStatus(draft, [otherProductTask]).status).toBe("draft");

    const rendered = createMockQuizShort({
      video_asset_path: "channels/x/quiz_shorts/ocean-giants/assets/quiz-video.mp4",
      video_duration_seconds: 52,
    });
    expect(computeQuizShortStatus(rendered, []).status).toBe("ready");
    expect(computeQuizShortStatus({ ...rendered, render_stale: true }, []).status).toBe("stale");
  });

  it("matches search across title, premise and hook", () => {
    const quizShort = createMockQuizShort();
    expect(matchesQuizShortSearch(quizShort, "giants")).toBe(true);
    expect(matchesQuizShortSearch(quizShort, "RULES THE DEEP")).toBe(true);
    expect(matchesQuizShortSearch(quizShort, "volcano")).toBe(false);
    expect(matchesQuizShortSearch(quizShort, "   ")).toBe(true);
  });

  it("builds the card view model with cover, counts and workspace url", () => {
    const quizShort = createMockQuizShort({
      thumbnail_asset_path_9_16: "channels/x/quiz_shorts/ocean-giants/assets/cover.png",
      video_asset_path: "channels/x/quiz_shorts/ocean-giants/assets/quiz-video.mp4",
      video_duration_seconds: 52.4,
    });
    const vm = buildQuizShortCardViewModel(quizShort, []);
    expect(vm.cleanTitle).toBe("Ocean Giants");
    expect(vm.questionCountLabel).toBe("5 questions");
    expect(vm.durationLabel).toBe("52s");
    expect(vm.status).toBe("ready");
    expect(vm.coverUrl).toContain("/api/channels/channel-test-123/quiz-shorts/qshort_test_001/thumbnail/file");
    expect(vm.workspaceUrl).toBe("#/channels/channel-test-123/quiz-shorts/qshort_test_001");

    const withoutCover = buildQuizShortCardViewModel(createMockQuizShort(), []);
    expect(withoutCover.coverUrl).toBeNull();
    expect(withoutCover.durationLabel).toBeNull();
  });
});
