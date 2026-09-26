import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IdentityDownload } from "./IdentityDownload";
import { fetchIdentityExport } from "../services/identityExportApi";
import { downloadIdentityZip, saveIdentityDirectory } from "../services/saveIdentityExport";

vi.mock("../services/identityExportApi", () => ({ fetchIdentityExport: vi.fn() }));
vi.mock("../services/saveIdentityExport", () => ({ downloadIdentityZip: vi.fn(), saveIdentityDirectory: vi.fn() }));
const bundle = { folder: "channel-identity", warnings: ["Missing style"], files: [{ filename: "logo.png", base64: "aGVsbG8=" }] };
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  Reflect.deleteProperty(window, "showDirectoryPicker");
});

describe("Identity download control", () => {
  it("opens the picker before fetching and reports confirmed directory saves", async () => {
    const directory = { getDirectoryHandle: vi.fn(), getFileHandle: vi.fn() };
    const picker = vi.fn().mockResolvedValue(directory);
    Object.defineProperty(window, "showDirectoryPicker", { configurable: true, value: picker });
    vi.mocked(fetchIdentityExport).mockResolvedValue(bundle);
    vi.mocked(saveIdentityDirectory).mockResolvedValue("channel-identity-unique");
    render(<IdentityDownload channelId="channel" disabled={false} />);
    fireEvent.click(screen.getByRole("button"));
    expect(picker).toHaveBeenCalledOnce();
    expect(fetchIdentityExport).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Saved 1 files"));
    expect(fetchIdentityExport).toHaveBeenCalledWith("channel", "files", expect.any(AbortSignal));
    expect(saveIdentityDirectory).toHaveBeenCalledWith(directory, bundle, expect.any(AbortSignal), expect.any(Function));
    expect(downloadIdentityZip).not.toHaveBeenCalled();
  });
  it("acknowledges slow requests, blocks duplicate clicks and falls back to ZIP", async () => {
    let resolve!: (value: typeof bundle) => void;
    vi.mocked(fetchIdentityExport).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    render(<IdentityDownload channelId="channel" disabled={false} />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("status").textContent).toBe("Preparing identity");
    expect(fetchIdentityExport).toHaveBeenCalledTimes(1);
    expect(fetchIdentityExport).toHaveBeenCalledWith("channel", "zip", expect.any(AbortSignal));
    await act(async () => resolve(bundle));
    expect(downloadIdentityZip).toHaveBeenCalledWith(bundle);
    expect(screen.getByRole("status").textContent).toBe("ZIP download started");
    expect(screen.getByText("Missing style")).toBeTruthy();
  });
  it("treats closing the folder picker as cancellation without requesting assets", async () => {
    Object.defineProperty(window, "showDirectoryPicker", {
      configurable: true,
      value: vi.fn().mockRejectedValue(new DOMException("Cancelled", "AbortError")),
    });
    render(<IdentityDownload channelId="channel" disabled={false} />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Download cancelled"));
    expect(fetchIdentityExport).not.toHaveBeenCalled();
  });
  it("preserves errors and supports retry", async () => {
    vi.mocked(fetchIdentityExport).mockRejectedValueOnce(new Error("Connection lost. Retry.")).mockResolvedValueOnce(bundle);
    render(<IdentityDownload channelId="channel" disabled={false} />);
    fireEvent.click(screen.getByRole("button"));
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Retry Download" }));
    await waitFor(() => expect(downloadIdentityZip).toHaveBeenCalledOnce());
  });
  it("ignores a stale response after leaving the channel", async () => {
    let resolve!: (value: typeof bundle) => void;
    vi.mocked(fetchIdentityExport).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const view = render(<IdentityDownload channelId="channel" disabled={false} />);
    fireEvent.click(screen.getByRole("button"));
    view.unmount();
    await act(async () => resolve(bundle));
    expect(downloadIdentityZip).not.toHaveBeenCalled();
  });
});
