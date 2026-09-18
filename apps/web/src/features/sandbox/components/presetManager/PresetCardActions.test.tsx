import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { LanguageProvider } from "../../../../i18n";
import type { VisualPresetItem } from "../../hooks/useSandboxPresets";
import { PresetCardActions } from "./PresetCardActions";
import { PresetManagerCard } from "./PresetManagerCard";

const wrapper = ({ children }: { children: React.ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;

afterEach(() => {
  cleanup();
});

const mockPreset: VisualPresetItem = {
  id: "custom_preset_1",
  name: "Custom Theme",
  description: "Test description",
  icon: "🎨",
  theme: "candy_arcade",
  palette_id: "lime",
  preview_layout_id: "media_left_choices_right",
  thinking_bar_style: "star_slider",
  question_box_style: "candy_pop",
  answer_card_style: "glossy_arcade",
  counter_style: "hanging_woodsign",
  background_style: "candy_rays",
  isBuiltIn: false,
};

describe("PresetCardActions", () => {
  it("triggers load, duplicate, overwrite, and start edit for custom preset", () => {
    const onLoadPreset = vi.fn();
    const onUpdateActivePreset = vi.fn();
    const onStartEdit = vi.fn();
    const onDuplicatePreset = vi.fn();
    const onRequestDelete = vi.fn();
    const onConfirmDelete = vi.fn();
    const onCancelDelete = vi.fn();

    render(
      <PresetCardActions
        preset={mockPreset}
        isCustom={true}
        isEditing={false}
        isConfirmingDelete={false}
        onLoadPreset={onLoadPreset}
        onUpdateActivePreset={onUpdateActivePreset}
        onStartEdit={onStartEdit}
        onDuplicatePreset={onDuplicatePreset}
        onRequestDelete={onRequestDelete}
        onConfirmDelete={onConfirmDelete}
        onCancelDelete={onCancelDelete}
      />,
      { wrapper },
    );

    fireEvent.click(screen.getByRole("button", { name: /Load/i }));
    expect(onLoadPreset).toHaveBeenCalledWith(mockPreset);

    fireEvent.click(screen.getByRole("button", { name: /Overwrite/i }));
    expect(onUpdateActivePreset).toHaveBeenCalledWith("custom_preset_1");

    fireEvent.click(screen.getByTitle("Edit name & description"));
    expect(onStartEdit).toHaveBeenCalledWith(mockPreset);

    fireEvent.click(screen.getByTitle("Duplicate this preset"));
    expect(onDuplicatePreset).toHaveBeenCalledWith(mockPreset);

    fireEvent.click(screen.getByTitle("Delete this custom preset"));
    expect(onRequestDelete).toHaveBeenCalledWith("custom_preset_1");
  });

  it("shows confirm and cancel delete buttons when isConfirmingDelete is true", () => {
    const onConfirmDelete = vi.fn();
    const onCancelDelete = vi.fn();

    render(
      <PresetCardActions
        preset={mockPreset}
        isCustom={true}
        isEditing={false}
        isConfirmingDelete={true}
        onLoadPreset={vi.fn()}
        onUpdateActivePreset={vi.fn()}
        onStartEdit={vi.fn()}
        onDuplicatePreset={vi.fn()}
        onRequestDelete={vi.fn()}
        onConfirmDelete={onConfirmDelete}
        onCancelDelete={onCancelDelete}
      />,
      { wrapper },
    );

    fireEvent.click(screen.getByRole("button", { name: /Confirm|Xác nhận/i }));
    expect(onConfirmDelete).toHaveBeenCalledWith("custom_preset_1");

    fireEvent.click(screen.getByRole("button", { name: /Cancel|Hủy/i }));
    expect(onCancelDelete).toHaveBeenCalledOnce();
  });
});

describe("PresetManagerCard", () => {
  it("renders preset information, badges, slots summary, and actions", () => {
    render(
      <PresetManagerCard
        preset={mockPreset}
        isLoaded={true}
        isEditing={false}
        isConfirmingDelete={false}
        editName=""
        editDesc=""
        onChangeEditName={vi.fn()}
        onChangeEditDesc={vi.fn()}
        onStartEdit={vi.fn()}
        onSaveEdit={vi.fn()}
        onCancelEdit={vi.fn()}
        onLoadPreset={vi.fn()}
        onUpdateActivePreset={vi.fn()}
        onDuplicatePreset={vi.fn()}
        onRequestDelete={vi.fn()}
        onConfirmDelete={vi.fn()}
        onCancelDelete={vi.fn()}
      />,
      { wrapper },
    );

    expect(screen.getByText("Custom Theme")).toBeDefined();
    expect(screen.getByText("Test description")).toBeDefined();
    expect(screen.getByText("Custom")).toBeDefined();
    expect(screen.getByText("Active on Canvas")).toBeDefined();
    expect(screen.getByText(/lime/)).toBeDefined();
  });
});
