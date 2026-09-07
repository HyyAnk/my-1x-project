import type React from "react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { LanguageProvider } from "../../../../i18n";
import {
  SandboxLayoutSelector,
  PORTRAIT_LAYOUT_IDS,
  LANDSCAPE_LAYOUT_IDS,
  getCompatibleLayoutForAspectRatio,
} from "./SandboxLayoutSelector";

const renderWithLanguage = (ui: React.ReactElement) => render(<LanguageProvider>{ui}</LanguageProvider>);

describe("SandboxLayoutSelector (P6-UI-01..09)", () => {
  afterEach(() => {
    cleanup();
  });

  it("P6-UI-01 & P6-UI-08: Renders landscape layouts by default (16:9) with exactly 8 options", () => {
    const setLayoutId = vi.fn();
    const { getByRole, getAllByRole } = renderWithLanguage(
      <SandboxLayoutSelector layoutId="media_left_choices_right" setLayoutId={setLayoutId} />,
    );

    const combobox = getByRole("combobox");
    expect(combobox).toBeDefined();
    expect(combobox.getAttribute("aria-expanded")).toBe("false");

    // Open dropdown
    fireEvent.click(combobox);
    expect(combobox.getAttribute("aria-expanded")).toBe("true");

    const options = getAllByRole("option");
    expect(options).toHaveLength(8);
    expect(LANDSCAPE_LAYOUT_IDS).toHaveLength(8);
    expect(PORTRAIT_LAYOUT_IDS).toHaveLength(4);

    // Verify landscape layouts are present
    expect(getByRole("option", { name: /Media Left/ })).toBeDefined();
    expect(getByRole("option", { name: /Full Stack List/ })).toBeDefined();
  });

  it("Filters layouts for 9:16 portrait mode showing ONLY the 4 portrait layouts", () => {
    const setLayoutId = vi.fn();
    const { getByRole, getAllByRole, queryByRole } = renderWithLanguage(
      <SandboxLayoutSelector
        layoutId="portrait_hero_choices"
        setLayoutId={setLayoutId}
        aspectRatio="9:16"
      />,
    );

    const combobox = getByRole("combobox");
    fireEvent.click(combobox);

    const options = getAllByRole("option");
    expect(options).toHaveLength(4);

    // Verify 4 portrait layouts are present
    expect(getByRole("option", { name: /Portrait Hero/ })).toBeDefined();
    expect(getByRole("option", { name: /Portrait Split Versus/ })).toBeDefined();
    expect(getByRole("option", { name: /Portrait Verdict/ })).toBeDefined();
    expect(getByRole("option", { name: /Portrait Stack List/ })).toBeDefined();

    // Verify landscape layouts are NOT present
    expect(queryByRole("option", { name: /Media Left/ })).toBeNull();
    expect(queryByRole("option", { name: /Full Stack List/ })).toBeNull();
  });

  it("P6-UI-02: Supports keyboard navigation within filtered options", () => {
    const setLayoutId = vi.fn();
    const { getByRole } = renderWithLanguage(
      <SandboxLayoutSelector
        layoutId="portrait_hero_choices"
        setLayoutId={setLayoutId}
        aspectRatio="9:16"
      />,
    );

    const combobox = getByRole("combobox");

    // Open with Enter
    fireEvent.keyDown(combobox, { key: "Enter" });
    expect(combobox.getAttribute("aria-expanded")).toBe("true");

    // Arrow down selects next portrait layout
    fireEvent.keyDown(combobox, { key: "ArrowDown" });
    expect(setLayoutId).toHaveBeenCalledWith("portrait_split_versus");

    // Escape closes dropdown
    fireEvent.keyDown(combobox, { key: "Escape" });
    expect(combobox.getAttribute("aria-expanded")).toBe("false");
  });

  it("P6-UI-03: Selecting a new layout immediately calls setLayoutId and closes listbox", () => {
    const setLayoutId = vi.fn();
    const { getByRole, queryByRole } = renderWithLanguage(
      <SandboxLayoutSelector
        layoutId="portrait_hero_choices"
        setLayoutId={setLayoutId}
        aspectRatio="9:16"
      />,
    );

    const combobox = getByRole("combobox");
    fireEvent.click(combobox);

    const stackListOption = getByRole("option", { name: /Portrait Stack List/ });
    fireEvent.click(stackListOption);

    expect(setLayoutId).toHaveBeenCalledWith("portrait_stack_list");
    expect(queryByRole("listbox")).toBeNull();
  });

  it("Auto-migrates incompatible layoutId when rendered with 9:16 aspect ratio", () => {
    const setLayoutId = vi.fn();
    renderWithLanguage(
      <SandboxLayoutSelector
        layoutId="media_left_choices_right"
        setLayoutId={setLayoutId}
        aspectRatio="9:16"
      />,
    );

    // Should auto-migrate landscape to portrait_hero_choices
    expect(setLayoutId).toHaveBeenCalledWith("portrait_hero_choices");
  });

  it("Auto-migrates incompatible layoutId when rendered with 16:9 aspect ratio", () => {
    const setLayoutId = vi.fn();
    renderWithLanguage(
      <SandboxLayoutSelector
        layoutId="portrait_hero_choices"
        setLayoutId={setLayoutId}
        aspectRatio="16:9"
      />,
    );

    // Should auto-migrate portrait to media_left_choices_right
    expect(setLayoutId).toHaveBeenCalledWith("media_left_choices_right");
  });

  describe("getCompatibleLayoutForAspectRatio", () => {
    it("migrates landscape to corresponding portrait layouts", () => {
      expect(getCompatibleLayoutForAspectRatio("split_versus_two", "9:16")).toBe("portrait_split_versus");
      expect(getCompatibleLayoutForAspectRatio("verdict_true_false", "9:16")).toBe("portrait_verdict_tf");
      expect(getCompatibleLayoutForAspectRatio("full_stack_list", "9:16")).toBe("portrait_stack_list");
      expect(getCompatibleLayoutForAspectRatio("media_left_choices_right", "9:16")).toBe("portrait_hero_choices");
      expect(getCompatibleLayoutForAspectRatio("visual_choices_three", "9:16")).toBe("portrait_hero_choices");
      expect(getCompatibleLayoutForAspectRatio("portrait_hero_choices", "9:16")).toBe("portrait_hero_choices");
    });

    it("migrates portrait to corresponding landscape layouts", () => {
      expect(getCompatibleLayoutForAspectRatio("portrait_split_versus", "16:9")).toBe("split_versus_two");
      expect(getCompatibleLayoutForAspectRatio("portrait_verdict_tf", "16:9")).toBe("verdict_true_false");
      expect(getCompatibleLayoutForAspectRatio("portrait_stack_list", "16:9")).toBe("full_stack_list");
      expect(getCompatibleLayoutForAspectRatio("portrait_hero_choices", "16:9")).toBe("media_left_choices_right");
      expect(getCompatibleLayoutForAspectRatio("media_left_choices_right", "16:9")).toBe("media_left_choices_right");
    });

    it("handles baseline preview layout gracefully", () => {
      expect(getCompatibleLayoutForAspectRatio("baseline", "9:16")).toBe("portrait_hero_choices");
      expect(getCompatibleLayoutForAspectRatio("baseline", "16:9")).toBe("media_left_choices_right");
    });
  });
});
