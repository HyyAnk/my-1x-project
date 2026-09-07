import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import type { MascotProfile, MascotStyle } from "@studio/shared";
import { LanguageProvider } from "../../../i18n";
import { MascotConceptStep, type MascotConceptStepProps } from "./MascotConceptStep";

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

const mockMascotWithMaster: MascotProfile = {
  id: "mascot_1",
  name: "Captain Quill",
  description: "A brave pirate parrot",
  visual_style: "flat_vector",
  master_prompt: "pirate parrot with hat",
  master_image_url: "https://example.com/master-quill.png",
  color_theme: "#06b6d4",
  actions: {},
  styles: [mockCoreStyle],
  active_style_id: "core",
  assigned_channel_ids: [],
  created_at: "2026-09-01T00:00:00.000Z",
  updated_at: "2026-09-01T00:00:00.000Z",
};

const mockMascotNoMaster: MascotProfile = {
  ...mockMascotWithMaster,
  master_image_url: null,
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

function renderConceptStep(overrides: Partial<MascotConceptStepProps> = {}) {
  const defaultProps: MascotConceptStepProps = {
    genName: "Captain Quill",
    setGenName: vi.fn(),
    genDescription: "Pirate mascot",
    setGenDescription: vi.fn(),
    genStyle: "flat_vector",
    setGenStyle: vi.fn(),
    genColor: "#06b6d4",
    setGenColor: vi.fn(),
    genPrompt: "pirate parrot",
    setGenPrompt: vi.fn(),
    editingMascot: mockMascotNoMaster,
    busyAction: null,
    generationElapsed: 0,
    itemProgress: 0,
    currentStageMessage: "",
    showNotesAccordion: false,
    setShowNotesAccordion: vi.fn(),
    promptCopied: false,
    lightboxImage: null,
    setLightboxImage: vi.fn(),
    isPromptModalOpen: false,
    setIsPromptModalOpen: vi.fn(),
    savingIdentity: false,
    stylesState: createMockStylesState() as unknown as MascotConceptStepProps["stylesState"],
    onInjectTag: vi.fn(),
    onApplyTemplate: vi.fn(),
    onCopyPrompt: vi.fn(),
    onGenerateConcept: vi.fn(),
    onSaveIdentity: vi.fn(),
    onRemoveBackground: vi.fn(),
    onNextStep: vi.fn(),
    ...overrides,
  };

  return render(<MascotConceptStep {...defaultProps} />, { wrapper });
}

describe("MascotConceptStep (2-Tier Studio Layout)", () => {
  it("renders Tier 1 Identity Form and Master Preview Canvas", () => {
    const { container } = renderConceptStep();
    expect(container.querySelector(".concept-tier-identity-grid")).toBeTruthy();
    expect(screen.getByDisplayValue("Captain Quill")).toBeTruthy();
    expect(screen.getByDisplayValue("pirate parrot")).toBeTruthy();
  });

  it("does not render Tier 2 Style Themes Deck when master_image_url is absent", () => {
    const { container } = renderConceptStep({ editingMascot: mockMascotNoMaster });
    expect(container.querySelector(".concept-tier-styles-deck")).toBeNull();
  });

  it("renders Tier 2 Style Themes Deck when master_image_url is present", () => {
    const { container } = renderConceptStep({ editingMascot: mockMascotWithMaster });
    expect(container.querySelector(".concept-tier-styles-deck")).toBeTruthy();
    expect(screen.getByText("Core Style")).toBeTruthy();
  });

  it("triggers setIsCreateModalOpen when clicking the + Add Style card in Tier 2", () => {
    const stylesState = createMockStylesState();
    renderConceptStep({
      editingMascot: mockMascotWithMaster,
      stylesState: stylesState as unknown as MascotConceptStepProps["stylesState"],
    });

    const addCards = screen.getAllByTitle("Add Style");
    expect(addCards.length).toBeGreaterThan(0);
    fireEvent.click(addCards[0]);
    expect(stylesState.setIsCreateModalOpen).toHaveBeenCalledWith(true);
  });

  it("disables custom style buttons and marks placeholder busy when another style is generating", () => {
    const customStyle: MascotStyle = {
      id: "style_detective",
      name: "Detective",
      keyword: "detective, trenchcoat",
      is_default: false,
      anchor_image_url: null,
      states: { thinking: [], celebrate: [] },
      created_at: "2026-09-01T00:00:00.000Z",
      updated_at: "2026-09-01T00:00:00.000Z",
    };

    const mascotWithTwoStyles: MascotProfile = {
      ...mockMascotWithMaster,
      styles: [mockCoreStyle, customStyle],
    };

    const stylesState = {
      ...createMockStylesState(),
      generatingConceptStyleId: "core", // another style is generating!
    };

    const { container } = renderConceptStep({
      editingMascot: mascotWithTwoStyles,
      stylesState: stylesState as unknown as MascotConceptStepProps["stylesState"],
    });

    // Check placeholder on custom style has is-busy class
    const emptyPlaceholder = container.querySelector(".style-anchor-empty-placeholder");
    expect(emptyPlaceholder?.classList.contains("is-busy")).toBe(true);

    // Verify Generate Style Concept button is disabled
    const generateBtn = screen.getByTitle("Generate Style Concept");
    expect(generateBtn).toHaveProperty("disabled", true);
  });

  it("correctly parses keywords separated by commas, semicolons, and newlines into discrete chips", () => {
    const customStyle: MascotStyle = {
      id: "style_steampunk",
      name: "Steampunk",
      keyword: "steampunk; goggles, brass\nclockwork",
      is_default: false,
      anchor_image_url: null,
      states: { thinking: [], celebrate: [] },
      created_at: "2026-09-01T00:00:00.000Z",
      updated_at: "2026-09-01T00:00:00.000Z",
    };

    const mascotWithStyle: MascotProfile = {
      ...mockMascotWithMaster,
      styles: [mockCoreStyle, customStyle],
    };

    renderConceptStep({
      editingMascot: mascotWithStyle,
    });

    expect(screen.getByText("steampunk")).toBeTruthy();
    expect(screen.getByText("goggles")).toBeTruthy();
    expect(screen.getByText("+2")).toBeTruthy();
  });
});
