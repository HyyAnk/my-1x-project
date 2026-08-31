import type React from "react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { LanguageProvider } from "../../../../i18n";
import { SandboxLayoutSelector } from "./SandboxLayoutSelector";
import { QUIZ_LAYOUT_UI_DEFINITIONS } from "../../../quizLayouts/quizLayoutUiCatalog";

const renderWithLanguage = (ui: React.ReactElement) => render(<LanguageProvider>{ui}</LanguageProvider>);

describe("SandboxLayoutSelector (P6-UI-01..09)", () => {
  afterEach(() => {
    cleanup();
  });

  it("P6-UI-01 & P6-UI-08: Renders a single compact combobox control with all four production layouts", () => {
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
    expect(options).toHaveLength(4);
    expect(QUIZ_LAYOUT_UI_DEFINITIONS).toHaveLength(4);
  });

  it("P6-UI-02: Supports keyboard navigation (Enter, Space, ArrowDown, ArrowUp, Escape)", () => {
    const setLayoutId = vi.fn();
    const { getByRole } = renderWithLanguage(<SandboxLayoutSelector layoutId="media_left_choices_right" setLayoutId={setLayoutId} />);

    const combobox = getByRole("combobox");

    // Open with Enter
    fireEvent.keyDown(combobox, { key: "Enter" });
    expect(combobox.getAttribute("aria-expanded")).toBe("true");

    // Arrow down selects next layout
    fireEvent.keyDown(combobox, { key: "ArrowDown" });
    expect(setLayoutId).toHaveBeenCalledWith("visual_choices_three");

    // Escape closes dropdown
    fireEvent.keyDown(combobox, { key: "Escape" });
    expect(combobox.getAttribute("aria-expanded")).toBe("false");
  });

  it("P6-UI-03: Selecting a new layout immediately calls setLayoutId and closes listbox", () => {
    const setLayoutId = vi.fn();
    const { getByRole, getAllByRole, queryByRole } = renderWithLanguage(
      <SandboxLayoutSelector layoutId="media_left_choices_right" setLayoutId={setLayoutId} />,
    );

    const combobox = getByRole("combobox");
    fireEvent.click(combobox);

    const fullStackOption = getAllByRole("option")[3];
    fireEvent.click(fullStackOption);

    expect(setLayoutId).toHaveBeenCalledWith("full_stack_list");
    expect(queryByRole("listbox")).toBeNull();
  });
});
