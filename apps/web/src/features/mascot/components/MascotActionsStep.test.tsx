import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
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
    handleGenerateSlot: vi.fn(),
    handleBatchGenerateStyle: vi.fn(),
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

  it("disables 'Manage in Concept' navigation button when a slot or batch generation is busy", () => {
    const stylesState = {
      ...createMockStylesState(),
      busySlotKey: "thinking_1",
    };
    const { container } = renderActionsStep({
      stylesState: stylesState as unknown as MascotActionsStepProps["stylesState"],
    });

    const manageBtn = container.querySelector(".mascot-style-tab-manage");
    expect(manageBtn).toHaveProperty("disabled", true);
  });
});
