import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../../../i18n/LanguageContext";
import { SandboxLayoutSelector, LANDSCAPE_LAYOUT_IDS, getCompatibleLayoutForAspectRatio } from "./SandboxLayoutSelector";

afterEach(() => {
  cleanup();
});

describe("SandboxLayoutSelector", () => {
  it("exports LANDSCAPE_LAYOUT_IDS and getCompatibleLayoutForAspectRatio correctly", () => {
    expect(LANDSCAPE_LAYOUT_IDS).toBeDefined();
    expect(LANDSCAPE_LAYOUT_IDS.length).toBeGreaterThan(0);
    expect(getCompatibleLayoutForAspectRatio("baseline")).toBe("media_left_choices_right");
    expect(getCompatibleLayoutForAspectRatio("media_left_choices_right")).toBe("media_left_choices_right");
  });

  it("offers landscape layout selection only", () => {
    render(
      <LanguageProvider>
        <SandboxLayoutSelector layoutId="media_left_choices_right" setLayoutId={vi.fn()} aspectRatio="16:9" />
      </LanguageProvider>,
    );
    expect(screen.getByRole("combobox")).toBeTruthy();
    expect(screen.queryByText(/portrait/i)).toBeNull();
  });

  it("displays media requirement badge for layouts with media assets", () => {
    const { rerender } = render(
      <LanguageProvider>
        <SandboxLayoutSelector layoutId="media_left_choices_right" setLayoutId={vi.fn()} aspectRatio="16:9" />
      </LanguageProvider>,
    );
    expect(screen.getByTestId("sandbox-layout-media-spec")).toBeTruthy();
    expect(screen.getByText(/Hero Media: 4:3/i)).toBeTruthy();

    rerender(
      <LanguageProvider>
        <SandboxLayoutSelector layoutId="visual_choices_three" setLayoutId={vi.fn()} aspectRatio="16:9" />
      </LanguageProvider>,
    );
    expect(screen.getByText(/Choices:\s*1:1/i)).toBeTruthy();

    rerender(
      <LanguageProvider>
        <SandboxLayoutSelector layoutId="visual_choices_three_pure" setLayoutId={vi.fn()} aspectRatio="16:9" />
      </LanguageProvider>,
    );
    expect(screen.getByText(/Choices:\s*3:4/i)).toBeTruthy();

    rerender(
      <LanguageProvider>
        <SandboxLayoutSelector layoutId="full_stack_list" setLayoutId={vi.fn()} aspectRatio="16:9" />
      </LanguageProvider>,
    );
    expect(screen.queryByTestId("sandbox-layout-media-spec")).toBeNull();
  });

  it("opens listbox on click and allows selecting an option", () => {
    const setLayoutId = vi.fn();
    render(
      <LanguageProvider>
        <SandboxLayoutSelector layoutId="media_left_choices_right" setLayoutId={setLayoutId} aspectRatio="16:9" />
      </LanguageProvider>,
    );

    const combobox = screen.getByRole("combobox");
    expect(combobox.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("listbox")).toBeNull();

    fireEvent.click(combobox);
    expect(combobox.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("listbox")).toBeTruthy();

    const options = screen.getAllByRole("option");
    expect(options.length).toBeGreaterThan(1);

    fireEvent.click(options[1]);
    expect(setLayoutId).toHaveBeenCalled();
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("supports keyboard navigation with Escape to close", () => {
    render(
      <LanguageProvider>
        <SandboxLayoutSelector layoutId="media_left_choices_right" setLayoutId={vi.fn()} aspectRatio="16:9" />
      </LanguageProvider>,
    );

    const combobox = screen.getByRole("combobox");
    fireEvent.click(combobox);
    expect(screen.getByRole("listbox")).toBeTruthy();

    fireEvent.keyDown(combobox, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});
