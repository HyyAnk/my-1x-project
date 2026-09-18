import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useMascotMotionStepStyles } from "./useMascotMotionStepStyles";

describe("useMascotMotionStepStyles", () => {
  it("synthesizes core style when none exists", () => {
    const { result } = renderHook(() => useMascotMotionStepStyles(null, null, "core"));

    expect(result.current.allStyles.length).toBe(1);
    expect(result.current.allStyles[0].id).toBe("core");
    expect(result.current.resolvedActiveStyle?.id).toBe("core");
  });

  it("uses custom style matching activeStyleId", () => {
    const mockMascot = {
      id: "m1",
      styles: [
        { id: "core", name: "Core" },
        { id: "pixel", name: "Pixel" },
      ],
    } as any;

    const { result } = renderHook(() => useMascotMotionStepStyles(mockMascot, null, "pixel"));

    expect(result.current.allStyles.length).toBe(2);
    expect(result.current.resolvedActiveStyle?.id).toBe("pixel");
  });
});
