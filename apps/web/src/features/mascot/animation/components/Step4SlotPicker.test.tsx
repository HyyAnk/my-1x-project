import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { Step4SlotPicker } from "./Step4SlotPicker";
import type { MascotSlotProjection } from "@studio/shared";

afterEach(() => {
  cleanup();
});

const mockThinkingSlots: MascotSlotProjection[] = Array.from({ length: 10 }, (_, i) => ({
  style_id: "core",
  state: "thinking",
  slot_index: i + 1,
  status: i === 0 ? "ready" : i === 1 ? "processing" : "empty",
  updated_at: new Date().toISOString(),
}));

const mockCelebrateSlots: MascotSlotProjection[] = Array.from({ length: 10 }, (_, i) => ({
  style_id: "core",
  state: "celebrate",
  slot_index: i + 1,
  status: "empty",
  updated_at: new Date().toISOString(),
}));

describe("Step4SlotPicker", () => {
  it("renders state switcher tabs and 10 slot buttons", () => {
    render(
      <Step4SlotPicker
        activeState="thinking"
        onChangeState={vi.fn()}
        activeSlotIndex={1}
        onSelectSlot={vi.fn()}
        slots={{
          thinking: mockThinkingSlots,
          celebrate: mockCelebrateSlots,
        }}
      />,
    );

    expect(screen.getByTestId("state-thinking-tab")).toBeTruthy();
    expect(screen.getByTestId("state-celebrate-tab")).toBeTruthy();
    expect(screen.getByTestId("slot-card-1")).toBeTruthy();
    expect(screen.getByTestId("slot-card-10")).toBeTruthy();
    expect(screen.getByLabelText(/Slot 1, status ready/i)).toBeTruthy();
  });

  it("calls onChangeState when clicking Celebrate tab", () => {
    const onChangeState = vi.fn();
    render(
      <Step4SlotPicker
        activeState="thinking"
        onChangeState={onChangeState}
        activeSlotIndex={1}
        onSelectSlot={vi.fn()}
        slots={{
          thinking: mockThinkingSlots,
          celebrate: mockCelebrateSlots,
        }}
      />,
    );

    fireEvent.click(screen.getByTestId("state-celebrate-tab"));
    expect(onChangeState).toHaveBeenCalledWith("celebrate");
  });

  it("calls onSelectSlot when clicking a slot card", () => {
    const onSelectSlot = vi.fn();
    render(
      <Step4SlotPicker
        activeState="thinking"
        onChangeState={vi.fn()}
        activeSlotIndex={1}
        onSelectSlot={onSelectSlot}
        slots={{
          thinking: mockThinkingSlots,
          celebrate: mockCelebrateSlots,
        }}
      />,
    );

    fireEvent.click(screen.getByTestId("slot-card-5"));
    expect(onSelectSlot).toHaveBeenCalledWith(5);
  });
});
