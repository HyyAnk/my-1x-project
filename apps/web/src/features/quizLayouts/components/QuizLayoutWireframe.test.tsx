import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QuizLayoutWireframe } from "./QuizLayoutWireframe";

describe("QuizLayoutWireframe", () => {
  it("renders a landscape layout identity", () => {
    const { container } = render(<QuizLayoutWireframe preview="media-left" layoutId="media_left_choices_right" aspectRatio="16:9" />);
    expect(container.firstElementChild?.getAttribute("data-layout-id")).toBe("media_left_choices_right");
    expect(container.firstElementChild?.getAttribute("data-aspect-ratio")).toBe("16:9");
  });
});
