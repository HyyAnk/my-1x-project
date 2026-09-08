import type React from "react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { LanguageProvider } from "../../../../i18n";
import { SandboxPresetManagerModal } from "../SandboxPresetManagerModal";
import type { VisualPresetItem } from "../../hooks/useSandboxPresets";

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

describe("SandboxPresetManagerModal", () => {
  afterEach(() => {
    cleanup();
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <SandboxPresetManagerModal
        isOpen={false}
        onClose={vi.fn()}
        allPresets={[mockBuiltIn, mockCustom]}
        builtInPresets={[mockBuiltIn]}
        customPresets={[mockCustom]}
        onLoadPreset={vi.fn()}
        onUpdateActivePreset={vi.fn()}
        onDuplicatePreset={vi.fn()}
        onUpdateMetadata={vi.fn()}
        onDeletePreset={vi.fn()}
      />,
      { wrapper },
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders presets and filters tabs properly", () => {
    render(
      <SandboxPresetManagerModal
        isOpen={true}
        onClose={vi.fn()}
        allPresets={[mockBuiltIn, mockCustom]}
        builtInPresets={[mockBuiltIn]}
        customPresets={[mockCustom]}
        loadedPresetId="custom_1"
        onLoadPreset={vi.fn()}
        onUpdateActivePreset={vi.fn()}
        onDuplicatePreset={vi.fn()}
        onUpdateMetadata={vi.fn()}
        onDeletePreset={vi.fn()}
      />,
      { wrapper },
    );

    expect(screen.getByText("BuiltIn Classic")).toBeDefined();
    expect(screen.getByText("My Custom Preset")).toBeDefined();

    // Click Built-in tab
    const builtInTab = screen.getByRole("button", { name: /Built-In|Hệ thống/i });
    fireEvent.click(builtInTab);

    expect(screen.getByText("BuiltIn Classic")).toBeDefined();
    expect(screen.queryByText("My Custom Preset")).toBeNull();

    // Click Custom tab
    const customTab = screen.getByRole("button", { name: /Custom|Tùy chỉnh/i });
    fireEvent.click(customTab);

    expect(screen.queryByText("BuiltIn Classic")).toBeNull();
    expect(screen.getByText("My Custom Preset")).toBeDefined();
  });

  it("triggers load and closes modal", () => {
    const onLoadPreset = vi.fn();
    const onClose = vi.fn();

    render(
      <SandboxPresetManagerModal
        isOpen={true}
        onClose={onClose}
        allPresets={[mockBuiltIn]}
        builtInPresets={[mockBuiltIn]}
        customPresets={[]}
        onLoadPreset={onLoadPreset}
        onUpdateActivePreset={vi.fn()}
        onDuplicatePreset={vi.fn()}
        onUpdateMetadata={vi.fn()}
        onDeletePreset={vi.fn()}
      />,
      { wrapper },
    );

    const loadBtn = screen.getByRole("button", { name: /Load|Tải/i });
    fireEvent.click(loadBtn);

    expect(onLoadPreset).toHaveBeenCalledWith(mockBuiltIn);
    expect(onClose).toHaveBeenCalled();
  });

  it("supports inline editing of custom preset metadata", () => {
    const onUpdateMetadata = vi.fn();

    render(
      <SandboxPresetManagerModal
        isOpen={true}
        onClose={vi.fn()}
        allPresets={[mockCustom]}
        builtInPresets={[]}
        customPresets={[mockCustom]}
        onLoadPreset={vi.fn()}
        onUpdateActivePreset={vi.fn()}
        onDuplicatePreset={vi.fn()}
        onUpdateMetadata={onUpdateMetadata}
        onDeletePreset={vi.fn()}
      />,
      { wrapper },
    );

    const editBtn = screen.getByTitle(/Edit name|Đổi tên/i);
    fireEvent.click(editBtn);

    const nameInput = screen.getByPlaceholderText(/Preset Name|Tên preset/i);
    fireEvent.change(nameInput, { target: { value: "Updated Custom Preset" } });

    const saveBtn = screen.getByRole("button", { name: /Save|Lưu/i });
    fireEvent.click(saveBtn);

    expect(onUpdateMetadata).toHaveBeenCalledWith("custom_1", "Updated Custom Preset", "Custom preset description");
  });
});
