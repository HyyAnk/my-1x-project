import { describe, expect, it, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { QuizStagePlacementPreview } from "./QuizStagePlacementPreview";
import { MASCOT_DEFAULT_PLACEMENT, type MascotAnimationAssetV1, type MascotPublishedAnimationAsset } from "@studio/shared";

afterEach(() => {
  cleanup();
});

function createMockAnimation(): MascotAnimationAssetV1 {
  return {
    version: 1,
    state: "thinking",
    atlas_url: "https://example.com/atlas.png",
    manifest_url: "https://example.com/manifest.json",
    frame_count: 12,
    fps: 8,
    loop: true,
    loop_policy: "loop",
    frames: Array.from({ length: 12 }, (_, i) => ({
      index: i,
      x: (i % 4) * 200,
      y: Math.floor(i / 4) * 150,
      width: 200,
      height: 150,
      duration_ms: 125,
    })),
    registration: {
      source_width: 800,
      source_height: 450,
      content_bounds: { x: 50, y: 50, width: 700, height: 350 },
      pivot: { x: 400, y: 450 },
      offset_x: 0,
      offset_y: 0,
    },
    content_fingerprint: "test-content-fp",
    source_fingerprint: "test-source-fp",
    slot_index: 1,
    recipe_id: "recipe-1",
  };
}

describe("QuizStagePlacementPreview", () => {
  it("renders 16:9 quiz stage viewport and bottom-left placement container", () => {
    const animation = createMockAnimation();
    render(<QuizStagePlacementPreview animation={animation} timeSeconds={0} placement={MASCOT_DEFAULT_PLACEMENT} />);

    const viewport = screen.getByTestId("quiz-stage-preview");
    expect(viewport).toBeTruthy();
    expect(viewport.style.aspectRatio).toBe("16 / 9");

    const placementContainer = screen.getByTestId("mascot-placement-container");
    expect(placementContainer).toBeTruthy();
    expect(placementContainer.className).toContain("anchor-bottom_left");
    expect(placementContainer.getAttribute("data-anchor")).toBe("bottom_left");
    expect(placementContainer.getAttribute("data-scale")).toBe("1");
    expect(placementContainer.getAttribute("data-offset-x")).toBe("0");
    expect(placementContainer.getAttribute("data-offset-y")).toBe("0");

    const sprite = screen.getByTestId("mascot-sprite-frame");
    expect(sprite).toBeTruthy();
    expect(sprite.getAttribute("data-frame-index")).toBe("0");
  });

  it("resolves exact frame at 0.125s to frame 1 using resolveAnimationFrameAtTime", () => {
    const animation = createMockAnimation();
    render(<QuizStagePlacementPreview animation={animation} timeSeconds={0.125} placement={MASCOT_DEFAULT_PLACEMENT} />);

    const sprite = screen.getByTestId("mascot-sprite-frame");
    expect(sprite.getAttribute("data-frame-index")).toBe("1");
    expect(sprite.style.backgroundPosition).toBe("-200px 0px");
  });

  it("applies placement scaling, offset, and horizontal flip", () => {
    const animation = createMockAnimation();
    render(
      <QuizStagePlacementPreview
        animation={animation}
        timeSeconds={0}
        placement={{
          anchor: "bottom_right",
          scale: 1.84,
          offset_x: 25,
          offset_y: -10,
          flip_x: true,
        }}
      />,
    );

    const container = screen.getByTestId("mascot-placement-container");
    expect(container.className).toContain("anchor-bottom_right");
    expect(container.getAttribute("data-anchor")).toBe("bottom_right");
    expect(container.getAttribute("data-scale")).toBe("1.84");
    expect(container.getAttribute("data-offset-x")).toBe("25");
    expect(container.getAttribute("data-offset-y")).toBe("-10");
    expect(container.getAttribute("data-flip-x")).toBe("true");
    expect(container.style.transform).toContain("scale(1.84)");
    expect(container.style.transform).toContain("scaleX(-1)");
  });

  it("renders fallback image when animation asset is missing", () => {
    render(
      <QuizStagePlacementPreview
        animation={null}
        fallbackImageUrl="https://example.com/fallback.png"
        timeSeconds={0}
        placement={MASCOT_DEFAULT_PLACEMENT}
      />,
    );

    const img = screen.getByAltText("Mascot preview");
    expect(img).toBeTruthy();
    expect(img.getAttribute("src")).toBe("https://example.com/fallback.png");
  });

  it("renders alignment guides when showGuides is true", () => {
    const animation = createMockAnimation();
    const { container, rerender } = render(
      <QuizStagePlacementPreview animation={animation} timeSeconds={0} placement={MASCOT_DEFAULT_PLACEMENT} showGuides={false} />,
    );

    expect(container.querySelector(".quiz-stage-guides")).toBeNull();

    rerender(<QuizStagePlacementPreview animation={animation} timeSeconds={0} placement={MASCOT_DEFAULT_PLACEMENT} showGuides={true} />);

    expect(container.querySelector(".quiz-stage-guides")).not.toBeNull();
  });

  it("renders transparent video element when transparent_video_url is provided", () => {
    const videoAnimation: MascotPublishedAnimationAsset = {
      ...createMockAnimation(),
      atlas_url: undefined,
      transparent_video_url: "/api/mascots/owl/styles/core/animations/thinking/1/artifacts/video_transparent.webm",
      alpha_codec: "vp9_alpha",
    };

    render(<QuizStagePlacementPreview animation={videoAnimation} timeSeconds={0} placement={MASCOT_DEFAULT_PLACEMENT} />);

    const video = screen.getByTestId("mascot-transparent-video");
    expect(video).toBeTruthy();
    expect(video.getAttribute("src")).toBe("/api/mascots/owl/styles/core/animations/thinking/1/artifacts/video_transparent.webm");
  });
});
