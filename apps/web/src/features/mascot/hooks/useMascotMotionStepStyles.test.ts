import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { BUILT_IN_PRESETS, type MascotProfile } from "@studio/shared";
import { useMascotStepStyles } from "./useMascotStepStyles";

describe("useMascotStepStyles", () => {
  it("synthesizes core style when none exists", () => {
    const { result } = renderHook(() => useMascotStepStyles(null, null, "core"));

    expect(result.current.allStyles.length).toBe(1);
    expect(result.current.allStyles[0].id).toBe("core");
    expect(result.current.resolvedActiveStyle?.id).toBe("core");
  });

  it("reconciles the built-in registry and selects the requested style", () => {
    const mockMascot: MascotProfile = {
      id: "m1",
      name: "Test Mascot",
      description: "",
      visual_style: "pixar_3d",
      master_prompt: "",
      master_image_url: null,
      color_theme: "#06b6d4",
      actions: {},
      styles: [
        {
          id: "core",
          name: "Core",
          keyword: "",
          is_default: true,
          states: { thinking: [], celebrate: [] },
          created_at: "2026-09-20T00:00:00.000Z",
          updated_at: "2026-09-20T00:00:00.000Z",
        },
      ],
      assigned_channel_ids: [],
      created_at: "2026-09-20T00:00:00.000Z",
      updated_at: "2026-09-20T00:00:00.000Z",
    };

    const { result } = renderHook(() => useMascotStepStyles(mockMascot, null, "builtin_cyber_neon"));

    expect(result.current.allStyles.length).toBe(BUILT_IN_PRESETS.length);
    expect(result.current.resolvedActiveStyle?.id).toBe("builtin_cyber_neon");
  });
});
