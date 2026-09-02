import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act, render, fireEvent, screen } from "@testing-library/react";
import type { Channel, Episode, VideoDescription } from "@studio/shared";
import { quizApi } from "../../../api/quizApi";
import { useVideoDescription } from "./useVideoDescription";
import { VideoDescriptionCard } from "../components/VideoDescriptionCard";

const sampleDescription: VideoDescription = {
  topic_category: "World Geography",
  primary_keyword: "world geography quiz",
  keyword_variations: ["capital city trivia", "geography test"],
  question_count: 5,
  hook_lines: "World Geography Quiz!\n5 challenging questions to test your knowledge.",
  semantic_paragraph: "Explore magnificent capitals and breathtaking global landmarks in this episode.",
  scoring_cta: {
    beginner: "1 correct: Beginner",
    intermediate: "2–3 correct: Explorer",
    expert: "4–5 correct: Geography Master",
    cta_text: "How many did you get right?",
  },
  suggested_playlist_category: "World Geography",
  hashtags: ["#quiz", "#geography", "#trivia"],
  full_description_text: "World Geography Quiz!\n5 challenging questions to test your knowledge.\n\n🏆 SCORING TIERS:\n• 1 correct: Beginner\n• 4–5 correct: Master\n\n#quiz #geography #trivia",
  char_count: 140,
  language: "English",
  generated_at: "2026-08-30T00:00:00.000Z",
};

const sampleChannel = {
  channel_id: "ch-1",
  display_name: "Geography TV",
  language: "English",
} as Channel;

const sampleEpisode = {
  episode_id: "ep-1",
  channel_id: "ch-1",
  topic: { title: "World Capitals", hook: "How many capitals do you know?", premise: "Trivia" },
} as Episode;

describe("useVideoDescription and VideoDescriptionCard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes with provided description or fetches existing artifact", async () => {
    vi.spyOn(quizApi, "getVideoDescription").mockResolvedValue({ description: sampleDescription });

    const { result } = renderHook(() =>
      useVideoDescription({
        channelId: "ch-1",
        episodeId: "ep-1",
        hasQuiz: true,
        initialDescription: sampleDescription,
      }),
    );

    expect(result.current.description).toEqual(sampleDescription);
    expect(result.current.draftText).toBe(sampleDescription.full_description_text);
    expect(result.current.charCount).toBe(sampleDescription.full_description_text.length);
    expect(result.current.isOverLimit).toBe(false);
    expect(result.current.canGenerate).toBe(true);
    expect(result.current.hasDescription).toBe(true);
  });

  it("prevents generation when hasQuiz is false", async () => {
    const onNotice = vi.fn();
    const { result } = renderHook(() =>
      useVideoDescription({
        channelId: "ch-1",
        episodeId: "ep-1",
        hasQuiz: false,
        onNotice,
      }),
    );

    expect(result.current.canGenerate).toBe(false);
    expect(result.current.hasQuiz).toBe(false);

    await act(async () => {
      await result.current.generate();
    });

    expect(onNotice).toHaveBeenCalledWith({ tone: "bad", message: "Question script must be generated before video description" });
  });

  it("handles generation with AI and updates description state", async () => {
    vi.spyOn(quizApi, "getVideoDescription").mockResolvedValue({ description: null });
    vi.spyOn(quizApi, "generateVideoDescription").mockResolvedValue({
      description: sampleDescription,
      artifact_path: "video-description.json",
    });

    const onNotice = vi.fn();
    const { result } = renderHook(() =>
      useVideoDescription({
        channelId: "ch-1",
        episodeId: "ep-1",
        hasQuiz: true,
        onNotice,
      }),
    );

    await act(async () => {
      await result.current.generate("Witty and fun");
    });

    expect(result.current.description).toEqual(sampleDescription);
    expect(onNotice).toHaveBeenCalledWith({ tone: "good", message: "SEO video description generated successfully" });
  });

  it("handles saving modified text", async () => {
    const updatedDesc = { ...sampleDescription, full_description_text: "Updated new description text" };
    vi.spyOn(quizApi, "saveVideoDescription").mockResolvedValue({
      description: updatedDesc,
      artifact_path: "video-description.json",
    });

    const onNotice = vi.fn();
    const { result } = renderHook(() =>
      useVideoDescription({
        channelId: "ch-1",
        episodeId: "ep-1",
        initialDescription: sampleDescription,
        onNotice,
      }),
    );

    act(() => {
      result.current.setDraftText("Updated new description text");
    });
    expect(result.current.isModified).toBe(true);

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.description?.full_description_text).toBe("Updated new description text");
    expect(onNotice).toHaveBeenCalledWith({ tone: "good", message: "Video description saved" });
  });

  it("renders VideoDescriptionCard with open layout and tabs", async () => {
    vi.spyOn(quizApi, "getVideoDescription").mockResolvedValue({ description: sampleDescription });

    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    const { container } = render(
      <VideoDescriptionCard
        channel={sampleChannel}
        episode={sampleEpisode}
        episodeId="ep-1"
        hasQuiz={true}
        initialDescription={sampleDescription}
      />,
    );

    expect(screen.getByText("Video Description & SEO")).toBeDefined();
    expect(screen.getByText("World Geography")).toBeDefined();
    expect(screen.getByText("3 tags")).toBeDefined();
    expect(screen.getByText("Copy Description")).toBeDefined();

    // 1-Click Copy
    fireEvent.click(screen.getByText("Copy Description"));
    expect(navigator.clipboard.writeText).toHaveBeenCalled();

    // Tabs are visible directly
    expect(screen.getByText("📱 YouTube Preview")).toBeDefined();
    expect(screen.getByText("🧩 Content Blocks")).toBeDefined();
    expect(screen.getByText("📝 Raw Editor")).toBeDefined();

    // Switch to Content Blocks tab
    fireEvent.click(screen.getByText("🧩 Content Blocks"));
    expect(screen.getByText("Hook & SEO Context")).toBeDefined();
    expect(screen.getByText("Scoring Leaderboard")).toBeDefined();

    // Switch to Raw Editor tab
    fireEvent.click(screen.getByText("📝 Raw Editor"));
    const textarea = container.querySelector("textarea");
    expect(textarea).toBeDefined();
    expect(textarea?.value).toContain("World Geography Quiz!");
  });
});
