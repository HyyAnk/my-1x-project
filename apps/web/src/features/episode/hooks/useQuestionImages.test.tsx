import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { quizApi } from "../../../api/quizApi";
import { useQuestionImages } from "./useQuestionImages";
import type { QuestionImagesOverviewResponse } from "../types/questionImages.types";

const mockOverview: QuestionImagesOverviewResponse = {
  channel_id: "ch-test",
  episode_id: "ep-test",
  total_questions: 3,
  ready_count: 1,
  uploaded_count: 0,
  missing_count: 2,
  items: [
    {
      question_number: 1,
      question_id: "q1",
      question_text: "What is the largest planet?",
      asset_id: "q1_hero",
      status: "ai_generated",
      source: "provider",
      image_url: "/api/channels/ch-test/episodes/ep-test/questions/1/image",
      prompt: "Jupiter planet in space",
      aspect_ratio: "16:9",
      user_selected: false,
      filename: "CB-01.png",
      slots: [],
    },
    {
      question_number: 2,
      question_id: "q2",
      question_text: "Which planet is known as the Red Planet?",
      asset_id: "q2_hero",
      status: "missing",
      source: "none",
      image_url: null,
      prompt: "Mars red planet in space",
      aspect_ratio: "16:9",
      user_selected: false,
      slots: [],
    },
    {
      question_number: 3,
      question_id: "q3",
      question_text: "What is the closest planet to the Sun?",
      asset_id: "q3_hero",
      status: "missing",
      source: "none",
      image_url: null,
      prompt: "Mercury planet in space",
      aspect_ratio: "16:9",
      user_selected: false,
      slots: [],
    },
  ],
};

describe("useQuestionImages", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.URL.createObjectURL = vi.fn(() => "blob:mock-preview-url");
    global.URL.revokeObjectURL = vi.fn();
  });

  it("fetches overview on mount when hasQuiz is true", async () => {
    vi.spyOn(quizApi, "getQuestionImages").mockResolvedValue(mockOverview);

    const { result } = renderHook(() =>
      useQuestionImages({ channelId: "ch-test", episodeId: "ep-test", hasQuiz: true }),
    );

    expect(result.current.loading).toBe(true);
    await act(async () => {});

    expect(result.current.loading).toBe(false);
    expect(result.current.overview).toEqual(mockOverview);
    expect(result.current.error).toBeNull();
  });

  it("handles fetch failure gracefully", async () => {
    vi.spyOn(quizApi, "getQuestionImages").mockRejectedValue(new Error("Network failed"));

    const { result } = renderHook(() =>
      useQuestionImages({ channelId: "ch-test", episodeId: "ep-test", hasQuiz: true }),
    );

    await act(async () => {});

    expect(result.current.loading).toBe(false);
    expect(result.current.overview).toBeNull();
    expect(result.current.error).toBe("Network failed");
  });

  it("validates file before uploading and reports error if invalid", async () => {
    const onNotice = vi.fn();
    const uploadSpy = vi.spyOn(quizApi, "uploadQuestionImage");

    const { result } = renderHook(() =>
      useQuestionImages({ channelId: "ch-test", episodeId: "ep-test", onNotice }),
    );

    const invalidFile = new File(["dummy"], "file.txt", { type: "text/plain" });

    let success = false;
    await act(async () => {
      success = await result.current.uploadImage(2, invalidFile);
    });

    expect(success).toBe(false);
    expect(uploadSpy).not.toHaveBeenCalled();
    expect(onNotice).toHaveBeenCalledWith(
      expect.objectContaining({ tone: "bad" }),
    );
  });

  it("uploads valid image file and triggers optimistic update and notification", async () => {
    vi.spyOn(quizApi, "getQuestionImages").mockResolvedValue(mockOverview);
    const onNotice = vi.fn();
    const onUpdated = vi.fn();

    const uploadSpy = vi.spyOn(quizApi, "uploadQuestionImage").mockResolvedValue({
      success: true,
      item: {
        question_number: 2,
        question_id: "q2",
        question_text: "Which planet is known as the Red Planet?",
        asset_id: "q2_hero",
        status: "user_uploaded",
        source: "explicit_episode",
        image_url: "/api/channels/ch-test/episodes/ep-test/questions/2/image",
        prompt: "Mars red planet in space",
        aspect_ratio: "16:9",
        user_selected: true,
        filename: "mars_custom.png",
        slots: [],
      },
      invalidated: ["render"],
    });

    const { result } = renderHook(() =>
      useQuestionImages({
        channelId: "ch-test",
        episodeId: "ep-test",
        onNotice,
        onUpdated,
      }),
    );

    await act(async () => {});

    const validFile = new File(["fake-png-data"], "mars.png", { type: "image/png" });

    let success = false;
    await act(async () => {
      success = await result.current.uploadImage(2, validFile);
    });

    expect(success).toBe(true);
    expect(uploadSpy).toHaveBeenCalledWith(
      "ch-test",
      "ep-test",
      2,
      expect.stringContaining("data:image/png;base64,"),
      "mars.png",
    );
    expect(result.current.overview?.items.find((q) => q.question_number === 2)?.status).toBe("user_uploaded");
    expect(onNotice).toHaveBeenCalledWith(
      expect.objectContaining({ tone: "good", message: "Question #2 image uploaded successfully" }),
    );
    expect(onUpdated).toHaveBeenCalled();
  });

  it("resets custom image back to default", async () => {
    vi.spyOn(quizApi, "getQuestionImages").mockResolvedValue(mockOverview);
    const onNotice = vi.fn();
    const resetSpy = vi.spyOn(quizApi, "deleteCustomQuestionImage").mockResolvedValue({
      success: true,
      item: {
        question_number: 1,
        question_id: "q1",
        question_text: "What is the largest planet?",
        asset_id: "q1_hero",
        status: "missing",
        source: "none",
        image_url: null,
        prompt: "Jupiter planet in space",
        aspect_ratio: "16:9",
        user_selected: false,
        slots: [],
      },
      invalidated: ["render"],
    });

    const { result } = renderHook(() =>
      useQuestionImages({ channelId: "ch-test", episodeId: "ep-test", onNotice }),
    );

    await act(async () => {});

    let success = false;
    await act(async () => {
      success = await result.current.resetImage(1);
    });

    expect(success).toBe(true);
    expect(resetSpy).toHaveBeenCalledWith("ch-test", "ep-test", 1);
    expect(onNotice).toHaveBeenCalledWith(
      expect.objectContaining({ tone: "good", message: "Question #1 custom image removed" }),
    );
  });

  it("triggers AI generation for question image", async () => {
    const onNotice = vi.fn();
    const generateSpy = vi.spyOn(quizApi, "generateQuestionImage").mockResolvedValue({
      task: { task_id: "task-gen-1" } as never,
    });

    const { result } = renderHook(() =>
      useQuestionImages({ channelId: "ch-test", episodeId: "ep-test", onNotice }),
    );

    let success = false;
    await act(async () => {
      success = await result.current.generateImage(3);
    });

    expect(success).toBe(true);
    expect(generateSpy).toHaveBeenCalledWith("ch-test", "ep-test", 3, undefined);
    expect(onNotice).toHaveBeenCalledWith(
      expect.objectContaining({ tone: "good", message: "Generation task queued for Question #3" }),
    );
  });

  it("uploads targeted slot image and resets targeted slot image", async () => {
    vi.spyOn(quizApi, "getQuestionImages").mockResolvedValue(mockOverview);
    const onNotice = vi.fn();
    const uploadSpy = vi.spyOn(quizApi, "uploadQuestionImage").mockResolvedValue({
      success: true,
      item: {
        ...mockOverview.items[0],
        slots: [
          {
            slot_id: "c2",
            asset_id: "asset-q1-c2",
            label: "Choice B",
            purpose: "answer_option",
            aspect_ratio: "1:1",
            status: "user_uploaded",
            source: "explicit_episode",
            image_url: "/custom_c2.png",
            prompt: "Choice B",
            user_selected: true,
          },
        ],
      },
      invalidated: [],
    });
    const resetSpy = vi.spyOn(quizApi, "deleteCustomQuestionImage").mockResolvedValue({
      success: true,
      item: mockOverview.items[0],
      invalidated: [],
    });

    const { result } = renderHook(() =>
      useQuestionImages({ channelId: "ch-test", episodeId: "ep-test", onNotice }),
    );

    await act(async () => {});

    const file = new File(["dummy"], "slot_b.png", { type: "image/png" });
    let uploadSuccess = false;
    await act(async () => {
      uploadSuccess = await result.current.uploadImage(1, file, "c2");
    });

    expect(uploadSuccess).toBe(true);
    expect(uploadSpy).toHaveBeenCalledWith(
      "ch-test",
      "ep-test",
      1,
      expect.stringContaining("data:image/png;base64,"),
      "slot_b.png",
      "c2",
    );

    let resetSuccess = false;
    await act(async () => {
      resetSuccess = await result.current.resetImage(1, "c2");
    });

    expect(resetSuccess).toBe(true);
    expect(resetSpy).toHaveBeenCalledWith("ch-test", "ep-test", 1, "c2");
  });
});
