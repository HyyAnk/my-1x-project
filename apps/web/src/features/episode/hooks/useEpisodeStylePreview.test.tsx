import type React from "react";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Channel, Episode } from "@studio/shared";
import { api } from "../../../api";
import { LanguageProvider } from "../../../i18n";
import type { EpisodePreviewQuestion } from "../types/episodePreview.types";
import { useEpisodeStylePreview } from "./useEpisodeStylePreview";

const wrapper = ({ children }: { children: React.ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;

const channel = {
  channel_id: "channel-1",
  slug: "quiz-channel",
  display_name: "Quiz Channel",
  description: "Quiz",
  target_audience: "Families",
  language: "Vietnamese",
  country: "Vietnam",
  timezone: "Asia/Ho_Chi_Minh",
  status: "ACTIVE",
  created_at: "2026-08-30T00:00:00.000Z",
  updated_at: "2026-08-30T00:00:00.000Z",
} as unknown as Channel;

const episode = {
  episode_id: "episode-1",
  channel_id: channel.channel_id,
  slug: "episode-1",
  topic: { title: "Animals", premise: "Animal quiz", hook: "Guess the animal" },
  stage: "RESEARCH",
  research_path: "research.md",
  treatment_path: "treatment.md",
  script_path: "script.md",
  visual_bible_path: "visual_bible.md",
  scene_plan_path: "scene_plan.md",
  dialogue_script_path: "dialogue_script.md",
  video_prompts_path: "video_prompts.md",
  created_at: "2026-08-30T00:00:00.000Z",
  updated_at: "2026-08-30T00:00:00.000Z",
} as unknown as Episode;

const previewResponse = (label: string) => ({
  html: `<section>${label}</section>`,
  css: "",
  contrast_report: { ok: true },
});

function createDeferredPreview() {
  let resolve!: (value: ReturnType<typeof previewResponse>) => void;
  const promise = new Promise<ReturnType<typeof previewResponse>>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

describe("useEpisodeStylePreview", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("sends the selected question layout and content to the preview renderer", async () => {
    const previewSpy = vi.spyOn(api, "previewSandboxComposition").mockResolvedValue({
      html: "<section>Preview</section>",
      css: "",
      contrast_report: { ok: true },
    });

    renderHook(
      () =>
        useEpisodeStylePreview({
          channel,
          episode,
          candidate: null,
          previewQuestion: {
            id: "q2",
            number: 2,
            text: "Đâu là Sao Thổ?",
            choices: ["Ảnh A", "Ảnh B", "Ảnh C"],
            correctChoiceIndex: 1,
            factText: "Sao Thổ có hệ vành đai nổi bật.",
            totalQuestions: 8,
            layoutId: "visual_choices_three",
            questionFormat: "multiple_choice",
            archetype: "visual_multiple_choice",
            layoutSource: "director",
          },
        }),
      { wrapper },
    );

    await vi.waitFor(() => expect(previewSpy).toHaveBeenCalled());
    expect(previewSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        layout_id: "visual_choices_three",
        question_format: "multiple_choice",
        archetype: "visual_multiple_choice",
        question_number: 2,
        question_text: "Đâu là Sao Thổ?",
        choices: ["Ảnh A", "Ảnh B", "Ảnh C"],
        correct_choice_index: 1,
      }),
    );
  });

  it("acknowledges a question change immediately and ignores the superseded response", async () => {
    const first = createDeferredPreview();
    const second = createDeferredPreview();
    const previewSpy = vi
      .spyOn(api, "previewSandboxComposition")
      .mockImplementation((request) => (request.question_text === "Câu một" ? first.promise : second.promise));
    const firstQuestion = buildPreviewQuestion("q1", 1, "Câu một");
    const secondQuestion = buildPreviewQuestion("q2", 2, "Câu hai");

    const { result, rerender } = renderHook(
      ({ previewQuestion }) => useEpisodeStylePreview({ channel, episode, candidate: null, previewQuestion }),
      { initialProps: { previewQuestion: firstQuestion }, wrapper },
    );

    expect(result.current.loading).toBe(true);
    await vi.waitFor(() => expect(previewSpy).toHaveBeenCalledWith(expect.objectContaining({ question_text: "Câu một" })));

    rerender({ previewQuestion: secondQuestion });
    expect(result.current.loading).toBe(true);
    await act(async () => {
      first.resolve(previewResponse("stale"));
      await first.promise;
    });
    expect(result.current.pendingPreviewHtml).toBe("");

    await vi.waitFor(() => expect(previewSpy).toHaveBeenCalledWith(expect.objectContaining({ question_text: "Câu hai" })));
    await act(async () => {
      second.resolve(previewResponse("current"));
      await second.promise;
    });
    expect(result.current.pendingPreviewHtml).toContain("current");
  });
});

function buildPreviewQuestion(id: string, number: number, text: string): EpisodePreviewQuestion {
  return {
    id,
    number,
    text,
    choices: ["A", "B", "C"],
    correctChoiceIndex: 0,
    factText: "Fact",
    totalQuestions: 2,
    layoutId: "visual_choices_three",
    questionFormat: "multiple_choice",
    archetype: "visual_multiple_choice",
    layoutSource: "director",
  };
}
