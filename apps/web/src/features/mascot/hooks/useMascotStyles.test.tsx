import { describe, expect, it, vi, beforeEach, type Mock } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { GenerateMascotStyleConceptResponse, MascotProfile, MascotStyle } from "@studio/shared";
import { useMascotStyles } from "./useMascotStyles";
import type { Notice } from "../../../components/types";
import { api } from "../../../api";

vi.mock("../../../api", () => ({
  api: {
    createMascotStyle: vi.fn(),
    updateMascotStyle: vi.fn(),
    deleteMascotStyle: vi.fn(),
    setActiveMascotStyle: vi.fn(),
    generateMascotStyleSlot: vi.fn(),
    generateMascotStyleBatch: vi.fn(),
    updateMascotSlot: vi.fn(),
    generateStyleConcept: vi.fn(),
  },
}));

const mockStyleCore: MascotStyle = {
  id: "core",
  name: "Core Style",
  keyword: "classic",
  anchor_image_url: null,
  is_default: true,
  states: {
    thinking: [
      {
        id: "var_t1",
        slot_index: 1,
        image_url: "https://example.com/think1.png",
        prompt_modifier: "pondering",
      },
    ],
    celebrate: [
      {
        id: "var_c1",
        slot_index: 1,
        image_url: "https://example.com/celeb1.png",
        prompt_modifier: "jumping",
      },
    ],
  },
  created_at: "2026-09-01T00:00:00.000Z",
  updated_at: "2026-09-01T00:00:00.000Z",
};

const mockStyleCyber: MascotStyle = {
  id: "style_cyber",
  name: "Cyber Neon",
  keyword: "cyberpunk, glowing neon",
  anchor_image_url: null,
  is_default: false,
  states: {
    thinking: [
      {
        id: "var_ct1",
        slot_index: 1,
        image_url: "https://example.com/cyber_think.png",
        prompt_modifier: "hologram",
      },
    ],
    celebrate: [],
  },
  created_at: "2026-09-02T00:00:00.000Z",
  updated_at: "2026-09-02T00:00:00.000Z",
};

const mockMascot: MascotProfile = {
  id: "mascot_1",
  name: "Professor Paws",
  description: "A wise cat professor",
  visual_style: "pixar_3d",
  master_prompt: "cat with glasses",
  master_image_url: "https://example.com/master.png",
  color_theme: "#06b6d4",
  actions: {},
  styles: [mockStyleCore, mockStyleCyber],
  active_style_id: "core",
  assigned_channel_ids: [],
  created_at: "2026-09-01T00:00:00.000Z",
  updated_at: "2026-09-01T00:00:00.000Z",
};

describe("useMascotStyles", () => {
  let onMascotUpdated: ReturnType<typeof vi.fn>;
  let onNotice: Mock<(notice: Notice) => void>;

  beforeEach(() => {
    vi.clearAllMocks();
    onMascotUpdated = vi.fn();
    onNotice = vi.fn<(notice: Notice) => void>();
  });

  it("resolves the initial active style and allows switching style tabs", () => {
    const { result } = renderHook(() =>
      useMascotStyles({
        mascot: mockMascot,
        onMascotUpdated,
        onNotice,
      }),
    );

    expect(result.current.activeStyleId).toBe("core");
    expect(result.current.activeStyle?.name).toBe("Core Style");

    act(() => {
      result.current.setActiveStyleId("style_cyber");
    });

    expect(result.current.activeStyleId).toBe("style_cyber");
    expect(result.current.activeStyle?.name).toBe("Cyber Neon");
  });

  it("synthesizes legacy core style when mascot has no styles array", () => {
    const legacyMascot: MascotProfile = {
      ...mockMascot,
      styles: undefined,
      actions: {
        thinking: {
          action: "thinking",
          sprite_url: "https://example.com/legacy_think.png",
          frames_count: 1,
          fps: 8,
          loop: true,
          frame_width: 512,
          frame_height: 512,
          offset_x: 0,
          offset_y: 0,
        },
      },
    };

    const { result } = renderHook(() =>
      useMascotStyles({
        mascot: legacyMascot,
        onMascotUpdated,
        onNotice,
      }),
    );

    expect(result.current.activeStyle?.id).toBe("core");
    expect(result.current.activeStyle?.states.thinking).toHaveLength(1);
    expect(result.current.activeStyle?.states.thinking[0].image_url).toBe("https://example.com/legacy_think.png");
  });

  it("creates a new style, updates state, and displays success notice", async () => {
    const newStyle: MascotStyle = {
      id: "style_winter",
      name: "Winter Magic",
      keyword: "snow, ice",
      anchor_image_url: null,
      is_default: false,
      states: { thinking: [], celebrate: [] },
      created_at: "2026-09-03T00:00:00.000Z",
      updated_at: "2026-09-03T00:00:00.000Z",
    };
    const updatedMascot: MascotProfile = {
      ...mockMascot,
      styles: [...mockMascot.styles!, newStyle],
    };

    vi.mocked(api.createMascotStyle).mockResolvedValue({
      mascot: updatedMascot,
      style: newStyle,
    });

    const { result } = renderHook(() =>
      useMascotStyles({
        mascot: mockMascot,
        onMascotUpdated,
        onNotice,
      }),
    );

    act(() => {
      result.current.setIsCreateModalOpen(true);
      result.current.setNewStyleName("Winter Magic");
      result.current.setNewStyleKeyword("snow, ice");
    });

    await act(async () => {
      await result.current.handleCreateStyle();
    });

    expect(api.createMascotStyle).toHaveBeenCalledWith("mascot_1", {
      name: "Winter Magic",
      keyword: "snow, ice",
    });
    expect(onMascotUpdated).toHaveBeenCalledWith(updatedMascot);
    expect(result.current.activeStyleId).toBe("style_winter");
    expect(result.current.isCreateModalOpen).toBe(false);
    expect(result.current.newStyleName).toBe("");
    expect(onNotice).toHaveBeenCalled();
    expect(onNotice.mock.lastCall?.[0]?.tone).toBe("good");
    expect(onNotice.mock.lastCall?.[0]?.message).toContain("Winter Magic");
  });

  it("prevents creating style with empty name and displays error notice", async () => {
    const { result } = renderHook(() =>
      useMascotStyles({
        mascot: mockMascot,
        onMascotUpdated,
        onNotice,
      }),
    );

    await act(async () => {
      await result.current.handleCreateStyle("   ");
    });

    expect(api.createMascotStyle).not.toHaveBeenCalled();
    expect(onNotice).toHaveBeenCalledWith(expect.objectContaining({ tone: "bad", message: "Style name is required" }));
  });

  it("updates style keyword and displays success notice", async () => {
    const updatedMascot: MascotProfile = {
      ...mockMascot,
      styles: [mockStyleCore, { ...mockStyleCyber, keyword: "futuristic neon, cyberpunk 2077" }],
    };
    vi.mocked(api.updateMascotStyle).mockResolvedValue({ mascot: updatedMascot });

    const { result } = renderHook(() =>
      useMascotStyles({
        mascot: mockMascot,
        onMascotUpdated,
        onNotice,
      }),
    );

    await act(async () => {
      await result.current.handleUpdateStyleKeyword("style_cyber", "futuristic neon, cyberpunk 2077");
    });

    expect(api.updateMascotStyle).toHaveBeenCalledWith("mascot_1", "style_cyber", {
      keyword: "futuristic neon, cyberpunk 2077",
    });
    expect(onMascotUpdated).toHaveBeenCalledWith(updatedMascot);
    expect(onNotice).toHaveBeenCalledWith(expect.objectContaining({ tone: "good" }));
  });

  it("deletes a style and resets active tab to core when deleting current style", async () => {
    const updatedMascot: MascotProfile = {
      ...mockMascot,
      styles: [mockStyleCore],
    };
    vi.mocked(api.deleteMascotStyle).mockResolvedValue({ ok: true, mascot: updatedMascot });

    const { result } = renderHook(() =>
      useMascotStyles({
        mascot: mockMascot,
        onMascotUpdated,
        onNotice,
      }),
    );

    act(() => {
      result.current.setActiveStyleId("style_cyber");
    });
    expect(result.current.activeStyleId).toBe("style_cyber");

    await act(async () => {
      await result.current.handleDeleteStyle("style_cyber");
    });

    expect(api.deleteMascotStyle).toHaveBeenCalledWith("mascot_1", "style_cyber");
    expect(onMascotUpdated).toHaveBeenCalledWith(updatedMascot);
    expect(result.current.activeStyleId).toBe("core");
    expect(onNotice).toHaveBeenCalledWith(expect.objectContaining({ tone: "good", message: "Style deleted successfully" }));
  });

  it("sets active style on mascot profile", async () => {
    const updatedMascot: MascotProfile = {
      ...mockMascot,
      active_style_id: "style_cyber",
    };
    vi.mocked(api.setActiveMascotStyle).mockResolvedValue({ mascot: updatedMascot });

    const { result } = renderHook(() =>
      useMascotStyles({
        mascot: mockMascot,
        onMascotUpdated,
        onNotice,
      }),
    );

    await act(async () => {
      await result.current.handleSetActiveStyle("style_cyber");
    });

    expect(api.setActiveMascotStyle).toHaveBeenCalledWith("mascot_1", "style_cyber");
    expect(onMascotUpdated).toHaveBeenCalledWith(updatedMascot);
    expect(result.current.activeStyleId).toBe("style_cyber");
    expect(onNotice).toHaveBeenCalledWith(expect.objectContaining({ tone: "good" }));
  });

  it("handles slot generation with busy indicators and success notice", async () => {
    const generatedVariant = {
      id: "var_t2",
      slot_index: 2,
      image_url: "https://example.com/think2.png",
      prompt_modifier: "reading book",
    };
    const updatedMascot: MascotProfile = {
      ...mockMascot,
    };

    vi.mocked(api.generateMascotStyleSlot).mockResolvedValue({
      mascot: updatedMascot,
      slot: generatedVariant,
      prompt_used: "prompt",
    });

    const { result } = renderHook(() =>
      useMascotStyles({
        mascot: mockMascot,
        onMascotUpdated,
        onNotice,
      }),
    );

    expect(result.current.busySlotKey).toBeNull();

    await act(async () => {
      await result.current.handleGenerateSlot("thinking", 2, "reading book");
    });

    expect(api.generateMascotStyleSlot).toHaveBeenCalledWith("mascot_1", "core", {
      style_id: "core",
      state: "thinking",
      slot_index: 2,
      prompt_modifier: "reading book",
    });
    expect(onMascotUpdated).toHaveBeenCalledWith(updatedMascot);
    expect(result.current.busySlotKey).toBeNull();
    expect(onNotice).toHaveBeenCalledWith(expect.objectContaining({ tone: "good" }));
  });

  it("delegates batch generation to the single server-side batch endpoint", async () => {
    const updatedMascot: MascotProfile = { ...mockMascot };
    vi.mocked(api.generateMascotStyleBatch).mockResolvedValue({
      mascot: updatedMascot,
      generated_count: 9,
    });

    const { result } = renderHook(() =>
      useMascotStyles({
        mascot: mockMascot,
        onMascotUpdated,
        onNotice,
      }),
    );

    await act(async () => {
      await result.current.handleBatchGenerateStyle("thinking");
    });

    // Thinking slots 2..10 (9 empty slots) are handled by one server batch call
    expect(api.generateMascotStyleBatch).toHaveBeenCalledTimes(1);
    expect(api.generateMascotStyleSlot).not.toHaveBeenCalled();
    expect(onMascotUpdated).toHaveBeenCalledWith(updatedMascot);
    expect(result.current.busySlotKey).toBeNull();
    expect(result.current.batchProgress).toBeNull();
    expect(onNotice).toHaveBeenCalled();
    expect(onNotice.mock.lastCall?.[0]?.tone).toBe("good");
    expect(onNotice.mock.lastCall?.[0]?.message).toContain("9/9 slots generated");
  });

  it("supports stopping batch generation early by aborting the server request", async () => {
    const { result } = renderHook(() =>
      useMascotStyles({
        mascot: mockMascot,
        onMascotUpdated,
        onNotice,
      }),
    );

    vi.mocked(api.generateMascotStyleBatch).mockImplementation(() => {
      act(() => {
        result.current.handleStopBatchGeneration();
      });
      throw new DOMException("The operation was aborted", "AbortError");
    });

    await act(async () => {
      await result.current.handleBatchGenerateStyle("thinking");
    });

    expect(api.generateMascotStyleSlot).not.toHaveBeenCalled();
    expect(result.current.busySlotKey).toBeNull();
    expect(result.current.batchProgress).toBeNull();
    expect(onNotice).toHaveBeenCalled();
    expect(onNotice.mock.lastCall?.[0]?.tone).toBe("good");
    expect(onNotice.mock.lastCall?.[0]?.message).toContain("stopped");
  });

  it("shows an error notice when the server batch generation fails", async () => {
    vi.mocked(api.generateMascotStyleBatch).mockRejectedValue(new Error("Batch failed"));

    const { result } = renderHook(() =>
      useMascotStyles({
        mascot: mockMascot,
        onMascotUpdated,
        onNotice,
      }),
    );

    await act(async () => {
      await result.current.handleBatchGenerateStyle("thinking");
    });

    expect(onNotice).toHaveBeenCalledWith(
      expect.objectContaining({
        tone: "bad",
        message: "Batch failed",
      }),
    );
    expect(result.current.busySlotKey).toBeNull();
    expect(result.current.batchProgress).toBeNull();
  });

  it("manages editing slot prompt modal lifecycle", async () => {
    const updatedMascot: MascotProfile = { ...mockMascot };
    vi.mocked(api.updateMascotSlot).mockResolvedValue({ mascot: updatedMascot });

    const { result } = renderHook(() =>
      useMascotStyles({
        mascot: mockMascot,
        onMascotUpdated,
        onNotice,
      }),
    );

    act(() => {
      result.current.handleOpenSlotPromptModal("thinking", 1);
    });

    expect(result.current.editingSlot).toEqual({
      state: "thinking",
      slotIndex: 1,
      currentPrompt: "pondering",
    });

    await act(async () => {
      await result.current.handleSaveSlotPrompt("scratching head");
    });

    expect(api.updateMascotSlot).toHaveBeenCalledWith("mascot_1", "core", {
      style_id: "core",
      state: "thinking",
      slot_index: 1,
      prompt_modifier: "scratching head",
    });
    expect(result.current.editingSlot).toBeNull();
    expect(onNotice).toHaveBeenCalledWith(expect.objectContaining({ tone: "good" }));

    act(() => {
      result.current.handleOpenSlotPromptModal("celebrate", 1);
    });
    expect(result.current.editingSlot?.state).toBe("celebrate");

    act(() => {
      result.current.handleCloseSlotPromptModal();
    });
    expect(result.current.editingSlot).toBeNull();
  });

  it("handles errors gracefully and displays error notice on API failures", async () => {
    vi.mocked(api.createMascotStyle).mockRejectedValue(new Error("Network timeout"));
    vi.mocked(api.generateMascotStyleSlot).mockRejectedValue(new Error("GPU out of memory"));
    vi.mocked(api.generateMascotStyleBatch).mockRejectedValue(new Error("Batch failed"));

    const { result } = renderHook(() =>
      useMascotStyles({
        mascot: mockMascot,
        onMascotUpdated,
        onNotice,
      }),
    );

    await act(async () => {
      await result.current.handleCreateStyle("Failing Style");
    });
    expect(onNotice).toHaveBeenCalledWith(expect.objectContaining({ tone: "bad", message: "Network timeout" }));

    await act(async () => {
      await result.current.handleGenerateSlot("thinking", 1);
    });
    expect(result.current.busySlotKey).toBeNull();
    expect(onNotice).toHaveBeenCalledWith(expect.objectContaining({ tone: "bad", message: "GPU out of memory" }));

    await act(async () => {
      await result.current.handleBatchGenerateStyle("all");
    });
    expect(result.current.busySlotKey).toBeNull();
    expect(onNotice).toHaveBeenCalled();
    expect(onNotice.mock.lastCall?.[0]?.tone).toBe("bad");
    expect(onNotice.mock.lastCall?.[0]?.message).toContain("Batch failed");
  });

  it("generates style concept anchor successfully and updates profile", async () => {
    const conceptResponse = {
      style: {
        ...mockStyleCyber,
        anchor_image_url: "https://example.com/cyber_anchor.png",
      },
      mascot: {
        ...mockMascot,
        styles: [
          mockStyleCore,
          {
            ...mockStyleCyber,
            anchor_image_url: "https://example.com/cyber_anchor.png",
          },
        ],
      },
    };
    vi.mocked(api.generateStyleConcept).mockResolvedValue(conceptResponse as unknown as GenerateMascotStyleConceptResponse);

    const { result } = renderHook(() =>
      useMascotStyles({
        mascot: mockMascot,
        onMascotUpdated,
        onNotice,
      }),
    );

    expect(result.current.generatingConceptStyleId).toBeNull();

    let promise!: Promise<void>;
    act(() => {
      promise = result.current.handleGenerateStyleConcept("style_cyber", "neon cyber cat");
    });

    expect(result.current.generatingConceptStyleId).toBe("style_cyber");

    await act(async () => {
      await promise;
    });

    expect(api.generateStyleConcept).toHaveBeenCalledWith("mascot_1", "style_cyber", {
      prompt: "neon cyber cat",
    });
    expect(onMascotUpdated).toHaveBeenCalledWith(conceptResponse.mascot);
    expect(result.current.generatingConceptStyleId).toBeNull();
    expect(onNotice).toHaveBeenCalled();
    expect(onNotice.mock.lastCall?.[0]?.tone).toBe("good");
    expect(onNotice.mock.lastCall?.[0]?.message).toContain('Concept for style "Cyber Neon" generated successfully');
  });

  it("handles errors when generating style concept fails and resets generatingConceptStyleId", async () => {
    vi.mocked(api.generateStyleConcept).mockRejectedValue(new Error("Concept generation failed"));

    const { result } = renderHook(() =>
      useMascotStyles({
        mascot: mockMascot,
        onMascotUpdated,
        onNotice,
      }),
    );

    await act(async () => {
      await result.current.handleGenerateStyleConcept("style_cyber");
    });

    expect(result.current.generatingConceptStyleId).toBeNull();
    expect(onNotice).toHaveBeenCalledWith(
      expect.objectContaining({
        tone: "bad",
        message: "Concept generation failed",
      }),
    );
  });

  it("updates style anchor image url and notifies mascot update", async () => {
    const updatedMascot: MascotProfile = {
      ...mockMascot,
      styles: [
        mockStyleCore,
        {
          ...mockStyleCyber,
          anchor_image_url: "https://example.com/new_anchor.png",
        },
      ],
    };
    vi.mocked(api.updateMascotStyle).mockResolvedValue({ mascot: updatedMascot });

    const { result } = renderHook(() =>
      useMascotStyles({
        mascot: mockMascot,
        onMascotUpdated,
        onNotice,
      }),
    );

    await act(async () => {
      await result.current.handleUpdateStyleAnchor("style_cyber", "https://example.com/new_anchor.png");
    });

    expect(api.updateMascotStyle).toHaveBeenCalledWith("mascot_1", "style_cyber", {
      anchor_image_url: "https://example.com/new_anchor.png",
    });
    expect(onMascotUpdated).toHaveBeenCalledWith(updatedMascot);
  });

  it("computes activeStyleReadiness reflecting the current active style", () => {
    const { result, rerender } = renderHook(
      ({ mascot }) =>
        useMascotStyles({
          mascot,
          onMascotUpdated,
          onNotice,
        }),
      { initialProps: { mascot: mockMascot } },
    );

    expect(result.current.activeStyleReadiness).toBe("concept_locked");

    const emptyStyle: MascotStyle = {
      id: "style_empty",
      name: "Empty Style",
      keyword: "blank",
      anchor_image_url: null,
      is_default: false,
      states: { thinking: [], celebrate: [] },
      created_at: "2026-09-01T00:00:00.000Z",
      updated_at: "2026-09-01T00:00:00.000Z",
    };
    const mascotWithEmpty: MascotProfile = {
      ...mockMascot,
      styles: [emptyStyle],
      active_style_id: "style_empty",
    };

    rerender({ mascot: mascotWithEmpty });
    expect(result.current.activeStyleReadiness).toBe("empty");

    const styleWithAnchor: MascotStyle = {
      ...emptyStyle,
      anchor_image_url: "https://example.com/anchor.png",
    };
    const mascotWithAnchor: MascotProfile = {
      ...mockMascot,
      styles: [styleWithAnchor],
      active_style_id: "style_empty",
    };

    rerender({ mascot: mascotWithAnchor });
    expect(result.current.activeStyleReadiness).toBe("concept_locked");

    const fullyExpressiveStyle: MascotStyle = {
      ...emptyStyle,
      states: {
        thinking: Array.from({ length: 10 }, (_, i) => ({
          id: `t_${i + 1}`,
          slot_index: i + 1,
          image_url: `https://example.com/t_${i + 1}.png`,
        })),
        celebrate: Array.from({ length: 10 }, (_, i) => ({
          id: `c_${i + 1}`,
          slot_index: i + 1,
          image_url: `https://example.com/c_${i + 1}.png`,
        })),
      },
    };
    const mascotFullyExpressive: MascotProfile = {
      ...mockMascot,
      styles: [fullyExpressiveStyle],
      active_style_id: "style_empty",
    };

    rerender({ mascot: mascotFullyExpressive });
    expect(result.current.activeStyleReadiness).toBe("fully_expressive");
  });
});
