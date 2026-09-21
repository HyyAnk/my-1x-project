import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import type { MascotStateVariant } from "@studio/shared";
import { VariantSlotCard, type VariantSlotCardProps } from "./VariantSlotCard";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("VariantSlotCard Component - Stage 03 Download Actions", () => {
  const filledVariant: MascotStateVariant = {
    id: "slot_1",
    slot_index: 1,
    image_url: "/api/mascots/m1/assets/style_core_thinking_slot1_123.png",
    raw_image_url: "/api/mascots/m1/assets/style_core_thinking_slot1_raw_123.png",
    transparent_image_url: "/api/mascots/m1/assets/transparent/style_core_thinking_slot1_123.png",
    prompt_modifier: "deep in thought chin resting",
  };

  const defaultProps: VariantSlotCardProps = {
    state: "thinking",
    slotIndex: 1,
    variant: filledVariant,
    isBusy: false,
    isQueued: false,
    onGenerate: vi.fn(),
    onRegenerate: vi.fn(),
    onEditPrompt: vi.fn(),
  };

  it("renders dual download buttons with concise English labels and no trailing periods", () => {
    render(<VariantSlotCard {...defaultProps} />);

    const originalBtn = screen.getByRole("button", { name: "Download original image with background" });
    const transparentBtn = screen.getByRole("button", { name: "Download background-removed PNG" });

    expect(originalBtn).toBeDefined();
    expect(transparentBtn).toBeDefined();

    expect(originalBtn.textContent).toContain("Original PNG");
    expect(transparentBtn.textContent).toContain("Transparent PNG");

    // Must not have trailing periods in labels or titles
    expect(originalBtn.getAttribute("title")).not.toMatch(/\.$/);
    expect(transparentBtn.getAttribute("title")).not.toMatch(/\.$/);
  });

  it("triggers original download action when Original button is clicked", () => {
    const onDownloadOriginal = vi.fn();
    render(<VariantSlotCard {...defaultProps} onDownloadOriginal={onDownloadOriginal} />);

    const originalBtn = screen.getByRole("button", { name: "Download original image with background" });
    fireEvent.click(originalBtn);

    expect(onDownloadOriginal).toHaveBeenCalledTimes(1);
    expect(onDownloadOriginal).toHaveBeenCalledWith(filledVariant.raw_image_url);
  });

  it("triggers transparent download action when Transparent button is clicked", () => {
    const onDownloadTransparent = vi.fn();
    render(<VariantSlotCard {...defaultProps} onDownloadTransparent={onDownloadTransparent} />);

    const transparentBtn = screen.getByRole("button", { name: "Download background-removed PNG" });
    fireEvent.click(transparentBtn);

    expect(onDownloadTransparent).toHaveBeenCalledTimes(1);
    expect(onDownloadTransparent).toHaveBeenCalledWith(filledVariant.transparent_image_url);
  });

  it("derives transparent asset URL cleanly when transparent_image_url is not explicitly provided", () => {
    const variantWithoutExplicitUrls: MascotStateVariant = {
      id: "slot_2",
      slot_index: 2,
      image_url: "/api/mascots/m1/assets/style_core_thinking_slot2_456.png",
    };

    const onDownloadTransparent = vi.fn();
    render(
      <VariantSlotCard
        {...defaultProps}
        slotIndex={2}
        variant={variantWithoutExplicitUrls}
        onDownloadTransparent={onDownloadTransparent}
      />,
    );

    const transparentBtn = screen.getByRole("button", { name: "Download background-removed PNG" });
    fireEvent.click(transparentBtn);

    expect(onDownloadTransparent).toHaveBeenCalledWith("/api/mascots/m1/assets/transparent/style_core_thinking_slot2_456.png");
  });

  it("ensures download buttons are keyboard focusable with proper aria-labels", () => {
    render(<VariantSlotCard {...defaultProps} />);

    const originalBtn = screen.getByRole("button", { name: "Download original image with background" });
    const transparentBtn = screen.getByRole("button", { name: "Download background-removed PNG" });

    originalBtn.focus();
    expect(document.activeElement).toBe(originalBtn);

    transparentBtn.focus();
    expect(document.activeElement).toBe(transparentBtn);
  });

  it("does not render download buttons when slot is empty", () => {
    render(<VariantSlotCard {...defaultProps} variant={null} />);

    expect(screen.queryByRole("button", { name: "Download original image with background" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Download background-removed PNG" })).toBeNull();
  });

  it("strictly renders static image element in Step 2 Expressive Poses even if slot has animation data", () => {
    const videoVariant: MascotStateVariant = {
      id: "slot_2",
      slot_index: 2,
      image_url: "/api/mascots/m1/assets/style_core_thinking_slot2.png",
      status: "ready",
      animation: {
        version: 1,
        state: "thinking",
        slot_index: 2,
        transparent_video_url: "/api/mascots/m1/styles/core/animations/thinking/2/artifacts/video_transparent.webm",
        alpha_codec: "vp9_alpha",
        manifest_url: "/api/mascots/m1/styles/core/animations/thinking/2/artifacts/manifest.json",
        frame_count: 192,
        fps: 24,
        duration_ms: 8000,
        loop: true,
        loop_policy: "loop",
        registration: {
          source_width: 1280,
          source_height: 720,
          content_bounds: { x: 251, y: 6, width: 783, height: 714 },
          pivot: { x: 643, y: 719 },
          offset_x: 0,
          offset_y: 0,
        },
        source_fingerprint: "sf_video_2",
        content_fingerprint: "cf_video_2",
      },
    };

    render(<VariantSlotCard {...defaultProps} slotIndex={2} variant={videoVariant} />);

    const imgEl = screen.getByRole("img") as HTMLImageElement;
    expect(imgEl).toBeDefined();
    expect(imgEl.getAttribute("src")).toBe("/api/mascots/m1/assets/style_core_thinking_slot2.png");
    expect(screen.queryByTestId("slot-video-thinking-2")).toBeNull();
  });

  it("displays clean empty placeholder 'No variant generated' for unassigned slots without media", () => {
    render(<VariantSlotCard {...defaultProps} slotIndex={5} variant={null} />);

    expect(screen.getByText("No variant generated")).toBeDefined();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("renders selection checkbox when slot is filled and onToggleSelect is provided", () => {
    const onToggleSelect = vi.fn();
    render(<VariantSlotCard {...defaultProps} isSelected={false} onToggleSelect={onToggleSelect} />);

    const checkbox = screen.getByRole("checkbox", { name: "Select thinking slot 1" });
    expect(checkbox).toBeDefined();
    expect(checkbox).toHaveProperty("checked", false);

    fireEvent.click(checkbox);
    expect(onToggleSelect).toHaveBeenCalledTimes(1);
    expect(onToggleSelect).toHaveBeenCalledWith(1, true);
  });

  it("applies is-selected CSS class to the card when isSelected is true", () => {
    const { container } = render(<VariantSlotCard {...defaultProps} isSelected={true} onToggleSelect={vi.fn()} />);

    const card = container.querySelector(".variant-slot-card");
    expect(card?.classList.contains("is-selected")).toBe(true);
  });

  it("disables selection checkbox when slot is busy or queued", () => {
    render(<VariantSlotCard {...defaultProps} isBusy={true} isSelected={false} onToggleSelect={vi.fn()} />);

    const checkbox = screen.getByRole("checkbox", { name: "Select thinking slot 1" });
    expect(checkbox).toHaveProperty("disabled", true);
  });

  it("renders a selection checkbox for an empty slot so it can be queued with other slots", () => {
    const onToggleSelect = vi.fn();
    render(<VariantSlotCard {...defaultProps} variant={null} onToggleSelect={onToggleSelect} />);

    const checkbox = screen.getByRole("checkbox", { name: "Select thinking slot 1" });
    fireEvent.click(checkbox);

    expect(onToggleSelect).toHaveBeenCalledWith(1, true);
  });
});
