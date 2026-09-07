import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { QuizLayoutWireframe } from "./QuizLayoutWireframe";
import { QUIZ_LAYOUT_UI_DEFINITIONS, type QuizLayoutUiDefinition } from "../quizLayoutUiCatalog";

const PREVIEW_TYPES: readonly QuizLayoutUiDefinition["preview"][] = [
  "media-left",
  "visual-three",
  "full-stack",
  "portrait-hero",
  "portrait-versus",
  "portrait-verdict",
  "portrait-stack",
];

describe("QuizLayoutWireframe", () => {
  it("renders container class and geometric parts for all 7 preview archetypes", () => {
    for (const preview of PREVIEW_TYPES) {
      const { container } = render(<QuizLayoutWireframe preview={preview} />);
      const wireframe = container.firstElementChild as HTMLElement;

      expect(wireframe).not.toBeNull();
      expect(wireframe.classList.contains("stage-layout-miniature")).toBe(true);
      expect(wireframe.classList.contains(`is-${preview}`)).toBe(true);
      expect(wireframe.getAttribute("aria-hidden")).toBe("true");

      // Verify core geometric preview elements
      expect(wireframe.querySelector(".layout-mini-media")).not.toBeNull();
      expect(wireframe.querySelector(".layout-mini-choice.choice-a")).not.toBeNull();
      expect(wireframe.querySelector(".layout-mini-choice.choice-b")).not.toBeNull();
      expect(wireframe.querySelector(".layout-mini-choice.choice-c")).not.toBeNull();
      // Default showMascot is true
      expect(wireframe.querySelector(".layout-mini-mascot")).not.toBeNull();
    }
  });

  it("handles showMascot=false and showMascot=true correctly", () => {
    const { container: withMascot } = render(
      <QuizLayoutWireframe preview="media-left" showMascot={true} />,
    );
    expect(withMascot.querySelector(".layout-mini-mascot")).not.toBeNull();

    const { container: withoutMascot } = render(
      <QuizLayoutWireframe preview="media-left" showMascot={false} />,
    );
    expect(withoutMascot.querySelector(".layout-mini-mascot")).toBeNull();
  });

  it("sets layoutId, aspectRatio, and custom className attributes correctly", () => {
    const { container } = render(
      <QuizLayoutWireframe
        preview="portrait-hero"
        layoutId="portrait_hero_choices"
        aspectRatio="9:16"
        className="custom-wireframe-class"
      />,
    );
    const wireframe = container.firstElementChild as HTMLElement;

    expect(wireframe.getAttribute("data-layout-id")).toBe("portrait_hero_choices");
    expect(wireframe.getAttribute("data-aspect-ratio")).toBe("9:16");
    expect(wireframe.classList.contains("stage-layout-miniature")).toBe(true);
    expect(wireframe.classList.contains("is-portrait-hero")).toBe(true);
    expect(wireframe.classList.contains("custom-wireframe-class")).toBe(true);
  });

  it("omits data attributes when optional props are not provided", () => {
    const { container } = render(<QuizLayoutWireframe preview="full-stack" />);
    const wireframe = container.firstElementChild as HTMLElement;

    expect(wireframe.getAttribute("data-layout-id")).toBeNull();
    expect(wireframe.getAttribute("data-aspect-ratio")).toBeNull();
  });

  it("seamlessly renders all 12 layouts from QUIZ_LAYOUT_UI_DEFINITIONS", () => {
    expect(QUIZ_LAYOUT_UI_DEFINITIONS).toHaveLength(12);

    for (const layout of QUIZ_LAYOUT_UI_DEFINITIONS) {
      const { container } = render(
        <QuizLayoutWireframe
          preview={layout.preview}
          layoutId={layout.id}
          aspectRatio="16:9"
        />,
      );
      const wireframe = container.firstElementChild as HTMLElement;
      expect(wireframe.classList.contains(`is-${layout.preview}`)).toBe(true);
      expect(wireframe.getAttribute("data-layout-id")).toBe(layout.id);
    }
  });
});
