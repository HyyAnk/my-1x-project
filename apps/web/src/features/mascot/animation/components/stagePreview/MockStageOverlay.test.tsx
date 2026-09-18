import { describe, expect, it, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MockStageOverlay } from "./MockStageOverlay";

afterEach(() => {
  cleanup();
});

describe("MockStageOverlay", () => {
  it("renders 16:9 landscape quiz screen by default", () => {
    render(<MockStageOverlay />);
    expect(screen.getByText("Simulated 16:9 Quiz Screen")).toBeTruthy();
    expect(screen.getByText("QUESTION 1 / 10")).toBeTruthy();
    expect(screen.getByText("TIMER 05s")).toBeTruthy();
    expect(screen.getByText("Choice A")).toBeTruthy();
    expect(screen.getByText("Choice D")).toBeTruthy();
  });

  it("renders 9:16 portrait quiz screen with customized question and timer", () => {
    render(
      <MockStageOverlay aspectRatio="9:16" questionNumber={3} totalQuestions={5} timerSeconds={12} questionTitle="Portrait Math Quiz" />,
    );
    expect(screen.getByText("Portrait Math Quiz")).toBeTruthy();
    expect(screen.getByText("QUESTION 3 / 5")).toBeTruthy();
    expect(screen.getByText("TIMER 12s")).toBeTruthy();
  });
});
