import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import type { MascotProfile, MascotStyle } from "@studio/shared";
import { LanguageProvider } from "../../../i18n";
import { MascotStyleAnchorCard, type MascotStyleAnchorCardState } from "./MascotStyleAnchorCard";

const wrapper = ({ children }: { children: React.ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;

afterEach(() => {
  cleanup();
});

const mockMascot: MascotProfile = {
  id: "mascot_test",
  name: "Captain Quill",
  description: "A brave pirate parrot",
  visual_style: "pixar_3d",
  master_prompt: "pirate parrot with tricorn hat",
  master_image_url: "/api/mascots/mascot_test/assets/master_concept_123.png",
  master_raw_image_url: "/api/mascots/mascot_test/assets/master_concept_raw_123.png",
  color_theme: "#06b6d4",
  actions: {},
  styles: [],
  assigned_channel_ids: [],
  created_at: "2026-09-01T00:00:00.000Z",
  updated_at: "2026-09-01T00:00:00.000Z",
};

const mockCustomStyleWithRaw: MascotStyle = {
  id: "cyberpunk",
  name: "Cyberpunk",
  keyword: "neon visor, cybernetic wings",
  anchor_image_url: "/api/mascots/mascot_test/assets/style_cyberpunk_anchor_456.png",
  raw_anchor_image_url: "/api/mascots/mascot_test/assets/style_cyberpunk_anchor_raw_456.png",
  is_default: false,
  states: { thinking: [], celebrate: [] },
  created_at: "2026-09-01T00:00:00.000Z",
  updated_at: "2026-09-01T00:00:00.000Z",
};

function createStylesState(overrides: Partial<MascotStyleAnchorCardState> = {}): MascotStyleAnchorCardState {
  return {
    generatingConceptStyleId: null,
    activeStyleIds: [],
    queuedStyleIds: [],
    handleQueueStyle: vi.fn(async () => undefined),
    handleGenerateStyleConcept: vi.fn(async () => undefined),
    handleUpdateStyle: vi.fn(async () => undefined),
    handleDeleteStyle: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("MascotStyleAnchorCard", () => {
  it("renders both RAW and PNG download buttons when raw image is present", () => {
    const onOpenLightbox = vi.fn();
    render(<MascotStyleAnchorCard style={mockCustomStyleWithRaw} editingMascot={mockMascot} onOpenLightbox={onOpenLightbox} />, {
      wrapper,
    });

    const rawDownloadBtn = screen.getByTitle("Download Original (Raw Background)");
    expect(rawDownloadBtn).toBeDefined();
    expect(rawDownloadBtn.getAttribute("href")).toBe("/api/mascots/mascot_test/assets/style_cyberpunk_anchor_raw_456.png");
    expect(rawDownloadBtn.getAttribute("download")).toBe("captain_quill_cyberpunk_raw.png");

    const cutoutDownloadBtn = screen.getByTitle("Download Cutout (Transparent PNG)");
    expect(cutoutDownloadBtn).toBeDefined();
    expect(cutoutDownloadBtn.getAttribute("href")).toBe("/api/mascots/mascot_test/assets/style_cyberpunk_anchor_456.png");
    expect(cutoutDownloadBtn.getAttribute("download")).toBe("captain_quill_cyberpunk_cutout.png");

    // Clicking download must not trigger lightbox
    fireEvent.click(rawDownloadBtn);
    expect(onOpenLightbox).not.toHaveBeenCalled();

    fireEvent.click(cutoutDownloadBtn);
    expect(onOpenLightbox).not.toHaveBeenCalled();
  });

  it("renders zoom preview button and triggers lightbox when clicked", () => {
    const onOpenLightbox = vi.fn();
    render(<MascotStyleAnchorCard style={mockCustomStyleWithRaw} editingMascot={mockMascot} onOpenLightbox={onOpenLightbox} />, {
      wrapper,
    });

    const zoomBtn = screen.getByTitle("Zoom & Inspect");
    expect(zoomBtn).toBeDefined();

    fireEvent.click(zoomBtn);
    expect(onOpenLightbox).toHaveBeenCalledWith("/api/mascots/mascot_test/assets/style_cyberpunk_anchor_456.png");
  });

  it("renders Core style with master raw and cutout URLs", () => {
    const coreStyle: MascotStyle = {
      id: "core",
      name: "Core Style",
      keyword: "",
      is_default: true,
      anchor_image_url: null,
      raw_anchor_image_url: null,
      states: { thinking: [], celebrate: [] },
      created_at: "2026-09-01T00:00:00.000Z",
      updated_at: "2026-09-01T00:00:00.000Z",
    };

    render(<MascotStyleAnchorCard style={coreStyle} editingMascot={mockMascot} />, { wrapper });

    const rawDownloadBtn = screen.getByTitle("Download Original (Raw Background)");
    expect(rawDownloadBtn.getAttribute("href")).toBe("/api/mascots/mascot_test/assets/master_concept_raw_123.png");

    const cutoutDownloadBtn = screen.getByTitle("Download Cutout (Transparent PNG)");
    expect(cutoutDownloadBtn.getAttribute("href")).toBe("/api/mascots/mascot_test/assets/master_concept_123.png");
  });

  it("derives raw URL from convention when style.anchor_image_url contains _anchor_", () => {
    const styleDerivedRaw: MascotStyle = {
      id: "steampunk",
      name: "Steampunk",
      keyword: "brass goggles",
      anchor_image_url: "/api/mascots/mascot_test/assets/style_steampunk_anchor_789.png",
      raw_anchor_image_url: null,
      is_default: false,
      states: { thinking: [], celebrate: [] },
      created_at: "2026-09-01T00:00:00.000Z",
      updated_at: "2026-09-01T00:00:00.000Z",
    };

    render(<MascotStyleAnchorCard style={styleDerivedRaw} editingMascot={mockMascot} />, { wrapper });

    const rawDownloadBtn = screen.getByTitle("Download Original (Raw Background)");
    expect(rawDownloadBtn.getAttribute("href")).toBe("/api/mascots/mascot_test/assets/style_steampunk_anchor_raw_789.png");
  });

  it("renders Master Concept (Uploaded) badge and uploaded note for core style when concept_origin is user_uploaded", () => {
    const uploadedMascot: MascotProfile = {
      ...mockMascot,
      concept_origin: "user_uploaded",
      master_image_url: "/uploads/custom_owl_cutout.png",
      master_raw_image_url: "/uploads/custom_owl_raw.png",
    };

    const coreStyle: MascotStyle = {
      id: "core",
      name: "Core Style",
      keyword: "",
      is_default: true,
      anchor_image_url: "/uploads/custom_owl_cutout.png",
      raw_anchor_image_url: "/uploads/custom_owl_raw.png",
      states: { thinking: [], celebrate: [] },
      created_at: "2026-09-01T00:00:00.000Z",
      updated_at: "2026-09-01T00:00:00.000Z",
    };

    render(<MascotStyleAnchorCard style={coreStyle} editingMascot={uploadedMascot} />, { wrapper });

    expect(screen.getByText("Master Concept (Uploaded)")).toBeDefined();
    expect(screen.getByText("Anchored directly to uploaded master concept")).toBeDefined();
    expect(screen.queryByTitle("Generate Style Concept")).toBeNull();
    expect(screen.queryByTitle("Re-roll Concept")).toBeNull();
  });

  it("renders uploaded master anchor reference chip and hint on custom style cards when concept_origin is user_uploaded", () => {
    const uploadedMascot: MascotProfile = {
      ...mockMascot,
      concept_origin: "user_uploaded",
      master_image_url: "/uploads/custom_owl_cutout.png",
    };

    render(<MascotStyleAnchorCard style={mockCustomStyleWithRaw} editingMascot={uploadedMascot} />, { wrapper });

    expect(screen.getByText("Anchor: Uploaded Master")).toBeDefined();
    expect(screen.getByText("Anchored to uploaded master concept reference")).toBeDefined();
  });

  it("passes a trimmed prompt to the style generation queue", () => {
    const handleQueueStyle = vi.fn();
    const styleWithoutAnchor: MascotStyle = {
      ...mockCustomStyleWithRaw,
      built_in_preset_id: "preset_cyber_neon",
      anchor_image_url: null,
      raw_anchor_image_url: null,
    };
    const stylesState = createStylesState({ handleQueueStyle });

    render(<MascotStyleAnchorCard style={styleWithoutAnchor} editingMascot={mockMascot} stylesState={stylesState} />, {
      wrapper,
    });

    const promptInput = screen.getByLabelText("Style prompt for Cyberpunk");
    fireEvent.change(promptInput, { target: { value: "  chrome flight suit with cyan light strips  " } });
    fireEvent.click(screen.getByTitle("Generate Style Concept"));

    expect(handleQueueStyle).toHaveBeenCalledWith("cyberpunk", "chrome flight suit with cyan light strips");
  });

  it("requires a user-authored prompt and does not fall back to preset metadata", () => {
    const handleQueueStyle = vi.fn();
    const styleWithoutPrompt: MascotStyle = {
      ...mockCustomStyleWithRaw,
      keyword: "",
      built_in_preset_id: "preset_cyber_neon",
      anchor_image_url: null,
      raw_anchor_image_url: null,
    };
    const stylesState = createStylesState({ handleQueueStyle });

    render(<MascotStyleAnchorCard style={styleWithoutPrompt} editingMascot={mockMascot} stylesState={stylesState} />, {
      wrapper,
    });

    fireEvent.click(screen.getByTitle("Generate Style Concept"));

    expect(handleQueueStyle).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toBe("Enter a prompt before generating this style");
  });

  it("prefills the prompt with the last user-authored style prompt", () => {
    const stylesState = createStylesState();

    render(<MascotStyleAnchorCard style={mockCustomStyleWithRaw} editingMascot={mockMascot} stylesState={stylesState} />, {
      wrapper,
    });

    expect((screen.getByLabelText("Style prompt for Cyberpunk") as HTMLTextAreaElement).value).toBe("neon visor, cybernetic wings");
  });

  it("uses the current prompt when regenerating an existing style concept", () => {
    const handleQueueStyle = vi.fn();
    const stylesState = createStylesState({ handleQueueStyle });

    render(<MascotStyleAnchorCard style={mockCustomStyleWithRaw} editingMascot={mockMascot} stylesState={stylesState} />, {
      wrapper,
    });

    fireEvent.change(screen.getByLabelText("Style prompt for Cyberpunk"), {
      target: { value: "sleek carbon-fiber armor" },
    });
    fireEvent.click(screen.getByTitle("Regenerate Style Concept"));

    expect(handleQueueStyle).toHaveBeenCalledWith("cyberpunk", "sleek carbon-fiber armor");
  });

  it("acknowledges a pending request immediately and prevents duplicate generation", async () => {
    let resolveRequest: (() => void) | undefined;
    const handleQueueStyle = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRequest = resolve;
        }),
    );
    const stylesState = createStylesState({ handleQueueStyle });

    render(<MascotStyleAnchorCard style={mockCustomStyleWithRaw} editingMascot={mockMascot} stylesState={stylesState} />, {
      wrapper,
    });

    const regenerateButton = screen.getByTitle("Regenerate Style Concept");
    fireEvent.click(regenerateButton);
    fireEvent.click(regenerateButton);

    expect(handleQueueStyle).toHaveBeenCalledOnce();
    expect((regenerateButton as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getAllByText("Generating Concept…").length).toBeGreaterThan(0);

    await act(async () => resolveRequest?.());
  });
});
