import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MascotSlotSelectionToolbar } from "./MascotSlotSelectionToolbar";

describe("MascotSlotSelectionToolbar", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders Regenerate and ZIP download buttons in regenerate mode", () => {
    const handleDownloadOriginal = vi.fn();
    const handleDownloadTransparent = vi.fn();

    render(
      <MascotSlotSelectionToolbar
        state="thinking"
        mode="regenerate"
        selectedCount={3}
        isAllSelected={false}
        isSubmitting={false}
        totalSelectableCount={5}
        onSelectAll={vi.fn()}
        onDeselectAll={vi.fn()}
        onSubmitSelected={vi.fn()}
        onDownloadOriginalZip={handleDownloadOriginal}
        onDownloadTransparentZip={handleDownloadTransparent}
      />,
    );

    const originalBtn = screen.getByRole("button", { name: /Download Original PNGs as ZIP/i });
    const transparentBtn = screen.getByRole("button", { name: /Download Transparent PNGs as ZIP/i });

    expect(originalBtn).toBeDefined();
    expect(transparentBtn).toBeDefined();

    fireEvent.click(originalBtn);
    expect(handleDownloadOriginal).toHaveBeenCalledTimes(1);

    fireEvent.click(transparentBtn);
    expect(handleDownloadTransparent).toHaveBeenCalledTimes(1);
  });

  it("does not render ZIP download buttons in generate mode", () => {
    render(
      <MascotSlotSelectionToolbar
        state="thinking"
        mode="generate"
        selectedCount={2}
        isAllSelected={false}
        isSubmitting={false}
        totalSelectableCount={5}
        onSelectAll={vi.fn()}
        onDeselectAll={vi.fn()}
        onSubmitSelected={vi.fn()}
        onDownloadOriginalZip={vi.fn()}
        onDownloadTransparentZip={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: /Download Original PNGs as ZIP/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Download Transparent PNGs as ZIP/i })).toBeNull();
    expect(screen.getByRole("button", { name: /Generate Selected/i })).toBeDefined();
  });

  it("disables buttons and shows Zipping... indicator while downloading", () => {
    render(
      <MascotSlotSelectionToolbar
        state="celebrate"
        mode="regenerate"
        selectedCount={4}
        isAllSelected={false}
        isSubmitting={false}
        isDownloadingZip={true}
        downloadingZipKind="original"
        totalSelectableCount={5}
        onSelectAll={vi.fn()}
        onDeselectAll={vi.fn()}
        onSubmitSelected={vi.fn()}
        onDownloadOriginalZip={vi.fn()}
        onDownloadTransparentZip={vi.fn()}
      />,
    );

    const originalBtn = screen.getByRole("button", { name: /Download Original PNGs as ZIP/i });
    expect(originalBtn).toHaveProperty("disabled", true);
    expect(originalBtn.textContent).toContain("Zipping...");

    const transparentBtn = screen.getByRole("button", { name: /Download Transparent PNGs as ZIP/i });
    expect(transparentBtn).toHaveProperty("disabled", true);
  });
});
