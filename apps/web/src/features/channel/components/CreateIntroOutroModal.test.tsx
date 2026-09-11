import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CreateIntroOutroModal } from "./CreateIntroOutroModal";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("CreateIntroOutroModal", () => {
  it("does not render when isOpen is false", () => {
    const { container } = render(<CreateIntroOutroModal isOpen={false} onClose={vi.fn()} onSubmit={vi.fn()} submitting={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders accessible modal with title, format specs, and dual dropzones when open", () => {
    render(<CreateIntroOutroModal isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} submitting={false} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeDefined();
    expect(screen.getByText("Add Intro & Outro Style")).toBeDefined();
    expect(screen.getByText("1080p FHD")).toBeDefined();
    expect(screen.getAllByText("Intro Sequence").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Outro Sequence").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Opening Clip")).toBeDefined();
    expect(screen.getByText("Ending / CTA")).toBeDefined();
  });

  it("populates Style Name when clicking suggestion chips", () => {
    render(<CreateIntroOutroModal isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} submitting={false} />);

    const input = screen.getByLabelText("Style Name") as HTMLInputElement;
    expect(input.value).toBe("");

    const chip = screen.getByRole("button", { name: "Mascot 3D Showcase" });
    fireEvent.click(chip);

    expect(input.value).toBe("Mascot 3D Showcase");
  });

  it("allows selecting transition type and toggling audio mode", () => {
    render(<CreateIntroOutroModal isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} submitting={false} />);

    // Click dropdown trigger to open options menu
    const dropdownTrigger = screen.getByRole("combobox", { name: /Transition into Question 1/i });
    fireEvent.click(dropdownTrigger);

    const crossfadeOption = screen.getByRole("option", { name: /Fade to Black/i });
    fireEvent.click(crossfadeOption);
    expect(screen.getAllByText("Fade to Black").length).toBeGreaterThanOrEqual(1);

    const muteBtn = screen.getByRole("button", { name: /Mute Clip Audio/i });
    fireEvent.click(muteBtn);
    expect(muteBtn.classList.contains("is-active")).toBe(true);

    fireEvent.click(dropdownTrigger);
    const cutOption = screen.getByRole("option", { name: /Direct Cut/i });
    fireEvent.click(cutOption);
    expect(screen.getByText(/Instant snap \(0\.0s\)/i)).toBeDefined();
  });

  it("keeps submit button disabled until valid videos and name are provided", () => {
    render(<CreateIntroOutroModal isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} submitting={false} />);

    const submitBtn = screen.getByRole("button", { name: /Save Style Pair/i });
    expect(submitBtn.hasAttribute("disabled")).toBe(true);

    fireEvent.change(screen.getByLabelText("Style Name"), {
      target: { value: "Epic Opening" },
    });

    // Still disabled because videos are not uploaded yet
    expect(submitBtn.hasAttribute("disabled")).toBe(true);
  });

  it("renders in-place transition preview player with default state", () => {
    render(<CreateIntroOutroModal isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} submitting={false} />);

    expect(screen.getByTestId("modal-transition-preview-section")).toBeDefined();
    expect(screen.getByTestId("transition-preview-player")).toBeDefined();
    expect(screen.getByTestId("transition-preview-viewport")).toBeDefined();
    expect(screen.getByText("Transition Preview")).toBeDefined();

    // Default is stinger_swipe with 0.5s duration
    expect(screen.getAllByText(/0\.5s/i).length).toBeGreaterThanOrEqual(1);
  });

  it("updates preview player props when changing transition type and duration", () => {
    render(<CreateIntroOutroModal isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} submitting={false} />);

    const dropdownTrigger = screen.getByRole("combobox", { name: /Transition into Question 1/i });
    fireEvent.click(dropdownTrigger);

    const crossfadeOption = screen.getByRole("option", { name: /Fade to Black/i });
    fireEvent.click(crossfadeOption);

    // Player renders updated transition
    expect(screen.getByTestId("transition-preview-player")).toBeDefined();

    // Click 0.8s duration preset
    const duration08 = screen.getByRole("button", { name: /0\.8s/i });
    fireEvent.click(duration08);

    expect(screen.getAllByText(/0\.8s/i).length).toBeGreaterThanOrEqual(1);

    // Change to Direct Cut
    fireEvent.click(dropdownTrigger);
    const cutOption = screen.getByRole("option", { name: /Direct Cut/i });
    fireEvent.click(cutOption);

    expect(screen.getByTestId("transition-preview-player")).toBeDefined();
  });

  it("triggers playback when clicking preview in transition dropdown", () => {
    render(<CreateIntroOutroModal isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} submitting={false} />);

    const playPauseBtn = screen.getByTestId("transition-play-pause-btn");
    expect(playPauseBtn.getAttribute("aria-label")).toBe("Play transition");

    // Click Preview button in dropdown trigger
    const previewBtn = screen.getByRole("button", { name: /Preview current transition/i });
    fireEvent.click(previewBtn);

    // Playback should now be actively running
    expect(playPauseBtn.getAttribute("aria-label")).toBe("Pause transition");
  });

  it("supports toggling preview visibility and re-opening when preview button is clicked", () => {
    render(<CreateIntroOutroModal isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} submitting={false} />);

    expect(screen.getByTestId("transition-preview-player")).toBeDefined();

    // Click hide button
    const hideBtn = screen.getByTestId("modal-transition-toggle-btn");
    fireEvent.click(hideBtn);

    expect(screen.queryByTestId("transition-preview-player")).toBeNull();

    // Click show button
    const showBtn = screen.getByTestId("modal-transition-toggle-btn");
    fireEvent.click(showBtn);

    expect(screen.getByTestId("transition-preview-player")).toBeDefined();

    // Hide again, then click dropdown trigger preview to re-open and play
    fireEvent.click(screen.getByTestId("modal-transition-toggle-btn"));
    expect(screen.queryByTestId("transition-preview-player")).toBeNull();

    const previewBtn = screen.getByRole("button", { name: /Preview current transition/i });
    fireEvent.click(previewBtn);

    expect(screen.getByTestId("transition-preview-player")).toBeDefined();
    expect(screen.getByTestId("transition-play-pause-btn").getAttribute("aria-label")).toBe("Pause transition");
  });

  it("replays transition when clicking mini preview Replay button", () => {
    render(<CreateIntroOutroModal isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} submitting={false} />);

    const replayBtn = screen.getByTestId("modal-transition-replay-btn");
    fireEvent.click(replayBtn);

    const playPauseBtn = screen.getByTestId("transition-play-pause-btn");
    expect(playPauseBtn.getAttribute("aria-label")).toBe("Pause transition");
  });

  it("applies custom brand theme colors to preview player viewport", () => {
    render(
      <CreateIntroOutroModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        submitting={false}
        themeColors={{ from: "#10B981", to: "#3B82F6" }}
      />,
    );

    const viewport = screen.getByTestId("transition-preview-viewport");
    expect(viewport.style.getPropertyValue("--from")).toBe("#10B981");
    expect(viewport.style.getPropertyValue("--to")).toBe("#3B82F6");
  });
});
