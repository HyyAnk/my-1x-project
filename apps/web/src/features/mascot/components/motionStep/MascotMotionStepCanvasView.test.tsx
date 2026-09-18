import { describe, expect, it, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MascotMotionStepCanvasView } from "./MascotMotionStepCanvasView";
import { MASCOT_RECOMMENDED_PLACEMENT } from "@studio/shared";

afterEach(() => {
  cleanup();
});

describe("MascotMotionStepCanvasView", () => {
  it("renders ManifestFrameCanvas in canvas mode", () => {
    render(
      <MascotMotionStepCanvasView
        previewMode="canvas"
        animation={null}
        fallbackImageUrl="https://example.com/fallback.png"
        timeSeconds={0}
        isPlaying={false}
        isLooping={false}
        canvasBackground="dark"
        canvasZoom={1}
        flipHorizontal={false}
        placement={MASCOT_RECOMMENDED_PLACEMENT}
        showGuides={false}
      />,
    );

    expect(screen.getByTestId("manifest-frame-canvas")).toBeTruthy();
    expect(screen.queryByTestId("quiz-stage-preview")).toBeNull();
  });

  it("renders QuizStagePlacementPreview in stage mode", () => {
    render(
      <MascotMotionStepCanvasView
        previewMode="stage"
        animation={null}
        fallbackImageUrl="https://example.com/fallback.png"
        timeSeconds={0}
        isPlaying={false}
        isLooping={false}
        canvasBackground="dark"
        canvasZoom={1}
        flipHorizontal={false}
        placement={MASCOT_RECOMMENDED_PLACEMENT}
        showGuides={false}
      />,
    );

    expect(screen.getByTestId("quiz-stage-preview")).toBeTruthy();
    expect(screen.queryByTestId("manifest-frame-canvas")).toBeNull();
  });
});
