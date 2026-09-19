import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import type { MascotProfile } from "@studio/shared";
import { LanguageProvider } from "../../../i18n";
import { MascotConceptPreviewCard, type MascotConceptPreviewCardProps } from "./MascotConceptPreviewCard";

const wrapper = ({ children }: { children: React.ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;

afterEach(() => {
  cleanup();
});

const mockBaseMascot: MascotProfile = {
  id: "mascot_preview_1",
  name: "Gigi the Giraffe",
  description: "A tall friendly giraffe",
  visual_style: "flat_vector",
  master_prompt: "friendly cartoon giraffe",
  master_image_url: "https://example.com/giraffe_cutout.png",
  master_raw_image_url: "https://example.com/giraffe_raw.png",
  color_theme: "#eab308",
  actions: {},
  styles: [],
  active_style_id: "core",
  assigned_channel_ids: [],
  created_at: "2026-09-01T00:00:00.000Z",
  updated_at: "2026-09-01T00:00:00.000Z",
};

function renderPreviewCard(props: Partial<MascotConceptPreviewCardProps> = {}) {
  const defaultProps: MascotConceptPreviewCardProps = {
    editingMascot: mockBaseMascot,
    genColor: "#eab308",
    genStyle: "flat_vector",
    busyAction: null,
    itemProgress: 0,
    currentStageMessage: "",
    generationElapsed: 0,
    onZoomPreview: vi.fn(),
    onRemoveBackground: vi.fn(),
    ...props,
  };

  return {
    ...render(<MascotConceptPreviewCard {...defaultProps} />, { wrapper }),
    props: defaultProps,
  };
}

describe("MascotConceptPreviewCard", () => {
  it("renders placeholder when no master image is available", () => {
    renderPreviewCard({
      editingMascot: { ...mockBaseMascot, master_image_url: null, master_raw_image_url: null },
    });

    expect(screen.getByText(/Click 'Generate Master Concept' or upload an image/i)).toBeTruthy();
  });

  it("renders master image and identity locked status when master image is set", () => {
    renderPreviewCard();

    const img = screen.getByAltText("Master Concept") as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.src).toBe("https://example.com/giraffe_cutout.png");
    expect(screen.getByText("Identity Locked")).toBeTruthy();
    expect(screen.getByText("Style:")).toBeTruthy();
  });

  it("displays Custom Uploaded Concept badge when concept_origin is user_uploaded", () => {
    renderPreviewCard({
      editingMascot: { ...mockBaseMascot, concept_origin: "user_uploaded" },
    });

    const badge = screen.getByTestId("uploaded-origin-badge");
    expect(badge).toBeTruthy();
    expect(badge.textContent).toContain("Custom Uploaded Concept");

    const metaOrigin = screen.getByTestId("meta-concept-origin");
    expect(metaOrigin).toBeTruthy();
    expect(metaOrigin.textContent).toContain("Custom Uploaded Concept");
  });

  it("does not display Custom Uploaded Concept badge when concept_origin is ai_generated or undefined", () => {
    renderPreviewCard({
      editingMascot: { ...mockBaseMascot, concept_origin: "ai_generated" },
    });

    expect(screen.queryByTestId("uploaded-origin-badge")).toBeNull();
    expect(screen.queryByTestId("meta-concept-origin")).toBeNull();
  });

  it("triggers onRemoveBackground with 'master' target on button click", () => {
    const { props } = renderPreviewCard();

    const mattingBtn = screen.getByTestId("matting-master-btn");
    expect(mattingBtn).toBeTruthy();

    fireEvent.click(mattingBtn);
    expect(props.onRemoveBackground).toHaveBeenCalledWith("master");
  });

  it("renders download links for RAW original and PNG cutout", () => {
    renderPreviewCard();

    const rawLink = screen.getByTestId("download-raw-btn") as HTMLAnchorElement;
    expect(rawLink).toBeTruthy();
    expect(rawLink.getAttribute("href")).toBe("https://example.com/giraffe_raw.png");
    expect(rawLink.getAttribute("download")).toContain("_master_raw.png");

    const cutoutLink = screen.getByTestId("download-cutout-btn") as HTMLAnchorElement;
    expect(cutoutLink).toBeTruthy();
    expect(cutoutLink.getAttribute("href")).toBe("https://example.com/giraffe_cutout.png");
    expect(cutoutLink.getAttribute("download")).toContain("_master_cutout.png");
  });
});
