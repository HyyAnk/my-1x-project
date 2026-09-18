import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MascotStudioHeader } from "./MascotStudioHeader";
import { LanguageProvider } from "../../../i18n";

afterEach(cleanup);

describe("MascotStudioHeader", () => {
  it("renders library actions when active tab is library", () => {
    const onStartNew = vi.fn();
    const onImportZip = vi.fn();
    const onBackToLibrary = vi.fn();

    render(
      <LanguageProvider>
        <MascotStudioHeader
          currentTab="library"
          importingZip={false}
          onImportZip={onImportZip}
          onStartNew={onStartNew}
          onBackToLibrary={onBackToLibrary}
        />
      </LanguageProvider>,
    );

    const newBtn = screen.getByRole("button", { name: /New Mascot/i });
    fireEvent.click(newBtn);
    expect(onStartNew).toHaveBeenCalled();

    expect(screen.getByText(/Import ZIP/i)).toBeTruthy();
  });

  it("renders back button when active tab is generator", () => {
    const onBackToLibrary = vi.fn();

    render(
      <LanguageProvider>
        <MascotStudioHeader
          currentTab="generator"
          importingZip={false}
          onImportZip={vi.fn()}
          onStartNew={vi.fn()}
          onBackToLibrary={onBackToLibrary}
        />
      </LanguageProvider>,
    );

    const backBtn = screen.getByRole("button", { name: /Mascot Library/i });
    fireEvent.click(backBtn);
    expect(onBackToLibrary).toHaveBeenCalled();
  });
});
