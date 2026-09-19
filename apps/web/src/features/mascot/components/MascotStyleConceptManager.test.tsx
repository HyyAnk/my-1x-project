import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import type { MascotProfile } from "@studio/shared";
import { LanguageProvider } from "../../../i18n";
import { MascotStyleConceptManager } from "./MascotStyleConceptManager";

const wrapper = ({ children }: { children: React.ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;

afterEach(() => {
  cleanup();
});

const mockMascotAi: MascotProfile = {
  id: "mascot_ai",
  name: "Barnaby the Bear",
  description: "A studious brown bear",
  visual_style: "pixar_3d",
  master_prompt: "brown bear reading a book",
  master_image_url: "/api/mascots/mascot_ai/assets/master_concept.png",
  master_raw_image_url: "/api/mascots/mascot_ai/assets/master_concept_raw.png",
  concept_origin: "ai_generated",
  color_theme: "#06b6d4",
  actions: {},
  styles: [],
  assigned_channel_ids: [],
  created_at: "2026-09-01T00:00:00.000Z",
  updated_at: "2026-09-01T00:00:00.000Z",
};

const mockMascotUploaded: MascotProfile = {
  id: "mascot_uploaded",
  name: "Pixel Pup",
  description: "A futuristic robotic puppy",
  visual_style: "kawaii_chibi",
  master_prompt: "",
  master_image_url: "/uploads/mascots/mascot_uploaded/concept_cutout.png",
  master_raw_image_url: "/uploads/mascots/mascot_uploaded/concept_raw.png",
  concept_origin: "user_uploaded",
  color_theme: "#a855f7",
  actions: {},
  styles: [
    {
      id: "core",
      name: "Core Style",
      keyword: "",
      anchor_image_url: "/uploads/mascots/mascot_uploaded/concept_cutout.png",
      raw_anchor_image_url: "/uploads/mascots/mascot_uploaded/concept_raw.png",
      is_default: true,
      states: { thinking: [], celebrate: [] },
      created_at: "2026-09-01T00:00:00.000Z",
      updated_at: "2026-09-01T00:00:00.000Z",
    },
    {
      id: "cyberpunk",
      name: "Cyberpunk",
      keyword: "neon visor",
      anchor_image_url: null,
      raw_anchor_image_url: null,
      is_default: false,
      states: { thinking: [], celebrate: [] },
      created_at: "2026-09-01T00:00:00.000Z",
      updated_at: "2026-09-01T00:00:00.000Z",
    },
  ],
  assigned_channel_ids: [],
  created_at: "2026-09-01T00:00:00.000Z",
  updated_at: "2026-09-01T00:00:00.000Z",
};

describe("MascotStyleConceptManager", () => {
  it("renders Style Concepts title and synthesizes Core Style if not present", () => {
    render(<MascotStyleConceptManager editingMascot={mockMascotAi} />, { wrapper });

    expect(screen.getByText("Style Concepts & Identity Anchors")).toBeDefined();
    expect(screen.getByText("Core Style")).toBeDefined();
    expect(screen.getByText(/Core Concept/i)).toBeDefined();
  });

  it("renders uploaded master notice banner and origin badges when concept_origin is user_uploaded", () => {
    render(<MascotStyleConceptManager editingMascot={mockMascotUploaded} />, { wrapper });

    // Banner verification
    expect(
      screen.getByText("Custom style concepts and expressive poses are anchored to your uploaded Master Concept."),
    ).toBeDefined();

    // Core Style card reflects user_uploaded origin badge
    expect(screen.getByText("Master Concept (Uploaded)")).toBeDefined();
    expect(screen.getByText("Anchored directly to uploaded master concept")).toBeDefined();

    // Custom style card displays anchor reference hint
    expect(screen.getByText("Anchor: Uploaded Master")).toBeDefined();
    expect(screen.getByText("Anchored to uploaded master concept reference")).toBeDefined();
  });

  it("does not render uploaded banner when concept_origin is ai_generated", () => {
    render(<MascotStyleConceptManager editingMascot={mockMascotAi} />, { wrapper });

    expect(
      screen.queryByText("Custom style concepts and expressive poses are anchored to your uploaded Master Concept."),
    ).toBeNull();
    expect(screen.queryByText("Master Concept (Uploaded)")).toBeNull();
  });

  it("renders Add Style buttons and opens modal when stylesState is passed", () => {
    const setIsCreateModalOpen = vi.fn();
    const mockStylesState = {
      isCreateModalOpen: false,
      setIsCreateModalOpen,
      handleCreateStyle: vi.fn(),
      handleQueueAllMissingStyles: vi.fn(),
      styleQueueProgress: null,
    } as any;

    render(<MascotStyleConceptManager editingMascot={mockMascotUploaded} stylesState={mockStylesState} />, { wrapper });

    const addButtons = screen.getAllByTitle("Add Style");
    expect(addButtons.length).toBeGreaterThan(0);

    fireEvent.click(addButtons[0]);
    expect(setIsCreateModalOpen).toHaveBeenCalledWith(true);
  });

  it("renders Queue All Missing button when at least 2 custom styles miss anchor images", () => {
    const handleQueueAllMissingStyles = vi.fn();
    const mascotWithMissing: MascotProfile = {
      ...mockMascotUploaded,
      styles: [
        ...(mockMascotUploaded.styles || []),
        {
          id: "medieval",
          name: "Medieval",
          keyword: "knight armor",
          anchor_image_url: null,
          raw_anchor_image_url: null,
          is_default: false,
          states: { thinking: [], celebrate: [] },
          created_at: "2026-09-01T00:00:00.000Z",
          updated_at: "2026-09-01T00:00:00.000Z",
        },
      ],
    };

    const mockStylesState = {
      isCreateModalOpen: false,
      setIsCreateModalOpen: vi.fn(),
      handleCreateStyle: vi.fn(),
      handleQueueAllMissingStyles,
      styleQueueProgress: null,
    } as any;

    render(<MascotStyleConceptManager editingMascot={mascotWithMissing} stylesState={mockStylesState} />, { wrapper });

    const queueAllBtn = screen.getByTitle("Queue All Missing (2)");
    expect(queueAllBtn).toBeDefined();

    fireEvent.click(queueAllBtn);
    expect(handleQueueAllMissingStyles).toHaveBeenCalledOnce();
  });
});
