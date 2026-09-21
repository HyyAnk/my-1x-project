import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor, within } from "@testing-library/react";
import type { MascotProfile, MascotStyle } from "@studio/shared";
import { LanguageProvider } from "../../../i18n";
import { MascotActionsStep, type MascotActionsStepProps } from "./MascotActionsStep";

const wrapper = ({ children }: { children: React.ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;

afterEach(() => {
  cleanup();
});

const mockCoreStyle: MascotStyle = {
  id: "core",
  name: "Core Style",
  keyword: "default, classic",
  is_default: true,
  anchor_image_url: "https://example.com/core-anchor.png",
  states: { thinking: [], celebrate: [] },
  created_at: "2026-09-01T00:00:00.000Z",
  updated_at: "2026-09-01T00:00:00.000Z",
};

const mockCustomStyle: MascotStyle = {
  id: "style_cyber",
  name: "Cyber Punk",
  keyword: "cyberpunk, neon",
  is_default: false,
  anchor_image_url: "https://example.com/cyber-anchor.png",
  states: { thinking: [], celebrate: [] },
  created_at: "2026-09-01T00:00:00.000Z",
  updated_at: "2026-09-01T00:00:00.000Z",
};

const mockMascot: MascotProfile = {
  id: "mascot_1",
  name: "Captain Quill",
  description: "A brave pirate parrot",
  visual_style: "flat_vector",
  master_prompt: "pirate parrot with hat",
  master_image_url: "https://example.com/master-quill.png",
  color_theme: "#06b6d4",
  actions: {},
  styles: [mockCoreStyle, mockCustomStyle],
  active_style_id: "core",
  assigned_channel_ids: [],
  created_at: "2026-09-01T00:00:00.000Z",
  updated_at: "2026-09-01T00:00:00.000Z",
};

function createMockStylesState() {
  return {
    activeStyleId: "core",
    setActiveStyleId: vi.fn(),
    activeStyle: mockCoreStyle,
    activeStyleReadiness: "concept_locked" as const,
    generatingConceptStyleId: null,
    isCreateModalOpen: false,
    setIsCreateModalOpen: vi.fn(),
    handleCreateStyle: vi.fn(),
    handleGenerateStyleConcept: vi.fn(),
    handleDeleteStyle: vi.fn(),
    handleUpdateStyleKeyword: vi.fn(),
    busySlotKey: null,
    queuedSlotKeys: [],
    handleGenerateSlot: vi.fn(),
    handleBatchGenerateStyle: vi.fn(),
    handleGenerateSelectedSlots: vi.fn().mockResolvedValue(true),
    handleRegenerateSelectedSlots: vi.fn().mockResolvedValue(true),
    batchProgress: null,
    handleStopBatchGeneration: vi.fn(),
    editingSlot: null,
    handleOpenSlotPromptModal: vi.fn(),
    handleCloseSlotPromptModal: vi.fn(),
    handleSaveSlotPrompt: vi.fn(),
  };
}

function renderActionsStep(overrides: Partial<MascotActionsStepProps> = {}) {
  const defaultProps: MascotActionsStepProps = {
    editingMascot: mockMascot,
    stylesState: createMockStylesState() as unknown as MascotActionsStepProps["stylesState"],
    onBackStep: vi.fn(),
    onNextStep: vi.fn(),
    onOpenLightbox: vi.fn(),
    ...overrides,
  };

  return render(<MascotActionsStep {...defaultProps} />, { wrapper });
}

describe("MascotActionsStep (Streamlined Step 2)", () => {
  it("renders style tabs for existing styles", () => {
    renderActionsStep();
    expect(screen.getAllByText(/Core Style/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Cyber Punk")).toBeTruthy();
  });

  it("does NOT render + New Style button or style creation modal", () => {
    const { container } = renderActionsStep();
    // Verify no button text matching "New Style"
    expect(screen.queryByText(/\+ New Style/i)).toBeNull();
    // Verify no modal container exists
    expect(container.querySelector(".style-create-modal")).toBeNull();
  });

  it("renders 'Manage in Concept' navigation button that navigates back to Step 1", () => {
    const onBackStep = vi.fn();
    const { container } = renderActionsStep({ onBackStep });

    const manageBtn = container.querySelector(".mascot-style-tab-manage");
    expect(manageBtn).toBeTruthy();
    expect(manageBtn?.textContent).toContain("Manage in Concept");

    fireEvent.click(manageBtn!);
    expect(onBackStep).toHaveBeenCalledTimes(1);
  });

  it("keeps the active style fixed while slot generation is busy", () => {
    const setActiveStyleId = vi.fn();
    const stylesState = {
      ...createMockStylesState(),
      busySlotKey: "thinking_1",
      setActiveStyleId,
    };
    const { container } = renderActionsStep({
      stylesState: stylesState as unknown as MascotActionsStepProps["stylesState"],
    });

    const manageBtn = container.querySelector(".mascot-style-tab-manage");
    expect(manageBtn).toHaveProperty("disabled", true);

    const activeStyleTab = screen.getByRole("tab", { name: /Core Style/i });
    const otherStyleTab = screen.getByRole("tab", { name: /Cyber Punk/i });
    expect(activeStyleTab).toHaveProperty("disabled", false);
    expect(otherStyleTab).toHaveProperty("disabled", true);

    fireEvent.click(otherStyleTab);
    expect(setActiveStyleId).not.toHaveBeenCalled();
  });

  it("renders selection toolbar and handles multi-select variant regeneration", async () => {
    const handleRegenerateSelectedSlots = vi.fn().mockResolvedValue(true);
    const styleWithFilledSlots: MascotStyle = {
      ...mockCoreStyle,
      states: {
        thinking: [
          {
            id: "t_1",
            slot_index: 1,
            image_url: "https://example.com/t1.png",
            prompt_modifier: "pondering deeply",
          },
          {
            id: "t_2",
            slot_index: 2,
            image_url: "https://example.com/t2.png",
            prompt_modifier: "scratching chin",
          },
        ],
        celebrate: [],
      },
    };

    const stylesState = {
      ...createMockStylesState(),
      activeStyle: styleWithFilledSlots,
      handleRegenerateSelectedSlots,
    };

    const mascotWithFilledStyle: MascotProfile = {
      ...mockMascot,
      styles: [styleWithFilledSlots, mockCustomStyle],
    };

    renderActionsStep({
      editingMascot: mascotWithFilledStyle,
      stylesState: stylesState as unknown as MascotActionsStepProps["stylesState"],
    });

    // Checkbox on slot 1
    const slot1Checkbox = screen.getByRole("checkbox", { name: "Select thinking slot 1" });
    const slot2Checkbox = screen.getByRole("checkbox", { name: "Select thinking slot 2" });
    expect(slot1Checkbox).toBeDefined();
    expect(slot2Checkbox).toBeDefined();

    // Select slot 1 individually
    fireEvent.click(slot1Checkbox);
    expect(screen.getByText("1 selected")).toBeDefined();

    // Select All button
    const selectAllBtn = screen.getByRole("button", { name: "Select all available generated Thinking slots" });
    expect(selectAllBtn).toBeDefined();

    // Click Select All
    fireEvent.click(selectAllBtn);
    expect(screen.getByText("2 selected")).toBeDefined();
    expect(screen.getByRole("button", { name: "Deselect all Thinking slots" })).toBeDefined();

    // Regenerate Selected button
    const regenBtn = screen.getByRole("button", {
      name: "Regenerate Selected 2 thinking slots",
    });
    expect(regenBtn).toBeDefined();
    expect(regenBtn).toHaveProperty("disabled", false);

    // Click Regenerate Selected
    fireEvent.click(regenBtn);

    await waitFor(() => {
      expect(handleRegenerateSelectedSlots).toHaveBeenCalledTimes(1);
      expect(handleRegenerateSelectedSlots).toHaveBeenCalledWith([
        { state: "thinking", slotIndex: 1, promptModifier: "pondering deeply" },
        { state: "thinking", slotIndex: 2, promptModifier: "scratching chin" },
      ]);
    });
  });

  it("keeps unrelated slots selectable while another slot is generating", () => {
    const styleWithFilledSlots: MascotStyle = {
      ...mockCoreStyle,
      states: {
        thinking: [
          {
            id: "t_1",
            slot_index: 1,
            image_url: "https://example.com/t1.png",
          },
          {
            id: "t_2",
            slot_index: 2,
            image_url: "https://example.com/t2.png",
          },
        ],
        celebrate: [],
      },
    };

    const stylesState = {
      ...createMockStylesState(),
      activeStyle: styleWithFilledSlots,
      busySlotKey: "batch",
      batchProgress: {
        total: 5,
        completed: 1,
        failed: 0,
        activeSlotKeys: ["thinking_1"],
        statusMessage: "Generating...",
        startTime: Date.now(),
        isStopping: false,
      },
    };

    renderActionsStep({
      editingMascot: { ...mockMascot, styles: [styleWithFilledSlots] },
      stylesState: stylesState as unknown as MascotActionsStepProps["stylesState"],
    });

    const activeSlotCheckbox = screen.getByRole("checkbox", { name: "Select thinking slot 1" });
    const availableSlotCheckbox = screen.getByRole("checkbox", { name: "Select thinking slot 2" });
    expect(activeSlotCheckbox).toHaveProperty("disabled", true);
    expect(availableSlotCheckbox).toHaveProperty("disabled", false);

    fireEvent.click(availableSlotCheckbox);
    expect(screen.getByRole("button", { name: "Regenerate Selected 1 thinking slot" })).toHaveProperty("disabled", false);
  });

  it("queues multiple selected empty slots in one request", async () => {
    const handleGenerateSelectedSlots = vi.fn().mockResolvedValue(true);
    const stylesState = {
      ...createMockStylesState(),
      handleGenerateSelectedSlots,
    };

    renderActionsStep({ stylesState: stylesState as unknown as MascotActionsStepProps["stylesState"] });

    fireEvent.click(screen.getByRole("checkbox", { name: "Select thinking slot 2" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Select thinking slot 4" }));
    fireEvent.click(screen.getByRole("button", { name: "Generate Selected 2 thinking slots" }));

    await waitFor(() => {
      expect(handleGenerateSelectedSlots).toHaveBeenCalledWith([
        { state: "thinking", slotIndex: 2, promptModifier: undefined },
        { state: "thinking", slotIndex: 4, promptModifier: undefined },
      ]);
    });
  });

  it("keeps selected slots checked when the queue request is rejected", async () => {
    const handleGenerateSelectedSlots = vi.fn().mockResolvedValue(false);
    const stylesState = {
      ...createMockStylesState(),
      handleGenerateSelectedSlots,
    };

    renderActionsStep({ stylesState: stylesState as unknown as MascotActionsStepProps["stylesState"] });

    const slotCheckbox = screen.getByRole("checkbox", { name: "Select thinking slot 3" });
    fireEvent.click(slotCheckbox);
    fireEvent.click(screen.getByRole("button", { name: "Generate Selected 1 thinking slot" }));

    await waitFor(() => expect(handleGenerateSelectedSlots).toHaveBeenCalledTimes(1));
    expect(slotCheckbox).toHaveProperty("checked", true);
    expect(screen.getByText("1 selected")).toBeDefined();
  });

  it("allows another empty slot to join an active queue", () => {
    const handleGenerateSlot = vi.fn();
    const stylesState = {
      ...createMockStylesState(),
      handleGenerateSlot,
      busySlotKey: "batch",
      queuedSlotKeys: ["thinking_1", "core:thinking_1"],
      batchProgress: {
        total: 2,
        completed: 0,
        failed: 0,
        activeSlotKeys: ["thinking_2"],
        statusMessage: "Generating Thinking slot 2",
        startTime: Date.now(),
        isStopping: false,
        targetState: "thinking" as const,
        mode: "single" as const,
      },
    };

    renderActionsStep({ stylesState: stylesState as unknown as MascotActionsStepProps["stylesState"] });

    const thinkingSection = screen.getByRole("region", { name: "Thinking" });
    const availableGenerateButtons = within(thinkingSection).getAllByRole("button", { name: "Generate" });
    expect(availableGenerateButtons).toHaveLength(8);
    expect(availableGenerateButtons[0]).toHaveProperty("disabled", false);

    fireEvent.click(availableGenerateButtons[0]!);
    expect(handleGenerateSlot).toHaveBeenCalledWith("thinking", 3);
    expect(within(thinkingSection).getByRole("button", { name: "Queue Remaining (8)" })).toHaveProperty("disabled", false);
  });

  it("attaches beforeunload listener when batch generation is active", () => {
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");

    const stylesState = {
      ...createMockStylesState(),
      busySlotKey: "batch",
      batchProgress: {
        total: 5,
        completed: 1,
        failed: 0,
        activeSlotKeys: ["thinking_1"],
        statusMessage: "Generating...",
        startTime: Date.now(),
        isStopping: false,
      },
    };

    renderActionsStep({
      stylesState: stylesState as unknown as MascotActionsStepProps["stylesState"],
    });

    expect(addEventListenerSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));
  });
});
