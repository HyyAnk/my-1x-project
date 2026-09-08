import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../../../i18n/LanguageContext";
import { SandboxLayoutSelector } from "./SandboxLayoutSelector";

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
});
