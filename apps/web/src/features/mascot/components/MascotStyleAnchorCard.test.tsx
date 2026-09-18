import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import type { MascotProfile, MascotStyle } from "@studio/shared";
import { LanguageProvider } from "../../../i18n";
import { MascotStyleAnchorCard } from "./MascotStyleAnchorCard";

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
});
