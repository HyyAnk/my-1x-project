import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MascotMotionPresetGrid } from "./MascotMotionPresetGrid";
import { LanguageProvider } from "../../../../i18n";

afterEach(() => {
  cleanup();
});

const wrapper = ({ children }: { children: React.ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;

describe("MascotMotionPresetGrid", () => {
  it("renders presets and triggers onChangeMotionPreset when preset chip clicked", () => {
    const onChangeMotionPreset = vi.fn();
    const onSaveMotion = vi.fn();

    render(
      <MascotMotionPresetGrid
        currentPreset="breathe"
        activePreviewAction="thinking"
        actionShortLabel="Thinking"
        calibrating={false}
        onChangeMotionPreset={onChangeMotionPreset}
        onSaveMotion={onSaveMotion}
      />,
      { wrapper },
    );

    const swayButton = screen.getAllByRole("button").find((b) => b.textContent?.includes("Sway"));
    expect(swayButton).toBeTruthy();
    fireEvent.click(swayButton!);
    expect(onChangeMotionPreset).toHaveBeenCalledWith("thinking", "sway");

    const saveButton = screen.getAllByRole("button").find((b) => b.textContent?.includes("Save Motion (Thinking)"));
    expect(saveButton).toBeTruthy();
    fireEvent.click(saveButton!);
    expect(onSaveMotion).toHaveBeenCalledWith("thinking");
  });

  it("disables save button and displays spinner when calibrating is true", () => {
    render(
      <MascotMotionPresetGrid
        currentPreset="breathe"
        activePreviewAction="thinking"
        actionShortLabel="Thinking"
        calibrating={true}
        onChangeMotionPreset={vi.fn()}
        onSaveMotion={vi.fn()}
      />,
      { wrapper },
    );

    const saveButton = screen.getByRole("button", { name: /saving/i });
    expect(saveButton.hasAttribute("disabled")).toBe(true);
  });
});
