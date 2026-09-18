import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MascotMotionStepSlotSidebar } from "./MascotMotionStepSlotSidebar";
import { MASCOT_RECOMMENDED_PLACEMENT } from "@studio/shared";

afterEach(() => {
  cleanup();
});

describe("MascotMotionStepSlotSidebar", () => {
  it("renders slot picker and slot details in canvas mode without placement controls", () => {
    render(
      <MascotMotionStepSlotSidebar
        activeState="thinking"
        onChangeState={vi.fn()}
        activeSlotIndex={1}
        onSelectSlot={vi.fn()}
        slotsData={{ thinking: [], celebrate: [] }}
        activeSlot={undefined}
        previewMode="canvas"
        placement={MASCOT_RECOMMENDED_PLACEMENT}
        onChangePlacement={vi.fn()}
        showGuides={false}
        onToggleGuides={vi.fn()}
        onGoToStep3={vi.fn()}
      />,
    );

    expect(screen.getByTestId("step4-slot-picker")).toBeTruthy();
    expect(screen.getByTestId("step4-slot-details")).toBeTruthy();
    expect(screen.queryByTestId("placement-settings-controls")).toBeNull();
  });

  it("renders placement settings controls in stage mode", () => {
    render(
      <MascotMotionStepSlotSidebar
        activeState="thinking"
        onChangeState={vi.fn()}
        activeSlotIndex={1}
        onSelectSlot={vi.fn()}
        slotsData={{ thinking: [], celebrate: [] }}
        activeSlot={undefined}
        previewMode="stage"
        placement={MASCOT_RECOMMENDED_PLACEMENT}
        onChangePlacement={vi.fn()}
        showGuides={false}
        onToggleGuides={vi.fn()}
        onGoToStep3={vi.fn()}
      />,
    );

    expect(screen.getByTestId("step4-slot-picker")).toBeTruthy();
    expect(screen.getByTestId("placement-settings-controls")).toBeTruthy();
    expect(screen.getByTestId("step4-slot-details")).toBeTruthy();
  });
});
