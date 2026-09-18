import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useBeforeUnloadWarning, DEFAULT_BEFORE_UNLOAD_WARNING } from "./useBeforeUnloadWarning";

describe("useBeforeUnloadWarning", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("does not attach listener when enabled is false", () => {
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");
    renderHook(() => useBeforeUnloadWarning(false));

    expect(addEventListenerSpy).not.toHaveBeenCalledWith("beforeunload", expect.any(Function));
  });

  it("attaches listener when enabled is true and handles beforeunload event", () => {
    let capturedHandler: ((e: BeforeUnloadEvent) => unknown) | null = null;
    vi.spyOn(window, "addEventListener").mockImplementation((event, handler) => {
      if (event === "beforeunload") {
        capturedHandler = handler as (e: BeforeUnloadEvent) => unknown;
      }
    });

    renderHook(() => useBeforeUnloadWarning(true));

    expect(capturedHandler).toBeDefined();

    const mockEvent = {
      preventDefault: vi.fn(),
      returnValue: "",
    } as unknown as BeforeUnloadEvent;

    const result = capturedHandler!(mockEvent);
    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockEvent.returnValue).toBe(DEFAULT_BEFORE_UNLOAD_WARNING);
    expect(result).toBe(DEFAULT_BEFORE_UNLOAD_WARNING);
  });

  it("supports options object syntax and custom message", () => {
    let capturedHandler: ((e: BeforeUnloadEvent) => unknown) | null = null;
    vi.spyOn(window, "addEventListener").mockImplementation((event, handler) => {
      if (event === "beforeunload") {
        capturedHandler = handler as (e: BeforeUnloadEvent) => unknown;
      }
    });

    const customMessage = "Custom warning: active generation!";
    renderHook(() =>
      useBeforeUnloadWarning({
        enabled: true,
        message: customMessage,
      }),
    );

    expect(capturedHandler).toBeDefined();

    const mockEvent = {
      preventDefault: vi.fn(),
      returnValue: "",
    } as unknown as BeforeUnloadEvent;

    const result = capturedHandler!(mockEvent);
    expect(mockEvent.returnValue).toBe(customMessage);
    expect(result).toBe(customMessage);
  });

  it("removes listener when hook unmounts", () => {
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useBeforeUnloadWarning(true));

    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));
  });

  it("removes listener when enabled transitions from true to false", () => {
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
    const { rerender } = renderHook(({ enabled }) => useBeforeUnloadWarning(enabled), {
      initialProps: { enabled: true },
    });

    rerender({ enabled: false });
    expect(removeEventListenerSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));
  });
});
