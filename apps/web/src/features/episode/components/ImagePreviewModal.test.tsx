import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ImagePreviewModal } from "./ImagePreviewModal";
import type { PreviewImageData } from "../types";

describe("ImagePreviewModal", () => {
  afterEach(() => {
    cleanup();
  });
  const sampleImage: PreviewImageData = {
    url: "/sample.png",
    filename: "sample.png",
    bundleId: "Q#1 [Choice A]",
    title: "Choice A: Jupiter",
    subtitle: "What is the largest planet?",
    prompt: "A detailed view of Jupiter",
    aspectRatio: "1:1",
    counter: "Choice 1 of 3",
    priceVnd: 500,
    model: "imagen-3",
  };

  it("renders image metadata including slot badges and subtitle", () => {
    const onClose = vi.fn();
    render(<ImagePreviewModal image={sampleImage} onClose={onClose} />);

    expect(screen.getByText("Q#1 [Choice A]")).toBeDefined();
    expect(screen.getByText("Choice A: Jupiter")).toBeDefined();
    expect(screen.getByText("What is the largest planet?")).toBeDefined();
    expect(screen.getByText("A detailed view of Jupiter")).toBeDefined();
    expect(screen.getByText("Choice 1 of 3")).toBeDefined();
    expect(screen.getByText("1:1")).toBeDefined();
    expect(screen.getByText("imagen-3")).toBeDefined();
  });

  it("closes on Close button click and Escape key", () => {
    const onClose = vi.fn();
    const { unmount } = render(<ImagePreviewModal image={sampleImage} onClose={onClose} />);

    const closeBtn = screen.getByRole("button", { name: "Close" });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);

    unmount();
  });

  it("supports next and previous navigation clicks and keyboard shortcuts", () => {
    const onNext = vi.fn();
    const onPrevious = vi.fn();

    render(
      <ImagePreviewModal
        image={sampleImage}
        onClose={vi.fn()}
        onNext={onNext}
        onPrevious={onPrevious}
        hasNext={true}
        hasPrevious={true}
      />,
    );

    const prevBtn = screen.getByRole("button", { name: "Previous image" });
    const nextBtn = screen.getByRole("button", { name: "Next image" });

    fireEvent.click(prevBtn);
    expect(onPrevious).toHaveBeenCalledTimes(1);

    fireEvent.click(nextBtn);
    expect(onNext).toHaveBeenCalledTimes(1);

    // Keyboard arrow keys
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(onPrevious).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(onNext).toHaveBeenCalledTimes(2);
  });

  it("disables nav buttons and ignores keyboard arrows when hasNext/hasPrevious are false", () => {
    const onNext = vi.fn();
    const onPrevious = vi.fn();

    render(
      <ImagePreviewModal
        image={sampleImage}
        onClose={vi.fn()}
        onNext={onNext}
        onPrevious={onPrevious}
        hasNext={false}
        hasPrevious={false}
      />,
    );

    const prevBtn = screen.getByRole("button", { name: "Previous image" }) as HTMLButtonElement;
    const nextBtn = screen.getByRole("button", { name: "Next image" }) as HTMLButtonElement;

    expect(prevBtn.disabled).toBe(true);
    expect(nextBtn.disabled).toBe(true);

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(onPrevious).not.toHaveBeenCalled();

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(onNext).not.toHaveBeenCalled();
  });
});
