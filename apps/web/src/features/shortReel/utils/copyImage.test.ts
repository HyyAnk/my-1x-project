import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convertBlobToPng, copyImageToClipboard } from "./copyImage";

describe("copyImage utility", () => {
  const originalClipboard = navigator.clipboard;
  const originalClipboardItem = (globalThis as unknown as { ClipboardItem: unknown }).ClipboardItem;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: originalClipboard,
      configurable: true,
      writable: true,
    });
    (globalThis as unknown as { ClipboardItem: unknown }).ClipboardItem = originalClipboardItem;
  });

  it("returns image/png blob directly without conversion", async () => {
    const pngBlob = new Blob(["fake-png"], { type: "image/png" });
    const result = await convertBlobToPng(pngBlob);
    expect(result).toBe(pngBlob);
  });

  it("throws descriptive error when navigator.clipboard is not supported", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
      writable: true,
    });

    await expect(copyImageToClipboard("/test-image.png")).rejects.toThrow(
      "Clipboard image write API is not supported in this environment"
    );
  });

  it("copies png image blob to clipboard successfully", async () => {
    const writeMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { write: writeMock },
      configurable: true,
      writable: true,
    });

    class MockClipboardItem {
      types: string[];
      items: Record<string, Blob>;
      constructor(items: Record<string, Blob>) {
        this.items = items;
        this.types = Object.keys(items);
      }
    }
    (globalThis as unknown as { ClipboardItem: unknown }).ClipboardItem = MockClipboardItem;

    const mockPngBlob = new Blob(["png-data"], { type: "image/png" });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => mockPngBlob,
    } as unknown as Response);

    const success = await copyImageToClipboard("/api/asset/image.png");
    expect(success).toBe(true);
    expect(writeMock).toHaveBeenCalledTimes(1);
    const passedItems = writeMock.mock.calls[0][0];
    expect(passedItems[0].items["image/png"]).toBe(mockPngBlob);
  });

  it("throws error when fetch response is not ok", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { write: vi.fn() },
      configurable: true,
      writable: true,
    });
    (globalThis as unknown as { ClipboardItem: unknown }).ClipboardItem = vi.fn();

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    } as unknown as Response);

    await expect(copyImageToClipboard("/not-found.png")).rejects.toThrow("Failed to fetch image for clipboard: 404 Not Found");
  });
});
