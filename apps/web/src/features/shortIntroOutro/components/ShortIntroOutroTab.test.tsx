import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Channel, QuizShortBookendPair } from "@studio/shared";
import { quizShortBookendApi } from "../../../api/quizShortBookendApi";
import { ShortIntroOutroTab } from "./ShortIntroOutroTab";

vi.mock("../../../api/quizShortBookendApi", () => ({
  quizShortBookendApi: {
    listPairs: vi.fn(),
    listCategories: vi.fn(),
    createPair: vi.fn(),
    updatePair: vi.fn(),
    deletePair: vi.fn(),
    clipUrl: (channelId: string, pairId: string, kind: string) => `/clips/${channelId}/${pairId}/${kind}`,
    thumbUrl: (channelId: string, pairId: string, kind: string) => `/thumbs/${channelId}/${pairId}/${kind}`,
  },
}));

const channel = { channel_id: "ch_1" } as Channel;
const clip = { filename: "intro.mp4", duration_seconds: 10, width: 1080, height: 1920, fps: 24, has_audio: false } as const;
const pair: QuizShortBookendPair = {
  schema_version: 1,
  pair_id: "spair_12345678",
  channel_id: "ch_1",
  style_preset_id: "preset_arcade_classic",
  name: "001",
  status: "active",
  intro: { ...clip, thumbnail_filename: "intro_thumb.jpg" },
  outro: { ...clip, filename: "outro.mp4", duration_seconds: 6 },
  title_canvas: { x: 110, y: 280, width: 860, height: 900 },
  transition_type: "stinger_swipe",
  transition_duration_seconds: 0.5,
  created_at: "2026-10-11T00:00:00.000Z",
  updated_at: "2026-10-11T00:00:00.000Z",
};

beforeEach(() => {
  vi.mocked(quizShortBookendApi.listPairs).mockResolvedValue({ pairs: [pair] });
  vi.mocked(quizShortBookendApi.listCategories).mockResolvedValue({
    categories: [{ style_preset_id: "preset_arcade_classic", name: "Arcade Classic", icon: "", total_count: 1, ready_count: 1 }],
  });
  vi.mocked(quizShortBookendApi.deletePair).mockResolvedValue({ ok: true });
  vi.mocked(quizShortBookendApi.updatePair).mockResolvedValue({ pair: { ...pair, title_canvas: { ...pair.title_canvas, y: 300 } } });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

async function openArcade() {
  render(<ShortIntroOutroTab channel={channel} onNotice={vi.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: /Arcade Classic/ }));
}

describe("ShortIntroOutroTab", () => {
  it("lists built-in styles and opens one with the upload card and its pairs", async () => {
    await openArcade();
    expect(screen.getByRole("heading", { name: "Arcade Classic" })).toBeTruthy();
    expect(screen.getByRole("article", { name: "New Short pair" })).toBeTruthy();
    expect(screen.getByLabelText("Intro loop")).toBeTruthy();
    expect(screen.getByRole("article", { name: "Short pair 001" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Upload Pair" }).hasAttribute("disabled")).toBe(true);
  });

  it("previews a clip and deletes a pair", async () => {
    await openArcade();
    fireEvent.click(screen.getByRole("button", { name: "Preview outro of pair 001" }));
    expect(screen.getByRole("heading", { name: "Pair 001 · Outro" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close preview" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete pair 001" }));
    await waitFor(() => expect(quizShortBookendApi.deletePair).toHaveBeenCalledWith("ch_1", "spair_12345678"));
  });

  it("validates and saves the title area", async () => {
    await openArcade();
    fireEvent.click(screen.getByRole("button", { name: "Edit title area of pair 001" }));
    fireEvent.change(screen.getByLabelText("Width"), { target: { value: "1000" } });
    expect(screen.getByRole("alert").textContent).toContain("Left + Width");
    fireEvent.change(screen.getByLabelText("Width"), { target: { value: "860" } });
    fireEvent.change(screen.getByLabelText("Top"), { target: { value: "300" } });
    fireEvent.click(screen.getByRole("button", { name: "Save title area" }));
    await waitFor(() =>
      expect(quizShortBookendApi.updatePair).toHaveBeenCalledWith("ch_1", "spair_12345678", {
        title_canvas: { x: 110, y: 300, width: 860, height: 900 },
      }),
    );
  });
});
