import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { MascotProfile } from "@studio/shared";
import { api } from "../../../api";
import { LanguageProvider } from "../../../i18n";
import { useMascotStudioRouting } from "./useMascotStudioRouting";
import type { useMascotGenerator } from "./useMascotGenerator";
import type { useMascotLibrary } from "./useMascotLibrary";

const mockMascot: MascotProfile = {
  id: "mascot-test-1",
  name: "Sparky the Robot",
  description: "A cute helpful robot",
  visual_style: "pixar_3d",
  master_prompt: "Cute metallic robot",
  master_image_url: "https://example.com/sparky.png",
  color_theme: "#06b6d4",
  actions: {},
  assigned_channel_ids: [],
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(LanguageProvider, null, children);

describe("useMascotStudioRouting", () => {
  beforeEach(() => {
    vi.spyOn(api, "mascot").mockResolvedValue({ mascot: mockMascot });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createMockGeneratorState(editingMascot: MascotProfile | null = null) {
    return {
      generatorStep: 1 as const,
      setGeneratorStep: vi.fn(),
      editingMascot,
      setEditingMascot: vi.fn(),
      handleStartNew: vi.fn(),
      handleEditMascot: vi.fn(),
      genName: "",
      genDescription: "",
      genStyle: "pixar_3d" as const,
      genColor: "#06b6d4",
      genPrompt: "",
    } as unknown as ReturnType<typeof useMascotGenerator>;
  }

  function createMockLibraryState(mascots: MascotProfile[] = [mockMascot], loading = false) {
    return {
      mascots,
      loading,
      loadMascots: vi.fn().mockResolvedValue(undefined),
      importingZip: false,
      handleImportZip: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof useMascotLibrary>;
  }

  it("handles new mascot route initialization", () => {
    const generatorState = createMockGeneratorState();
    generatorState.editingMascot = mockMascot;
    const libraryState = createMockLibraryState();

    renderHook(
      () =>
        useMascotStudioRouting({
          mascotId: "new",
          step: 2,
          currentTab: "generator",
          switchTab: vi.fn(),
          generatorState,
          libraryState,
          onNotice: vi.fn(),
        }),
      { wrapper },
    );

    expect(generatorState.handleStartNew).toHaveBeenCalled();
    expect(generatorState.setGeneratorStep).toHaveBeenCalledWith(2);
  });

  it("rehydrates mascot from library cache when found", () => {
    const generatorState = createMockGeneratorState();
    const libraryState = createMockLibraryState([mockMascot]);

    renderHook(
      () =>
        useMascotStudioRouting({
          mascotId: "mascot-test-1",
          step: 3,
          currentTab: "generator",
          switchTab: vi.fn(),
          generatorState,
          libraryState,
          onNotice: vi.fn(),
        }),
      { wrapper },
    );

    expect(generatorState.handleEditMascot).toHaveBeenCalledWith(mockMascot);
    expect(generatorState.setGeneratorStep).toHaveBeenCalledWith(3);
  });

  it("fetches mascot via API when not found in library cache", async () => {
    const generatorState = createMockGeneratorState();
    const libraryState = createMockLibraryState([], false);

    renderHook(
      () =>
        useMascotStudioRouting({
          mascotId: "mascot-test-1",
          step: 1,
          currentTab: "generator",
          switchTab: vi.fn(),
          generatorState,
          libraryState,
          onNotice: vi.fn(),
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(api.mascot).toHaveBeenCalledWith("mascot-test-1");
      expect(generatorState.handleEditMascot).toHaveBeenCalledWith(mockMascot);
    });
  });

  it("syncs generator step changes back to query parameter", () => {
    const generatorState = createMockGeneratorState();
    generatorState.generatorStep = 3;
    const libraryState = createMockLibraryState();
    const setQueryParam = vi.fn();

    renderHook(
      () =>
        useMascotStudioRouting({
          mascotId: "mascot-test-1",
          step: 1,
          setQueryParam,
          currentTab: "generator",
          switchTab: vi.fn(),
          generatorState,
          libraryState,
          onNotice: vi.fn(),
        }),
      { wrapper },
    );

    expect(setQueryParam).toHaveBeenCalledWith("step", "3", true);
  });

  it("provides navigation handlers for tabs and library actions", () => {
    const generatorState = createMockGeneratorState();
    const libraryState = createMockLibraryState();
    const openMascot = vi.fn();
    const switchTab = vi.fn();

    const { result } = renderHook(
      () =>
        useMascotStudioRouting({
          openMascot,
          currentTab: "library",
          switchTab,
          generatorState,
          libraryState,
          onNotice: vi.fn(),
        }),
      { wrapper },
    );

    act(() => {
      result.current.handleStartNew();
    });
    expect(generatorState.handleStartNew).toHaveBeenCalled();
    expect(openMascot).toHaveBeenCalledWith("new", 1);

    act(() => {
      result.current.handleEditMascot(mockMascot);
    });
    expect(generatorState.handleEditMascot).toHaveBeenCalledWith(mockMascot);
    expect(openMascot).toHaveBeenCalledWith("mascot-test-1", 1);

    act(() => {
      result.current.handleBackToLibrary();
    });
    expect(switchTab).toHaveBeenCalledWith("library");
    expect(openMascot).toHaveBeenCalledWith(null);
    expect(libraryState.loadMascots).toHaveBeenCalled();
  });

  it("does not re-open existing mascot when returning to library", () => {
    const generatorState = createMockGeneratorState(mockMascot);
    const libraryState = createMockLibraryState();
    const openMascot = vi.fn();
    const switchTab = vi.fn();

    const { result, rerender } = renderHook(
      ({ mascotId, currentTab }: { mascotId: string | null; currentTab: "library" | "generator" }) =>
        useMascotStudioRouting({
          mascotId,
          openMascot,
          currentTab,
          switchTab,
          generatorState,
          libraryState,
          onNotice: vi.fn(),
        }),
      {
        wrapper,
        initialProps: { mascotId: "mascot-test-1", currentTab: "generator" },
      },
    );

    act(() => {
      result.current.handleBackToLibrary();
    });
    expect(openMascot).toHaveBeenCalledWith(null);

    // Simulate route transition to library
    openMascot.mockClear();
    rerender({ mascotId: null, currentTab: "library" });

    // Ensure it does not re-navigate back to the mascot
    expect(openMascot).not.toHaveBeenCalled();
  });
});
