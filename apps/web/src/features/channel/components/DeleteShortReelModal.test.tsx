import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { createMockChannel, createMockShortReel } from "../../../../test/helpers/shortReelFixture";
import { DeleteShortReelModal } from "./DeleteShortReelModal";
import { api } from "../../../api";

vi.mock("../../../api", () => ({
  api: {
    deleteShortReel: vi.fn(),
  },
}));

describe("DeleteShortReelModal Component", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders dialog with reel title and action buttons", () => {
    const channel = createMockChannel();
    const reel = createMockShortReel();

    render(<DeleteShortReelModal channel={channel} reel={reel} onClose={vi.fn()} onDeleted={vi.fn()} onError={vi.fn()} />);

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Delete Short-Reel" })).toBeTruthy();
    expect(screen.getByText(new RegExp(reel.topic.title, "i"))).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Delete Short-Reel" })).toBeTruthy();
  });

  it("calls onClose when Cancel button is clicked", () => {
    const channel = createMockChannel();
    const reel = createMockShortReel();
    const onClose = vi.fn();

    render(<DeleteShortReelModal channel={channel} reel={reel} onClose={onClose} onDeleted={vi.fn()} onError={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("successfully deletes short-reel on confirmation", async () => {
    const channel = createMockChannel();
    const reel = createMockShortReel();
    const onDeleted = vi.fn().mockResolvedValue(undefined);
    vi.mocked(api.deleteShortReel).mockResolvedValueOnce({ success: true });

    render(<DeleteShortReelModal channel={channel} reel={reel} onClose={vi.fn()} onDeleted={onDeleted} onError={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete Short-Reel" }));

    await waitFor(() => {
      expect(api.deleteShortReel).toHaveBeenCalledWith(channel.channel_id, reel.reel_id);
      expect(onDeleted).toHaveBeenCalledWith(reel);
    });
  });

  it("displays error message and calls onError if deletion fails", async () => {
    const channel = createMockChannel();
    const reel = createMockShortReel();
    const onError = vi.fn();
    vi.mocked(api.deleteShortReel).mockRejectedValueOnce(new Error("Server delete error"));

    render(<DeleteShortReelModal channel={channel} reel={reel} onClose={vi.fn()} onDeleted={vi.fn()} onError={onError} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete Short-Reel" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeTruthy();
      expect(screen.getByText("Server delete error")).toBeTruthy();
      expect(onError).toHaveBeenCalled();
    });
  });
});
