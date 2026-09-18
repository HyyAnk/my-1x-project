import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../../../i18n/LanguageContext";
import type { QuizLayoutUiDefinition } from "../../../quizLayouts/quizLayoutUiCatalog";
import { SandboxLayoutOptionItem } from "./SandboxLayoutOptionItem";

afterEach(() => {
  cleanup();
});

describe("SandboxLayoutOptionItem", () => {
  const mockLayout: QuizLayoutUiDefinition = {
    id: "media_left_choices_right",
    labelKey: "stageStudio.layoutMediaLeft",
    descriptionKey: "stageStudio.layoutMediaLeftDesc",
    sandboxLabelKey: "stageStudio.layoutMediaLeft",
    sandboxDescriptionKey: "stageStudio.layoutMediaLeftDesc",
    preview: "media-left",
    icon: "split",
  };

  it("renders layout option with icon and label", () => {
    render(
      <LanguageProvider>
        <SandboxLayoutOptionItem layout={mockLayout} isSelected={false} onSelect={vi.fn()} />
      </LanguageProvider>,
    );

    expect(screen.getByRole("option")).toBeTruthy();
    expect(screen.getByRole("option").getAttribute("aria-selected")).toBe("false");
  });

  it("shows checkmark when selected", () => {
    const { container } = render(
      <LanguageProvider>
        <SandboxLayoutOptionItem layout={mockLayout} isSelected={true} onSelect={vi.fn()} />
      </LanguageProvider>,
    );

    expect(screen.getByRole("option").getAttribute("aria-selected")).toBe("true");
    expect(container.querySelectorAll("svg").length).toBe(2);
  });

  it("triggers onSelect when clicked", () => {
    const onSelect = vi.fn();
    render(
      <LanguageProvider>
        <SandboxLayoutOptionItem layout={mockLayout} isSelected={false} onSelect={onSelect} />
      </LanguageProvider>,
    );

    fireEvent.click(screen.getByRole("option"));
    expect(onSelect).toHaveBeenCalledWith(mockLayout);
  });

  it("renders badge when provided", () => {
    render(
      <LanguageProvider>
        <SandboxLayoutOptionItem layout={mockLayout} isSelected={false} onSelect={vi.fn()} badge="16:9" />
      </LanguageProvider>,
    );

    expect(screen.getByText("16:9")).toBeTruthy();
  });
});
