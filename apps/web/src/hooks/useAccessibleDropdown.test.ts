import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAccessibleDropdown } from "./useAccessibleDropdown";

describe("useAccessibleDropdown", () => {
  const items = [
    { id: "opt-1", label: "Option 1" },
    { id: "opt-2", label: "Option 2" },
    { id: "opt-3", label: "Option 3" },
  ];

  it("initializes with closed state and provides ARIA attributes", () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() =>
      useAccessibleDropdown({
        items,
        selectedItem: items[0],
        onSelect,
      }),
    );

    expect(result.current.isOpen).toBe(false);
    expect(result.current.triggerProps["aria-expanded"]).toBe(false);
    expect(result.current.triggerProps.role).toBe("combobox");
    expect(result.current.listboxProps.role).toBe("listbox");
    expect(result.current.triggerProps["aria-controls"]).toBe(result.current.listboxProps.id);
  });

  it("toggles open and close state", () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() =>
      useAccessibleDropdown({
        items,
        selectedItem: items[0],
        onSelect,
      }),
    );

    act(() => {
      result.current.open();
    });
    expect(result.current.isOpen).toBe(true);
    expect(result.current.triggerProps["aria-expanded"]).toBe(true);

    act(() => {
      result.current.close();
    });
    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(true);
  });

  it("handles item selection and closes dropdown by default", () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() =>
      useAccessibleDropdown({
        items,
        selectedItem: items[0],
        onSelect,
      }),
    );

    act(() => {
      result.current.open();
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.handleSelect(items[1]);
    });
    expect(onSelect).toHaveBeenCalledWith(items[1]);
    expect(result.current.isOpen).toBe(false);
  });

  it("handles Escape key to close dropdown", () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() =>
      useAccessibleDropdown({
        items,
        selectedItem: items[0],
        onSelect,
      }),
    );

    act(() => {
      result.current.open();
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.handleKeyDown({
        key: "Escape",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });
    expect(result.current.isOpen).toBe(false);
  });

  it("handles Enter or Space to toggle dropdown", () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() =>
      useAccessibleDropdown({
        items,
        selectedItem: items[0],
        onSelect,
      }),
    );

    act(() => {
      result.current.handleKeyDown({
        key: "Enter",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.handleKeyDown({
        key: " ",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });
    expect(result.current.isOpen).toBe(false);
  });

  it("handles ArrowDown and ArrowUp navigation when open", () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() =>
      useAccessibleDropdown({
        items,
        selectedItem: items[0],
        onSelect,
        isItemEqual: (a, b) => a.id === b.id,
      }),
    );

    // If closed, ArrowDown opens it
    act(() => {
      result.current.handleKeyDown({
        key: "ArrowDown",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });
    expect(result.current.isOpen).toBe(true);

    // If open, ArrowDown cycles to next item
    act(() => {
      result.current.handleKeyDown({
        key: "ArrowDown",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });
    expect(onSelect).toHaveBeenCalledWith(items[1]);

    // Reopen and test ArrowUp
    act(() => {
      result.current.open();
    });
    act(() => {
      result.current.handleKeyDown({
        key: "ArrowUp",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });
    expect(onSelect).toHaveBeenCalledWith(items[2]);
  });

  it("does not perform actions when disabled", () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() =>
      useAccessibleDropdown({
        items,
        selectedItem: items[0],
        onSelect,
        disabled: true,
      }),
    );

    act(() => {
      result.current.open();
    });
    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.handleKeyDown({
        key: "Enter",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });
    expect(result.current.isOpen).toBe(false);
  });
});
