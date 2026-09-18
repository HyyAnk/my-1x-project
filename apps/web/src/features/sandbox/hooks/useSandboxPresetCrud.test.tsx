import type React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { LanguageProvider } from "../../../i18n";
import { useSandboxPresetCrud } from "./useSandboxPresetCrud";
import type { SandboxDesignState } from "./useSandboxDesignState";
import type { SandboxMascotState } from "./useSandboxMascotState";

const wrapper = ({ children }: { children: React.ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;

describe("useSandboxPresetCrud", () => {
  let mockDesign: SandboxDesignState;
  let mockMascot: SandboxMascotState;

  beforeEach(() => {
    localStorage.clear();
    mockDesign = {
      theme: "candy_arcade",
      setTheme: vi.fn(),
      paletteId: "lime",
      setPaletteId: vi.fn(),
      layoutId: "media_left_choices_right",
      setLayoutId: vi.fn(),
      thinkingBarStyle: "star_slider",
      setThinkingBarStyle: vi.fn(),
      questionBoxStyle: "candy_pop",
      setQuestionBoxStyle: vi.fn(),
      answerCardStyle: "glossy_arcade",
      setAnswerCardStyle: vi.fn(),
      counterStyle: "hanging_woodsign",
      setCounterStyle: vi.fn(),
      backgroundStyle: "candy_rays",
      setBackgroundStyle: vi.fn(),
    };
    mockMascot = {
      mascots: [],
      mascotId: "none",
      setMascotId: vi.fn(),
      mascotStyleId: null,
      setMascotStyleId: vi.fn(),
      mascot_style_id: undefined,
      availableStyles: [],
      activeStyle: null,
      thinkingVariants: [],
      celebrateVariants: [],
      selectedVariantIndex: null,
      setSelectedVariantIndex: vi.fn(),
      mascotEnabled: false,
      setMascotEnabled: vi.fn(),
      mascotAction: "thinking",
      setMascotAction: vi.fn(),
      mascotPosition: "bottom_left",
      setMascotPosition: vi.fn(),
      mascotScale: 1.0,
      setMascotScale: vi.fn(),
      mascotOffsetX: 0,
      setMascotOffsetX: vi.fn(),
      mascotOffsetY: 0,
      setMascotOffsetY: vi.fn(),
      mascotFlipX: false,
      setMascotFlipX: vi.fn(),
      resetToDefaultPlacement: vi.fn(),
      activeMascot: null,
    };
  });

  it("handles creating, saving, and selecting custom presets", async () => {
    const onSelectLoadedPreset = vi.fn();

    const { result } = renderHook(
      () =>
        useSandboxPresetCrud({
          design: mockDesign,
          mascot: mockMascot,
          loadedPresetId: null,
          onSelectLoadedPreset,
          newPresetName: "Custom Retro",
        }),
      { wrapper },
    );

    await act(async () => {
      await result.current.handleSaveCustomPreset();
    });

    expect(result.current.customPresets).toHaveLength(1);
    expect(result.current.customPresets[0].name).toBe("Custom Retro");
    expect(onSelectLoadedPreset).toHaveBeenCalled();
  });

  it("handles preset metadata update and deletion", async () => {
    const onSelectLoadedPreset = vi.fn();

    const { result } = renderHook(
      () =>
        useSandboxPresetCrud({
          design: mockDesign,
          mascot: mockMascot,
          loadedPresetId: "custom_test_id",
          onSelectLoadedPreset,
          newPresetName: "Initial",
        }),
      { wrapper },
    );

    await act(async () => {
      await result.current.handleSaveCustomPreset();
    });

    const savedId = result.current.customPresets[0].id;

    await act(async () => {
      await result.current.handleUpdatePresetMetadata(savedId, "Renamed Retro", "Updated description");
    });

    expect(result.current.customPresets[0].name).toBe("Renamed Retro");
    expect(result.current.customPresets[0].description).toBe("Updated description");

    await act(async () => {
      await result.current.handleDeleteCustomPreset(savedId);
    });

    expect(result.current.customPresets).toHaveLength(0);
  });
});
