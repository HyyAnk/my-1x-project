import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { MascotProfile, MascotStyle } from "@studio/shared";
import { LanguageProvider } from "../../../i18n";
import { MascotAnimationProcessingStep } from "./MascotAnimationProcessingStep";

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
  states: {
    thinking: Array.from({ length: 10 }, (_, i) => ({
      id: `slot_${i + 1}`,
      slot_index: i + 1,
      image_url: `https://example.com/think_${i + 1}.png`,
    })),
    celebrate: Array.from({ length: 10 }, (_, i) => ({
      id: `slot_${i + 1}`,
      slot_index: i + 1,
      image_url: `https://example.com/celeb_${i + 1}.png`,
    })),
  },
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
  id: "mascot_owl",
  name: "Milo Owl",
  description: "A wise owl mascot",
  visual_style: "flat_vector",
  master_prompt: "owl with glasses",
  master_image_url: "https://example.com/master-owl.png",
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
    handleDeleteStyle: vi.fn(),
    handleGenerateSlot: vi.fn(),
    handleBatchGenerateStyle: vi.fn(),
    batchProgress: null,
    handleStopBatchGeneration: vi.fn(),
    busySlotKey: null,
    editingSlot: null,
    handleOpenSlotPromptModal: vi.fn(),
    handleCloseSlotPromptModal: vi.fn(),
    handleSaveSlotPrompt: vi.fn(),
  };
}

describe("MascotAnimationProcessingStep", () => {
  it("renders Step 3 title, readiness counter, style tabs, and exactly 20 slot cards", () => {
    const stylesState = createMockStylesState();
    const onBackStep = vi.fn();
    const onNextStep = vi.fn();

    render(
      <MascotAnimationProcessingStep
        editingMascot={mockMascot}
        stylesState={stylesState as any}
        onBackStep={onBackStep}
        onNextStep={onNextStep}
      />,
      { wrapper },
    );

    // Header & Badge
    expect(screen.getByText(/Step 3: Animation Video Processing Studio/i)).toBeTruthy();
    expect(screen.getByText("Video Animation Pipeline")).toBeTruthy();
    expect(screen.getByText("0 / 20")).toBeTruthy();

    // Style tabs
    expect(screen.getByText(/Core Style/i)).toBeTruthy();
    expect(screen.getByText("Cyber Punk")).toBeTruthy();

    // Two State Columns
    expect(screen.getByText("Thinking Animations")).toBeTruthy();
    expect(screen.getByText("Celebrate Animations")).toBeTruthy();

    // Verify 10 thinking slots and 10 celebrate slots
    const slot1Labels = screen.getAllByText("Slot 1");
    expect(slot1Labels.length).toBe(2); // one in thinking, one in celebrate
    const slot10Labels = screen.getAllByText("Slot 10");
    expect(slot10Labels.length).toBe(2);

    // Navigation buttons
    const backBtn = screen.getByRole("button", { name: /back to expressive states/i });
    const nextBtn = screen.getByRole("button", { name: /next: motion studio & preview/i });

    expect(backBtn).toBeTruthy();
    expect(nextBtn).toBeTruthy();

    fireEvent.click(backBtn);
    expect(onBackStep).toHaveBeenCalledTimes(1);

    fireEvent.click(nextBtn);
    expect(onNextStep).toHaveBeenCalledTimes(1);
  });
});
