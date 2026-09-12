import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../../../i18n/LanguageContext";
import { SandboxLayoutSelector } from "./SandboxLayoutSelector";

afterEach(() => {
  cleanup();
});

describe("SandboxLayoutSelector", () => {
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
    expect(screen.getByText(/Choices: 4:3/i)).toBeTruthy();

    rerender(
      <LanguageProvider>
        <SandboxLayoutSelector layoutId="visual_choices_three_pure" setLayoutId={vi.fn()} aspectRatio="16:9" />
      </LanguageProvider>,
    );
    expect(screen.getByText(/Choices: 1:1/i)).toBeTruthy();

    rerender(
      <LanguageProvider>
        <SandboxLayoutSelector layoutId="full_stack_list" setLayoutId={vi.fn()} aspectRatio="16:9" />
      </LanguageProvider>,
    );
    expect(screen.queryByTestId("sandbox-layout-media-spec")).toBeNull();
  });
});
