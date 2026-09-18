import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MascotMotionStepHeader } from "./MascotMotionStepHeader";

afterEach(() => {
  cleanup();
});

describe("MascotMotionStepHeader", () => {
  it("renders header banner, ready counter, and triggers onBackStep and onFinishMascot", () => {
    const onBackStep = vi.fn();
    const onFinishMascot = vi.fn();

    render(
      <MascotMotionStepHeader onBackStep={onBackStep} readyCount={15} totalCount={20} busyAction={null} onFinishMascot={onFinishMascot} />,
    );

    expect(screen.getByText("Step 4: Motion and Animation Preview")).toBeTruthy();
    expect(screen.getByTestId("ready-count-badge").textContent).toContain("15/20");

    const backBtn = screen.getByRole("button", { name: /back to step 3/i });
    fireEvent.click(backBtn);
    expect(onBackStep).toHaveBeenCalledTimes(1);

    const finishBtn = screen.getByTestId("finish-mascot-btn") as HTMLButtonElement;
    expect(finishBtn.disabled).toBe(false);
    fireEvent.click(finishBtn);
    expect(onFinishMascot).toHaveBeenCalledTimes(1);
  });

  it("disables finish button when busyAction is finish", () => {
    render(<MascotMotionStepHeader onBackStep={vi.fn()} readyCount={20} totalCount={20} busyAction="finish" onFinishMascot={vi.fn()} />);

    const finishBtn = screen.getByTestId("finish-mascot-btn") as HTMLButtonElement;
    expect(finishBtn.disabled).toBe(true);
  });
});
