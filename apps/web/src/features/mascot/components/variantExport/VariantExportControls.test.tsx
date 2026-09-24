import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { VariantExportJob } from "@studio/shared";
import { VariantExportControls } from "./VariantExportControls";
import { variantExportApi } from "../../services/variantExportApi";

vi.mock("../../services/variantExportApi", () => ({
  variantExportApi: {
    preview: vi.fn(),
    folders: vi.fn(),
    validate: vi.fn(),
    start: vi.fn(),
    status: vi.fn(),
    cancel: vi.fn(),
  },
}));
const job: VariantExportJob = {
  id: "job",
  mascot_id: "mascot",
  mode: "original",
  destination: "D:\\Exports",
  status: "running",
  total: 4,
  processed: 0,
  copied: 0,
  skipped: 0,
  failed: 0,
  failures: [],
  current: null,
  started_at: "2026-09-24T00:00:00Z",
  finished_at: null,
};

beforeEach(() => {
  vi.resetAllMocks();
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  vi.mocked(variantExportApi.preview).mockResolvedValue({ summary: { styles: 2, thinking: 2, celebrate: 2, empty: 0 }, job: null });
  vi.mocked(variantExportApi.folders).mockResolvedValue({ path: "D:\\Exports", parent: "D:\\", roots: ["D:\\"], folders: [] });
  vi.mocked(variantExportApi.validate).mockResolvedValue({ path: "D:\\Exports" });
  vi.mocked(variantExportApi.start).mockResolvedValue(job);
  vi.mocked(variantExportApi.status).mockResolvedValue(job);
});
afterEach(cleanup);

async function selectFolder() {
  fireEvent.click(screen.getByRole("button", { name: "Choose Folder" }));
  await waitFor(() => expect((screen.getByLabelText("Server folder") as HTMLInputElement).value).toBe("D:\\Exports"));
  fireEvent.click(screen.getByRole("button", { name: "Use This Folder" }));
  await waitFor(() => expect(screen.queryByLabelText("Server folder")).toBeNull());
}

describe("variant export controls", () => {
  it("keeps keyboard focus inside the dialog and restores its trigger on close", async () => {
    render(<VariantExportControls mascotId="mascot" mascotName="Mascot" />);
    const trigger = screen.getByRole("button", { name: "Download Original" });
    trigger.focus();
    fireEvent.click(trigger);
    await selectFolder();
    const download = screen.getByRole("button", { name: "Download Variants" });
    const close = screen.getByRole("button", { name: "Close export" });
    download.focus();
    fireEvent.keyDown(download, { key: "Tab" });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(download);
    fireEvent.click(close);
    expect(document.activeElement).toBe(trigger);
  });
  it("requires a validated folder, exports the selected mode, and shows confirmed completion", async () => {
    render(<VariantExportControls mascotId="mascot" mascotName="Mascot" />);
    fireEvent.click(screen.getByRole("button", { name: "Download Transparent" }));
    await screen.findByText("2 styles · 2 Thinking · 2 Celebrate");
    expect((screen.getByRole("button", { name: "Download Variants" }) as HTMLButtonElement).disabled).toBe(true);
    await selectFolder();
    vi.mocked(variantExportApi.start).mockResolvedValue({ ...job, mode: "transparent" });
    vi.mocked(variantExportApi.status).mockResolvedValue({
      ...job,
      mode: "transparent",
      status: "completed",
      processed: 4,
      copied: 4,
      finished_at: "2026-09-24T00:00:01Z",
    });
    fireEvent.click(screen.getByRole("button", { name: "Download Variants" }));
    await waitFor(() =>
      expect(variantExportApi.start).toHaveBeenCalledWith(
        "mascot",
        expect.objectContaining({ mode: "transparent", destination: "D:\\Exports" }),
      ),
    );
    await screen.findByText(/Download complete.*4\/4/);
  });
  it("preserves folder selection on errors and prevents duplicate pending submissions", async () => {
    render(<VariantExportControls mascotId="mascot" mascotName="Mascot" />);
    fireEvent.click(screen.getByRole("button", { name: "Download Original" }));
    await selectFolder();
    let reject!: (error: Error) => void;
    vi.mocked(variantExportApi.start).mockImplementation(
      () =>
        new Promise((_resolve, fail) => {
          reject = fail;
        }),
    );
    const button = screen.getByRole("button", { name: "Download Variants" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(variantExportApi.start).toHaveBeenCalledTimes(1);
    reject(new Error("Server disconnected"));
    await screen.findByText("Server disconnected");
    expect(screen.getByLabelText("Selected folder").textContent).toBe("D:\\Exports");
  });
  it("keeps downloads disabled after folder validation fails", async () => {
    vi.mocked(variantExportApi.validate).mockRejectedValue(new Error("Folder is read-only"));
    render(<VariantExportControls mascotId="mascot" mascotName="Mascot" />);
    fireEvent.click(screen.getByRole("button", { name: "Download Original" }));
    fireEvent.click(screen.getByRole("button", { name: "Choose Folder" }));
    await waitFor(() => expect((screen.getByLabelText("Server folder") as HTMLInputElement).value).toBe("D:\\Exports"));
    fireEvent.click(screen.getByRole("button", { name: "Use This Folder" }));
    await screen.findByText("Folder is read-only");
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect((screen.getByRole("button", { name: "Download Variants" }) as HTMLButtonElement).disabled).toBe(true);
  });
  it("recovers an active job on reopen and supports cancellation", async () => {
    vi.mocked(variantExportApi.preview).mockResolvedValue({ summary: { styles: 2, thinking: 2, celebrate: 2, empty: 0 }, job });
    vi.mocked(variantExportApi.cancel).mockResolvedValue({ ...job, status: "cancelled", finished_at: "2026-09-24T00:00:01Z" });
    render(<VariantExportControls mascotId="mascot" mascotName="Mascot" />);
    fireEvent.click(screen.getByRole("button", { name: "Download Original" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cancel Export" }));
    await screen.findByText(/Download cancelled/);
  });
  it("keeps empty exports disabled", async () => {
    vi.mocked(variantExportApi.preview).mockResolvedValue({ summary: { styles: 2, thinking: 0, celebrate: 0, empty: 40 }, job: null });
    render(<VariantExportControls mascotId="mascot" mascotName="Mascot" />);
    fireEvent.click(screen.getByRole("button", { name: "Download Original" }));
    await screen.findByText("No variants available");
    await selectFolder();
    expect((screen.getByRole("button", { name: "Download Variants" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
