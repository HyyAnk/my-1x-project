import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { Sidebar } from "./Sidebar";
import { LanguageProvider } from "../../i18n";

describe("Sidebar", () => {
  afterEach(() => {
    cleanup();
  });
  it("renders brandAssets nav item and navigates to brand_assets page on click", () => {
    const setPage = vi.fn();
    render(
      <LanguageProvider>
        <Sidebar page="dashboard" setPage={setPage} activeTaskCount={0} />
      </LanguageProvider>,
    );

    const brandAssetsLink = screen.getByRole("link", { name: /Brand Assets/i });
    expect(brandAssetsLink).toBeTruthy();
    expect(brandAssetsLink.getAttribute("href")).toBe("#/brand_assets");

    fireEvent.click(brandAssetsLink);
    expect(setPage).toHaveBeenCalledWith("brand_assets");
  });

  it("marks brand_assets nav link as active when current page is brand_assets", () => {
    render(
      <LanguageProvider>
        <Sidebar page="brand_assets" setPage={vi.fn()} activeTaskCount={0} />
      </LanguageProvider>,
    );

    const brandAssetsLink = screen.getByRole("link", { name: /Brand Assets/i });
    expect(brandAssetsLink.className).toContain("is-active");
  });
});
