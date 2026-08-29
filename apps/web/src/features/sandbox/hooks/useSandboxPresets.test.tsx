import type React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { LanguageProvider } from "../../../i18n";
import { useSandboxPresets } from "./useSandboxPresets";
import type { SandboxDesignState } from "./useSandboxDesignState";
import type { SandboxMascotState } from "./useSandboxMascotState";

const wrapper = ({ children }: { children: React.ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;

describe("useSandboxPresets", () => {
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
    };
    mockMascot = {
      mascots: [],
      mascotId: "none",
      setMascotId: vi.fn(),
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
      activeMascot: null,
    };
  });

  it("loads built-in presets by default", () => {
    const { result } = renderHook(() => useSandboxPresets({ design: mockDesign, mascot: mockMascot }), { wrapper });
    expect(result.current.builtInPresets.length).toBeGreaterThan(0);
    expect(result.current.allPresets.length).toBe(result.current.builtInPresets.length);
    expect(result.current.matchedPreset?.id).toBe("preset_arcade_classic");
  });

  it("applies a selected preset to design and mascot state", () => {
    const onNotice = vi.fn();
    const { result } = renderHook(() => useSandboxPresets({ design: mockDesign, mascot: mockMascot, onNotice }), { wrapper });
    const cyberPreset = result.current.builtInPresets.find((p) => p.id === "preset_cyber_neon");
    expect(cyberPreset).toBeDefined();

    act(() => {
      if (cyberPreset) result.current.handleLoadPreset(cyberPreset);
    });

    expect(mockDesign.setPaletteId).toHaveBeenCalledWith("purple");
    expect(mockDesign.setThinkingBarStyle).toHaveBeenCalledWith("energy_laser");
    expect(onNotice).toHaveBeenCalled();
  });

  it("saves, matches, and deletes custom presets via localStorage", () => {
    const onNotice = vi.fn();
    const { result } = renderHook(() => useSandboxPresets({ design: mockDesign, mascot: mockMascot, onNotice }), { wrapper });

    act(() => {
      result.current.setNewPresetName("My Custom Pop");
    });
    act(() => {
      result.current.handleSaveCustomPreset();
    });

    expect(result.current.customPresets).toHaveLength(1);
    expect(result.current.customPresets[0].name).toBe("My Custom Pop");
    expect(localStorage.getItem("studio-visual-custom-presets")).toContain("My Custom Pop");

    const savedId = result.current.customPresets[0].id;
    act(() => {
      result.current.handleDeleteCustomPreset(savedId);
    });

    expect(result.current.customPresets).toHaveLength(0);
  });
});
