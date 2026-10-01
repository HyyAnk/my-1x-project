import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MASCOT_RECOMMENDED_PLACEMENT, type MascotPublishedAnimationAsset } from "@studio/shared";
import { StageMascotOverlay } from "./StageMascotOverlay";
import { QuizStagePlacementPreview } from "../QuizStagePlacementPreview";

afterEach(cleanup);

function asset(width: number, height: number): MascotPublishedAnimationAsset {
  return {
    version: 1,
    state: "thinking",
    fps: 24,
    frame_count: 1,
    loop: true,
    manifest_url: "/manifest.json",
    transparent_video_url: "/video.webm",
    source_fingerprint: "source",
    content_fingerprint: "content",
    frames: [{ index: 0, x: 0, y: 0, width, height, duration_ms: 1000 / 24 }],
    registration: {
      source_width: width,
      source_height: height,
      content_bounds: { x: 0, y: 0, width, height },
      pivot: { x: width / 2, y: height },
      offset_x: 288,
      offset_y: 122,
    },
    video_registration: {
      source_width: 1280,
      source_height: 720,
      content_bounds: { x: 0, y: 0, width: 1280, height: 720 },
      pivot: { x: width / 2, y: height },
      offset_x: 0,
      offset_y: 0,
    },
  };
}

describe("Studio video canvas placement", () => {
  it("keeps the same transform after changing variants, independent of crop metadata", () => {
    const { rerender } = render(
      <StageMascotOverlay animation={asset(1166, 688)} placement={MASCOT_RECOMMENDED_PLACEMENT} timeSeconds={0} />,
    );
    const transform = screen.getByTestId("mascot-transparent-video").style.transform;
    rerender(
      <StageMascotOverlay
        animation={{ ...asset(698, 598), state: "celebrate" }}
        placement={MASCOT_RECOMMENDED_PLACEMENT}
        timeSeconds={2}
      />,
    );
    expect(screen.getByTestId("mascot-transparent-video").style.transform).toBe(transform);
    expect(transform).toBe("translate(0px, 0px)");
    const container = screen.getByTestId("mascot-placement-container");
    expect(container.style.left).toBe("0px");
    expect(container.style.bottom).toBe("0px");
  });

  it("applies zoom to the complete logical stage, not the mascot alone", () => {
    render(
      <QuizStagePlacementPreview animation={asset(698, 598)} placement={MASCOT_RECOMMENDED_PLACEMENT} timeSeconds={0} canvasZoom={1.5} />,
    );
    const stage = screen.getByTestId("mascot-logical-stage");
    expect(stage.style.width).toBe("1920px");
    expect(stage.style.height).toBe("1080px");
    expect(stage.style.transform).toBe("scale(1.5)");
    expect(screen.getByTestId("mascot-placement-container").style.transform).toBe("translate(121px, 181px) scale(3.6) scaleX(1)");
  });
});
