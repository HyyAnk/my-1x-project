import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StageMediaModeControls } from "./StageMediaModeControls";
import type { useStageStudio } from "../hooks/useStageStudio";

afterEach(cleanup);

describe("StageMediaModeControls", () => {
  const createMockStudio = (overrides = {}) =>
    ({
      t: (key: string) => {
        const translations: Record<string, string> = {
          "stageStudio.mediaModeTitle": "Mascot State Media Mode",
          "stageStudio.mediaModeInherit": "Inherit (System Default)",
          "stageStudio.mediaModeStatic": "Static Variants (Style Stills · Focused & Crisp)",
          "stageStudio.mediaModeAnimation": "Looping Animations (WebM / Spritesheet)",
          "stageStudio.mediaModeHelp": "Select whether this channel uses static still variants or looping video animations during quiz questions.",
        };
        return translations[key] ?? key;
      },
      mascotMediaMode: "inherit" as const,
      setMascotMediaMode: vi.fn(),
      ...overrides,
    }) as unknown as ReturnType<typeof useStageStudio>;

  it("renders with default inherit value and all options", () => {
    const studio = createMockStudio();
    render(<StageMediaModeControls studio={studio} />);

    expect(screen.getByRole("heading", { name: "Mascot State Media Mode" })).toBeDefined();
    const select = screen.getByRole("combobox", { name: "Mascot State Media Mode" }) as HTMLSelectElement;
    expect(select.value).toBe("inherit");
    expect(screen.getByRole("option", { name: "Inherit (System Default)" })).toBeDefined();
    expect(screen.getByRole("option", { name: "Static Variants (Style Stills · Focused & Crisp)" })).toBeDefined();
    expect(screen.getByRole("option", { name: "Looping Animations (WebM / Spritesheet)" })).toBeDefined();
    expect(screen.getByText(/Select whether this channel uses static still variants/i)).toBeDefined();
  });

  it("calls setMascotMediaMode when a different mode is selected", () => {
    const setMascotMediaMode = vi.fn();
    const studio = createMockStudio({ setMascotMediaMode });
    render(<StageMediaModeControls studio={studio} />);

    const select = screen.getByRole("combobox", { name: "Mascot State Media Mode" });
    fireEvent.change(select, { target: { value: "animation" } });

    expect(setMascotMediaMode).toHaveBeenCalledWith("animation");
  });
});
