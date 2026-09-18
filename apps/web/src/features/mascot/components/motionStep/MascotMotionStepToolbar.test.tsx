import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MascotMotionStepToolbar } from "./MascotMotionStepToolbar";

afterEach(() => {
  cleanup();
});

describe("MascotMotionStepToolbar", () => {
  it("renders backdrop buttons and triggers background change", () => {
    const setCanvasBackground = vi.fn();
    const setFlipHorizontal = vi.fn();
    const setCanvasZoom = vi.fn();

    render(
      <MascotMotionStepToolbar
        canvasBackground="dark"
        setCanvasBackground={setCanvasBackground}
        flipHorizontal={false}
        setFlipHorizontal={setFlipHorizontal}
        canvasZoom={1.0}
        setCanvasZoom={setCanvasZoom}
      />,
    );

    const lightBtn = screen.getByRole("button", { name: /^light$/i });
    fireEvent.click(lightBtn);
    expect(setCanvasBackground).toHaveBeenCalledWith("light");
  });

  it("handles flip and zoom toggles", () => {
    const setCanvasBackground = vi.fn();
    const setFlipHorizontal = vi.fn();
    const setCanvasZoom = vi.fn();

    render(
      <MascotMotionStepToolbar
        canvasBackground="dark"
        setCanvasBackground={setCanvasBackground}
        flipHorizontal={false}
        setFlipHorizontal={setFlipHorizontal}
        canvasZoom={1.0}
        setCanvasZoom={setCanvasZoom}
      />,
    );

    const flipBtn = screen.getByRole("button", { name: /⇄ flip/i });
    fireEvent.click(flipBtn);
    expect(setFlipHorizontal).toHaveBeenCalledTimes(1);

    const zoomBtn = screen.getByRole("button", { name: /1x/i });
    fireEvent.click(zoomBtn);
    expect(setCanvasZoom).toHaveBeenCalledTimes(1);
  });

  it("renders preview mode and contact sheet toggles when handlers provided", () => {
    const onChangePreviewMode = vi.fn();
    const onToggleContactSheet = vi.fn();
    const setCanvasZoom = vi.fn();

    render(
      <MascotMotionStepToolbar
        canvasBackground="dark"
        setCanvasBackground={vi.fn()}
        flipHorizontal={false}
        setFlipHorizontal={vi.fn()}
        canvasZoom={1.0}
        setCanvasZoom={setCanvasZoom}
        previewMode="canvas"
        onChangePreviewMode={onChangePreviewMode}
        showContactSheet={false}
        onToggleContactSheet={onToggleContactSheet}
      />,
    );

    const stageBtn = screen.getByTestId("toolbar-mode-stage-btn");
    fireEvent.click(stageBtn);
    expect(onChangePreviewMode).toHaveBeenCalledWith("stage");

    const sheetBtn = screen.getByTestId("toolbar-toggle-contact-sheet-btn");
    fireEvent.click(sheetBtn);
    expect(onToggleContactSheet).toHaveBeenCalledTimes(1);
  });
});
