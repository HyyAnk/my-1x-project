import React from "react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup, screen } from "@testing-library/react";
import { LanguageProvider } from "../../../../i18n";
import { MascotPositionSection } from "./MascotPositionSection";

const renderWithLanguage = (ui: React.ReactElement) => render(<LanguageProvider>{ui}</LanguageProvider>);

describe("MascotPositionSection (16:9 Layout Standardization)", () => {
  afterEach(() => {
    cleanup();
  });

  it("locks placement to bottom_left and disables bottom_right in 16:9 widescreen mode", () => {
    const setMascotPosition = vi.fn();
    const setMascotFlipX = vi.fn();

    renderWithLanguage(
      <MascotPositionSection
        aspectRatio="16:9"
        mascotPosition="bottom_left"
        setMascotPosition={setMascotPosition}
        mascotFlipX={false}
        setMascotFlipX={setMascotFlipX}
      />,
    );

    expect(screen.getByText("Left Pillar (16:9)")).toBeDefined();

    const bottomLeftBtn = screen.getByRole("button", { name: /bottom left/i });
    const bottomRightBtn = screen.getByRole("button", { name: /bottom right/i });

    expect(bottomLeftBtn.className).toContain("primary-button");
    expect((bottomRightBtn as HTMLButtonElement).disabled).toBe(true);
    expect(bottomRightBtn.getAttribute("aria-disabled")).toBe("true");
    expect(bottomRightBtn.getAttribute("title")).toBe("Locked to Left Brand Pillar in 16:9");

    fireEvent.click(bottomRightBtn);
    expect(setMascotPosition).not.toHaveBeenCalled();

    fireEvent.click(bottomLeftBtn);
    expect(setMascotPosition).toHaveBeenCalledWith("bottom_left");
  });

  it("allows both bottom_left and bottom_right positions in 9:16 portrait mode", () => {
    const setMascotPosition = vi.fn();
    const setMascotFlipX = vi.fn();

    renderWithLanguage(
      <MascotPositionSection
        aspectRatio="9:16"
        mascotPosition="bottom_left"
        setMascotPosition={setMascotPosition}
        mascotFlipX={false}
        setMascotFlipX={setMascotFlipX}
      />,
    );

    expect(screen.queryByText("Left Pillar (16:9)")).toBeNull();

    const bottomRightBtn = screen.getByRole("button", { name: /bottom right/i });
    expect((bottomRightBtn as HTMLButtonElement).disabled).toBe(false);
    expect(bottomRightBtn.getAttribute("aria-disabled")).toBeNull();

    fireEvent.click(bottomRightBtn);
    expect(setMascotPosition).toHaveBeenCalledWith("bottom_right");
  });

  it("toggles mascotFlipX when clicking flip button", () => {
    const setMascotPosition = vi.fn();
    const setMascotFlipX = vi.fn();

    renderWithLanguage(
      <MascotPositionSection
        aspectRatio="16:9"
        mascotPosition="bottom_left"
        setMascotPosition={setMascotPosition}
        mascotFlipX={false}
        setMascotFlipX={setMascotFlipX}
      />,
    );

    const flipBtn = screen.getByRole("button", { name: /flip/i });
    fireEvent.click(flipBtn);
    expect(setMascotFlipX).toHaveBeenCalled();
  });
});
