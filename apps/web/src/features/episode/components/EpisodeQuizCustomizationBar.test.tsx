import type React from "react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { LanguageProvider } from "../../../i18n";
import { EpisodeQuizCustomizationBar } from "./EpisodeQuizCustomizationBar";
import type { Channel, Episode, QuizV2 } from "@studio/shared";

const wrapper = ({ children }: { children: React.ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;

const mockChannel: Channel = {
  id: "test-channel",
  name: "Test Channel",
  language: "en",
  status: "active",
  topic: "Trivia",
} as unknown as Channel;

const mockEpisode: Episode = {
  id: "ep-1",
  channelId: "test-channel",
  title: "Test Episode",
  status: "draft",
} as unknown as Episode;

const mockQuiz: QuizV2 = {
  schemaVersion: "2.0.0",
  questions: [],
} as unknown as QuizV2;

describe("EpisodeQuizCustomizationBar", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders all three customization sections cleanly", () => {
    render(
      <EpisodeQuizCustomizationBar
        channel={mockChannel}
        episode={mockEpisode}
        quiz={mockQuiz}
        directorPlan={null}
        activeEpisodeTask={null}
        busy={null}
        questionCountDraft={5}
        setQuestionCountDraft={vi.fn()}
        onSaveQuestionCount={vi.fn()}
        onSaveVisualStyle={vi.fn()}
        onSaveThinkingBarStyle={vi.fn()}
        onSaveQuestionBoxStyle={vi.fn()}
        onSaveAnswerCardStyle={vi.fn()}
        onSaveCounterStyle={vi.fn()}
        onSaveBackgroundStyle={vi.fn()}
        onSavePaletteId={vi.fn()}
        onApplyStylePreset={vi.fn()}
      />,
      { wrapper },
    );

    // Header title
    expect(screen.getByText("Production Customization")).toBeDefined();

    // Section group headers
    expect(screen.getByText("Content & Channel")).toBeDefined();
    expect(screen.getByText("Visual Theme")).toBeDefined();
    expect(screen.getByText("Component Details")).toBeDefined();
  });

  it("handles dropdown toggle interactions", () => {
    render(
      <EpisodeQuizCustomizationBar
        channel={mockChannel}
        episode={mockEpisode}
        quiz={mockQuiz}
        directorPlan={null}
        activeEpisodeTask={null}
        busy={null}
        questionCountDraft={5}
        setQuestionCountDraft={vi.fn()}
        onSaveQuestionCount={vi.fn()}
        onSaveVisualStyle={vi.fn()}
        onSaveThinkingBarStyle={vi.fn()}
        onSaveQuestionBoxStyle={vi.fn()}
        onSaveAnswerCardStyle={vi.fn()}
        onSaveCounterStyle={vi.fn()}
        onSaveBackgroundStyle={vi.fn()}
        onSavePaletteId={vi.fn()}
        onApplyStylePreset={vi.fn()}
      />,
      { wrapper },
    );

    const videoFormatBtn = screen.getByRole("button", { name: /Video Format/i });
    expect(videoFormatBtn).toBeDefined();

    fireEvent.click(videoFormatBtn);
    expect(videoFormatBtn.getAttribute("aria-expanded")).toBe("true");
  });
});
