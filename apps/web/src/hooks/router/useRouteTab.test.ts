import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { resolveRouteTab, useRouteTab } from "./useRouteTab";

const TABS = ["first", "second"] as const;

describe("useRouteTab", () => {
  it("resolves missing and unknown route values to the fallback", () => {
    expect(resolveRouteTab(null, TABS, "first")).toBe("first");
    expect(resolveRouteTab("unknown", TABS, "first")).toBe("first");
    expect(resolveRouteTab("second", TABS, "first")).toBe("second");
  });

  it("selects a tab locally and reports it to the route owner", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useRouteTab({ value: null, allowedTabs: TABS, fallback: "first", onChange }));

    act(() => result.current[1]("second"));

    expect(result.current[0]).toBe("second");
    expect(onChange).toHaveBeenCalledWith("second");
  });

  it("follows external route changes without overriding a local selection", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string | null }) => useRouteTab({ value, allowedTabs: TABS, fallback: "first" }),
      {
        initialProps: { value: null as string | null },
      },
    );

    act(() => result.current[1]("second"));
    rerender({ value: null });
    expect(result.current[0]).toBe("second");

    rerender({ value: "first" });
    expect(result.current[0]).toBe("first");
  });
});
