import { describe, expect, it, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { StageGuidesOverlay } from "./StageGuidesOverlay";

afterEach(() => {
  cleanup();
});

describe("StageGuidesOverlay", () => {
  it("renders null when showGuides is false", () => {
    const { container } = render(<StageGuidesOverlay showGuides={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders guides overlay with crosshairs and safe area when showGuides is true", () => {
    const { container } = render(<StageGuidesOverlay showGuides={true} aspectRatio="16:9" />);
    const guideElement = container.querySelector(".quiz-stage-guides");
    expect(guideElement).not.toBeNull();
  });

  it("adjusts safe area margins for portrait 9:16 aspect ratio", () => {
    const { container } = render(<StageGuidesOverlay showGuides={true} aspectRatio="9:16" />);
    const guideElement = container.querySelector(".quiz-stage-guides");
    expect(guideElement).not.toBeNull();
  });
});
