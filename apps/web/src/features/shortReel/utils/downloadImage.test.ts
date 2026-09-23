import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { downloadImageFile } from "./downloadImage";

describe("downloadImageFile utility", () => {
  let createdAnchors: HTMLAnchorElement[] = [];

  beforeEach(() => {
    createdAnchors = [];
    window.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-download-url");
    window.URL.revokeObjectURL = vi.fn();

    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      const el = origCreateElement(tagName);
      if (tagName === "a") {
        createdAnchors.push(el as HTMLAnchorElement);
      }
      return el;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("downloads image file with programmatic blob and specified filename", async () => {
    const mockBlob = new Blob(["image-bytes"], { type: "image/png" });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => mockBlob,
    } as unknown as Response);

    await downloadImageFile("/api/asset/style.png", "portrait-style.png");

    expect(createdAnchors.length).toBeGreaterThan(0);
    const lastAnchor = createdAnchors[createdAnchors.length - 1];
    expect(lastAnchor.download).toBe("portrait-style.png");
    expect(lastAnchor.href).toBe("blob:mock-download-url");
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-download-url");
  });

  it("falls back to standard anchor click if fetch fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("CORS blocked"));

    await downloadImageFile("/api/asset/cover.png", "short-reel-cover.png");

    expect(createdAnchors.length).toBeGreaterThan(0);
    const lastAnchor = createdAnchors[createdAnchors.length - 1];
    expect(lastAnchor.download).toBe("short-reel-cover.png");
    expect(lastAnchor.href).toContain("/api/asset/cover.png");
  });
});
