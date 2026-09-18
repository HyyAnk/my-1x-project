import { renderHook, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useMascotSlotSelection } from "./useMascotSlotSelection";

describe("useMascotSlotSelection", () => {
  it("initializes with empty selection", () => {
    const { result } = renderHook(() => useMascotSlotSelection({ availableSlotIndices: [1, 2, 3] }));

    expect(result.current.selectedCount).toBe(0);
    expect(result.current.isAllSelected).toBe(false);
    expect(result.current.isSelected(1)).toBe(false);
  });

  it("toggles individual slot selection on and off", () => {
    const { result } = renderHook(() => useMascotSlotSelection({ availableSlotIndices: [1, 2, 3] }));

    act(() => {
      result.current.toggleSlot(2, true);
    });

    expect(result.current.isSelected(2)).toBe(true);
    expect(result.current.selectedCount).toBe(1);

    act(() => {
      result.current.toggleSlot(2, false);
    });

    expect(result.current.isSelected(2)).toBe(false);
    expect(result.current.selectedCount).toBe(0);
  });

  it("selects all available slots and computes isAllSelected correctly", () => {
    const { result } = renderHook(() => useMascotSlotSelection({ availableSlotIndices: [1, 2, 3] }));

    act(() => {
      result.current.selectAll();
    });

    expect(result.current.selectedCount).toBe(3);
    expect(result.current.isAllSelected).toBe(true);
    expect(result.current.isSelected(1)).toBe(true);
    expect(result.current.isSelected(2)).toBe(true);
    expect(result.current.isSelected(3)).toBe(true);
  });

  it("deselects all slots", () => {
    const { result } = renderHook(() => useMascotSlotSelection({ availableSlotIndices: [1, 2, 3] }));

    act(() => {
      result.current.selectAll();
    });
    expect(result.current.selectedCount).toBe(3);

    act(() => {
      result.current.deselectAll();
    });
    expect(result.current.selectedCount).toBe(0);
    expect(result.current.isAllSelected).toBe(false);
  });

  it("clears selection when clearSelection is called", () => {
    const { result } = renderHook(() => useMascotSlotSelection({ availableSlotIndices: [1, 2, 3] }));

    act(() => {
      result.current.toggleSlot(1, true);
      result.current.toggleSlot(3, true);
    });
    expect(result.current.selectedCount).toBe(2);

    act(() => {
      result.current.clearSelection();
    });
    expect(result.current.selectedCount).toBe(0);
  });
});
