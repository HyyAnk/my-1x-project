import type React from "react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { LanguageProvider } from "../../../i18n";
import { SandboxPresetSelector } from "./SandboxPresetSelector";
import type { VisualPresetItem } from "../hooks/useSandboxPresets";

const wrapper = ({ children }: { children: React.ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;

const mockBuiltIn: VisualPresetItem = {
  id: "builtin_1",
  name: "BuiltIn Classic",
  description: "Built-in preset description",
  icon: "🎨",
  theme: "candy_arcade",
  palette_id: "lime",
  preview_layout_id: "media_left_choices_right",
  thinking_bar_style: "star_slider",
  question_box_style: "candy_pop",
  answer_card_style: "glossy_arcade",
  counter_style: "hanging_woodsign",
  background_style: "candy_rays",
  isBuiltIn: true,
};

const mockCustom: VisualPresetItem = {
  id: "custom_1",
  name: "My Custom Preset",
  description: "Custom preset description",
  icon: "🎨",
  theme: "space_lab",
  palette_id: "purple",
  preview_layout_id: "media_left_choices_right",
  thinking_bar_style: "energy_laser",
  question_box_style: "comic_pop",
  answer_card_style: "comic_panel",
  counter_style: "comic_badge",
  background_style: "candy_rays",
  isBuiltIn: false,
};

describe("SandboxPresetSelector", () => {
  afterEach(() => {
    cleanup();
  });
  it("renders presets and triggers load on select change", () => {
    const onLoadPreset = vi.fn();
    render(
      <SandboxPresetSelector
        allPresets={[mockBuiltIn, mockCustom]}
        builtInPresets={[mockBuiltIn]}
        customPresets={[mockCustom]}
        matchedPreset={mockBuiltIn}
        onLoadPreset={onLoadPreset}
        onOpenSaveModal={vi.fn()}
        onDeleteCustomPreset={vi.fn()}
      />,
      { wrapper },
    );

    const select = screen.getByRole("combobox");
    expect(select).toBeDefined();

    fireEvent.change(select, { target: { value: "custom_1" } });
    expect(onLoadPreset).toHaveBeenCalledWith(mockCustom);
  });

  it("shows overwrite button when canUpdateActivePreset is true and fires callback", () => {
    const onUpdateActivePreset = vi.fn();
    render(
      <SandboxPresetSelector
        allPresets={[mockBuiltIn, mockCustom]}
        builtInPresets={[mockBuiltIn]}
        customPresets={[mockCustom]}
        matchedPreset={null}
        activeCustomPreset={mockCustom}
        loadedPresetId={mockCustom.id}
        loadedPreset={mockCustom}
        canUpdateActivePreset={true}
        onLoadPreset={vi.fn()}
        onOpenSaveModal={vi.fn()}
        onDeleteCustomPreset={vi.fn()}
        onUpdateActivePreset={onUpdateActivePreset}
      />,
      { wrapper },
    );

    // Overwrite button should be present
    const overwriteBtn = screen.getByRole("button", { name: /Cập nhật đè|Update/i });
    expect(overwriteBtn).toBeDefined();

    fireEvent.click(overwriteBtn);
    expect(onUpdateActivePreset).toHaveBeenCalled();
  });

  it("opens manager modal when clicking manage button", () => {
    render(
      <SandboxPresetSelector
        allPresets={[mockBuiltIn, mockCustom]}
        builtInPresets={[mockBuiltIn]}
        customPresets={[mockCustom]}
        matchedPreset={mockBuiltIn}
        onLoadPreset={vi.fn()}
        onOpenSaveModal={vi.fn()}
        onDeleteCustomPreset={vi.fn()}
      />,
      { wrapper },
    );

    const manageBtn = screen.getByRole("button", { name: /Quản lý|Manage/i });
    expect(manageBtn).toBeDefined();

    fireEvent.click(manageBtn);
    // Manager modal header should now be visible
    expect(screen.getByText(/Quản lý Style Presets|Style Preset Manager/i)).toBeDefined();
  });
});
