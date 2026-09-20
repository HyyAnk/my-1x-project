import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { BUILT_IN_PRESETS, type MascotProfile, type MascotStyle } from "@studio/shared";
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

  it("renders the preset-managed inventory without Add Style controls", () => {
    const stylesState = createMockStylesState();
    renderConceptStep({
      editingMascot: mockMascotWithMaster,
      stylesState: stylesState as unknown as MascotConceptStepProps["stylesState"],
    });

    expect(screen.queryByTitle("Add Style")).toBeNull();
    expect(stylesState.setIsCreateModalOpen).not.toHaveBeenCalled();
    for (const preset of BUILT_IN_PRESETS) {
      expect(screen.getByText(`Built-in · ${preset.name}`)).toBeTruthy();
    }
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
    const generateBtn = container.querySelector('[data-style-id="style_detective"] button[title="Generate Style Concept"]');
    expect(generateBtn).not.toBeNull();
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

  it("renders prompt focus modal when isPromptModalOpen is true", () => {
    const setIsPromptModalOpen = vi.fn();
    renderConceptStep({
      isPromptModalOpen: true,
      setIsPromptModalOpen,
    });

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("button", { name: /saved/i })).toBeTruthy();
    fireEvent.click(screen.getByLabelText(/close/i));
    expect(setIsPromptModalOpen).toHaveBeenCalledWith(false);
  });

  it("renders image lightbox modal when lightboxImage is set", () => {
    const setLightboxImage = vi.fn();
    renderConceptStep({
      lightboxImage: "https://example.com/concept-preview.png",
      setLightboxImage,
    });

    const img = screen.getByAltText("Master Concept Large Preview");
    expect(img).toBeTruthy();
    expect(img.getAttribute("src")).toBe("https://example.com/concept-preview.png");

    const closeBtn = screen.getByTitle(/close/i);
    fireEvent.click(closeBtn);
    expect(setLightboxImage).toHaveBeenCalledWith(null);
  });

  it("switches to Upload Master Concept mode when clicking mode button", () => {
    renderConceptStep();
    expect(screen.getByTestId("mode-ai-prompt-btn")).toBeTruthy();
    expect(screen.getByTestId("mode-upload-concept-btn")).toBeTruthy();

    // Initially in AI Prompt mode
    expect(screen.getByDisplayValue("Captain Quill")).toBeTruthy();

    // Click Upload Master Concept mode button
    fireEvent.click(screen.getByTestId("mode-upload-concept-btn"));

    // Dropzone should now be visible
    expect(screen.getByTestId("concept-dropzone")).toBeTruthy();
    expect(screen.getByTestId("concept-file-input")).toBeTruthy();
  });

  it("defaults to Upload Master Concept mode when editingMascot concept_origin is user_uploaded", () => {
    const uploadedMascot: MascotProfile = {
      ...mockMascotWithMaster,
      concept_origin: "user_uploaded",
    };

    renderConceptStep({ editingMascot: uploadedMascot });

    // Mode button should be active for upload
    const uploadModeBtn = screen.getByTestId("mode-upload-concept-btn");
    expect(uploadModeBtn.classList.contains("is-active")).toBe(true);

    // Dropzone should be visible
    expect(screen.getByTestId("concept-dropzone")).toBeTruthy();

    // Preview card should display the custom uploaded badge
    const badge = screen.getByTestId("uploaded-origin-badge");
    expect(badge).toBeTruthy();
    expect(badge.textContent).toContain("Custom Uploaded Concept");
  });
});
