import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import type { BankQuestionWithCooldown } from "@studio/shared";
import { createMockChannel, createMockShortReel } from "../../../../test/helpers/shortReelFixture";
import { CreateShortReelModal } from "./CreateShortReelModal";
import { api } from "../../../api";

vi.mock("../../../api", () => ({
  api: {
    getChannelQuestionBankQuestions: vi.fn(),
    createShortReel: vi.fn(),
  },
}));

const mockQuestions: BankQuestionWithCooldown[] = [
  {
    id: "q-versus-1",
    archetype_id: "versus_faceoff",
    domain_id: "science",
    subtopic_id: "physics",
    language: "English",
    question: "Which moves faster: Light or Sound?",
    format: "multiple_choice",
    choices: [
      { id: "A", text: "Light", is_correct: true },
      { id: "B", text: "Sound", is_correct: false },
    ],
    correct_choice_id: "A",
    explanation: "Light travels much faster than sound in air.",
    fun_fact: "Light travels at 300,000 km/s.",
    difficulty: 3,
    tags: ["science"],
    age_band: "family",
    status: "approved",
    channel_cooldown: { is_cooldown: false, days_remaining: 0 },
  },
  {
    id: "q-trivia-1",
    archetype_id: "deep_trivia",
    domain_id: "history",
    subtopic_id: "ancient",
    language: "English",
    question: "What ancient wonder was located in Alexandria?",
    format: "multiple_choice",
    choices: [
      { id: "A", text: "The Lighthouse", is_correct: true },
      { id: "B", text: "Colossus", is_correct: false },
    ],
    correct_choice_id: "A",
    explanation: "The Pharos of Alexandria was a famous lighthouse.",
    fun_fact: "It was over 100 meters tall.",
    difficulty: 3,
    tags: ["history"],
    age_band: "family",
    status: "approved",
    channel_cooldown: { is_cooldown: false, days_remaining: 0 },
  },
];

describe("CreateShortReelModal Component", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders loading state then displays approved questions", async () => {
    const channel = createMockChannel();
    vi.mocked(api.getChannelQuestionBankQuestions).mockResolvedValueOnce({
      channel_id: channel.channel_id,
      questions: mockQuestions,
      total: 2,
    });

    render(<CreateShortReelModal channel={channel} onClose={vi.fn()} onCreated={vi.fn()} />);

    expect(screen.getByTestId("short-reel-loading")).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText("Which moves faster: Light or Sound?")).toBeTruthy();
      expect(screen.getByText("What ancient wonder was located in Alexandria?")).toBeTruthy();
    });
  });

  it("filters questions based on search query", async () => {
    const channel = createMockChannel();
    vi.mocked(api.getChannelQuestionBankQuestions).mockResolvedValueOnce({
      channel_id: channel.channel_id,
      questions: mockQuestions,
      total: 2,
    });

    render(<CreateShortReelModal channel={channel} onClose={vi.fn()} onCreated={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Which moves faster: Light or Sound?")).toBeTruthy();
    });

    const searchInput = screen.getByLabelText("Search questions");
    fireEvent.change(searchInput, { target: { value: "Alexandria" } });

    expect(screen.queryByText("Which moves faster: Light or Sound?")).toBeNull();
    expect(screen.getByText("What ancient wonder was located in Alexandria?")).toBeTruthy();
  });

  it("filters questions by archetype pill", async () => {
    const channel = createMockChannel();
    vi.mocked(api.getChannelQuestionBankQuestions).mockResolvedValueOnce({
      channel_id: channel.channel_id,
      questions: mockQuestions,
      total: 2,
    });

    render(<CreateShortReelModal channel={channel} onClose={vi.fn()} onCreated={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Which moves faster: Light or Sound?")).toBeTruthy();
    });

    const versusPill = screen.getByRole("radio", { name: "Versus Faceoff" });
    fireEvent.click(versusPill);

    expect(screen.getByText("Which moves faster: Light or Sound?")).toBeTruthy();
    expect(screen.queryByText("What ancient wonder was located in Alexandria?")).toBeNull();
  });

  it("selects a question and creates Short-Reel upon submit", async () => {
    const channel = createMockChannel();
    const createdReel = createMockShortReel();
    const onCreated = vi.fn();

    vi.mocked(api.getChannelQuestionBankQuestions).mockResolvedValueOnce({
      channel_id: channel.channel_id,
      questions: mockQuestions,
      total: 2,
    });
    vi.mocked(api.createShortReel).mockResolvedValueOnce({
      short_reel: createdReel,
    });

    render(<CreateShortReelModal channel={channel} onClose={vi.fn()} onCreated={onCreated} />);

    await waitFor(() => {
      expect(screen.getByText("Which moves faster: Light or Sound?")).toBeTruthy();
    });

    const submitBtn = screen.getByTestId("create-short-reel-submit-btn");
    expect(submitBtn.hasAttribute("disabled")).toBe(true);

    const questionCard = screen.getByTestId("question-card-q-versus-1");
    fireEvent.click(questionCard);

    expect(submitBtn.hasAttribute("disabled")).toBe(false);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.createShortReel).toHaveBeenCalledWith(channel.channel_id, {
        question_id: "q-versus-1",
        visual_style: "mixed",
      });
      expect(onCreated).toHaveBeenCalledWith(createdReel);
    });
  });
});
