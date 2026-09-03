import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach } from "vitest";
import { describe, expect, it, vi } from "vitest";
import { StyleModuleImportDialog } from "./StyleModuleImportDialog";

describe("StyleModuleImportDialog", () => {
  afterEach(cleanup);
  it("keeps import disabled until a package is selected", () => {
    render(<StyleModuleImportDialog open onCancel={vi.fn()} onImport={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Import" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("supports cancelling without importing", () => {
    const onCancel = vi.fn();
    const onImport = vi.fn();
    render(<StyleModuleImportDialog open onCancel={onCancel} onImport={onImport} />);
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onImport).not.toHaveBeenCalled();
  });
});
