import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useChannelDragAndDrop } from "./useChannelDragAndDrop";

function createMockDragEvent(type: string): React.DragEvent<HTMLElement> {
  const dataStore: Record<string, string> = {};
  return {
    type,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    dataTransfer: {
      effectAllowed: "none",
      dropEffect: "none",
      setData: vi.fn((key: string, val: string) => {
        dataStore[key] = val;
      }),
      getData: vi.fn((key: string) => dataStore[key] || ""),
    },
    currentTarget: document.createElement("div"),
    target: document.createElement("div"),
  } as unknown as React.DragEvent<HTMLElement>;
}

describe("useChannelDragAndDrop - Step 2: Drag & Drop Engine", () => {
  it("initializes with idle drag state", () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() => useChannelDragAndDrop({ onReorder }));

    expect(result.current.isDragging).toBe(false);
    expect(result.current.draggedIndex).toBeNull();
    expect(result.current.dragOverIndex).toBeNull();
  });

  it("handles drag start correctly", () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() => useChannelDragAndDrop({ onReorder }));

    const event = createMockDragEvent("dragstart");

    act(() => {
      result.current.handleDragStart(event, 1, "ch_quiz_1");
    });

    expect(result.current.isDragging).toBe(true);
    expect(result.current.draggedIndex).toBe(1);
    expect(result.current.dragOverIndex).toBe(1);
    expect(event.dataTransfer.setData).toHaveBeenCalledWith("text/plain", "ch_quiz_1");
  });

  it("handles drag over and drag enter to update hover target", () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() => useChannelDragAndDrop({ onReorder }));

    const startEvent = createMockDragEvent("dragstart");
    act(() => {
      result.current.handleDragStart(startEvent, 0, "ch_1");
    });

    const overEvent = createMockDragEvent("dragover");
    act(() => {
      result.current.handleDragOver(overEvent, 2);
    });

    expect(overEvent.preventDefault).toHaveBeenCalled();
    expect(result.current.dragOverIndex).toBe(2);
  });

  it("triggers onReorder on drop and resets state", () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() => useChannelDragAndDrop({ onReorder }));

    const startEvent = createMockDragEvent("dragstart");
    act(() => {
      result.current.handleDragStart(startEvent, 0, "ch_1");
    });

    const dropEvent = createMockDragEvent("drop");
    act(() => {
      result.current.handleDrop(dropEvent, 2);
    });

    expect(dropEvent.preventDefault).toHaveBeenCalled();
    expect(onReorder).toHaveBeenCalledWith(0, 2);
    expect(result.current.isDragging).toBe(false);
    expect(result.current.draggedIndex).toBeNull();
    expect(result.current.dragOverIndex).toBeNull();
  });

  it("does not call onReorder when dropped on the same index", () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() => useChannelDragAndDrop({ onReorder }));

    const startEvent = createMockDragEvent("dragstart");
    act(() => {
      result.current.handleDragStart(startEvent, 1, "ch_1");
    });

    const dropEvent = createMockDragEvent("drop");
    act(() => {
      result.current.handleDrop(dropEvent, 1);
    });

    expect(onReorder).not.toHaveBeenCalled();
    expect(result.current.isDragging).toBe(false);
  });

  it("cancels drag on drag end", () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() => useChannelDragAndDrop({ onReorder }));

    const startEvent = createMockDragEvent("dragstart");
    act(() => {
      result.current.handleDragStart(startEvent, 0, "ch_1");
    });

    act(() => {
      result.current.handleDragEnd();
    });

    expect(result.current.isDragging).toBe(false);
    expect(result.current.draggedIndex).toBeNull();
    expect(result.current.dragOverIndex).toBeNull();
  });

  it("ignores drag interactions when enabled is false", () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() => useChannelDragAndDrop({ onReorder, enabled: false }));

    const startEvent = createMockDragEvent("dragstart");
    act(() => {
      result.current.handleDragStart(startEvent, 0, "ch_1");
    });

    expect(result.current.isDragging).toBe(false);
    expect(result.current.draggedIndex).toBeNull();
  });

  it("generates draggable card props with active drag indicators", () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() => useChannelDragAndDrop({ onReorder, enabled: true }));

    const startEvent = createMockDragEvent("dragstart");
    act(() => {
      result.current.handleDragStart(startEvent, 0, "ch_1");
    });

    const overEvent = createMockDragEvent("dragover");
    act(() => {
      result.current.handleDragOver(overEvent, 1);
    });

    const card0Props = result.current.getDraggableProps(0, "ch_1");
    const card1Props = result.current.getDraggableProps(1, "ch_2");
    const card2Props = result.current.getDraggableProps(2, "ch_3");

    expect(card0Props["data-dragging"]).toBe(true);
    expect(card0Props["data-drag-over"]).toBe(false);

    expect(card1Props["data-dragging"]).toBe(false);
    expect(card1Props["data-drag-over"]).toBe(true);

    expect(card2Props["data-dragging"]).toBe(false);
    expect(card2Props["data-drag-over"]).toBe(false);
  });

  it("supports moveUp and moveDown keyboard helpers", () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() => useChannelDragAndDrop({ onReorder }));

    act(() => {
      result.current.moveUp(2);
    });
    expect(onReorder).toHaveBeenCalledWith(2, 1);

    act(() => {
      result.current.moveDown(1, 4);
    });
    expect(onReorder).toHaveBeenCalledWith(1, 2);

    // Boundary conditions
    act(() => {
      result.current.moveUp(0);
    });
    expect(onReorder).toHaveBeenCalledTimes(2); // no extra call
  });
});
