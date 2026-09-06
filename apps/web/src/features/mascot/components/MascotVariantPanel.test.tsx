import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import type { MascotProfile, MascotStyle } from "@studio/shared";
import { LanguageProvider } from "../../../i18n";
import { MascotVariantPanel } from "./MascotVariantPanel";

const wrapper = ({ children }: { children: React.ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;

afterEach(() => {
  cleanup();
});

const style: MascotStyle = {
  id: "style_hero",
  name: "Hero Cape",
  keyword: "hero",
  is_default: true,
  states: {
    thinking: [
      { id: "t1", slot_index: 1, image_url: "https://example.com/t1.png", motion_preset: "sway" },
      { id: "t3", slot_index: 3, image_url: "https://example.com/t3.png" },
    ],
    celebrate: [],
  },
  created_at: "2026-09-05T00:00:00.000Z",
  updated_at: "2026-09-05T00:00:00.000Z",
};

const profile: MascotProfile = {
  id: "mascot_1",
  name: "Milo",
  description: "",
  visual_style: "pixar_3d",
  master_prompt: "",
  master_image_url: null,
  color_theme: "#06b6d4",
  actions: {},
  styles: [style],
  assigned_channel_ids: [],
  created_at: "2026-09-05T00:00:00.000Z",
  updated_at: "2026-09-05T00:00:00.000Z",
};

function renderPanel(overrides: Partial<Parameters<typeof MascotVariantPanel>[0]> = {}) {
  const props: Parameters<typeof MascotVariantPanel>[0] = {
    editingMascot: profile,
    activeStyle: style,
    previewStyleId: null,
    onPreviewStyleChange: vi.fn(),
    activePreviewAction: "thinking",
    variants: style.states.thinking,
    activeVariantIndex: 0,
    onSelectVariantIndex: vi.fn(),
    ...overrides,
  };
  return render(<MascotVariantPanel {...props} />, { wrapper });
}

describe("MascotVariantPanel", () => {
  it("renders a thumbnail card per filled variant with slot labels", () => {
    renderPanel();
    expect(screen.getByAltText("Slot 1")).toBeTruthy();
    expect(screen.getByAltText("Slot 3")).toBeTruthy();
    expect(screen.getByText("2 available")).toBeTruthy();
  });

  it("emits the selected variant index", () => {
    const onSelectVariantIndex = vi.fn();
    renderPanel({ onSelectVariantIndex });
    fireEvent.click(screen.getByAltText("Slot 3").closest("button")!);
    expect(onSelectVariantIndex).toHaveBeenCalledWith(1);
  });

  it("emits the selected style through the style selector", () => {
    const onPreviewStyleChange = vi.fn();
    renderPanel({ onPreviewStyleChange });
    fireEvent.change(screen.getByLabelText(/Preview Style/i), { target: { value: "style_hero" } });
    expect(onPreviewStyleChange).toHaveBeenCalledWith("style_hero");
  });

  it("shows the empty state when the style has no filled variants", () => {
    renderPanel({
      activePreviewAction: "celebrate",
      variants: style.states.celebrate,
    });
    expect(screen.getByText(/No Celebrate variants generated/i)).toBeTruthy();
  });

  it("marks the active variant card as selected", () => {
    renderPanel({ activeVariantIndex: 1 });
    const selectedCard = screen.getByAltText("Slot 3").closest("button");
    expect(selectedCard?.className).toContain("is-selected");
  });
});
