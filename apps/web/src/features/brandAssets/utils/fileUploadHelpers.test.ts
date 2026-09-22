import { describe, expect, it, vi } from "vitest";
import {
  formatDate,
  formatFileSize,
  formatPlatformName,
  readFileAsBase64,
  triggerFileDownload,
} from "./fileUploadHelpers";

describe("fileUploadHelpers", () => {
  describe("formatFileSize", () => {
    it("formats 0 bytes correctly", () => {
      expect(formatFileSize(0)).toBe("0 B");
      expect(formatFileSize(-10)).toBe("0 B");
    });

    it("formats bytes under 1KB", () => {
      expect(formatFileSize(512)).toBe("512 B");
    });

    it("formats kilobytes with appropriate precision", () => {
      expect(formatFileSize(2048)).toBe("2.0 KB");
      expect(formatFileSize(15360)).toBe("15 KB");
    });

    it("formats megabytes", () => {
      expect(formatFileSize(1048576)).toBe("1.0 MB");
      expect(formatFileSize(5242880)).toBe("5.0 MB");
    });
  });

  describe("formatDate", () => {
    it("formats ISO date string in en-US", () => {
      const formatted = formatDate("2026-09-22T00:00:00.000Z");
      expect(formatted).toContain("Sep");
      expect(formatted).toContain("2026");
    });

    it("returns raw string if invalid date", () => {
      expect(formatDate("invalid-date")).toBe("invalid-date");
    });
  });

  describe("formatPlatformName", () => {
    it("formats supported social platforms", () => {
      expect(formatPlatformName("youtube")).toBe("YouTube");
      expect(formatPlatformName("x")).toBe("X (Twitter)");
      expect(formatPlatformName("facebook")).toBe("Facebook");
      expect(formatPlatformName("tiktok")).toBe("TikTok");
    });
  });

  describe("readFileAsBase64", () => {
    it("converts a File to data URL", async () => {
      const file = new File(["dummy content"], "logo.png", { type: "image/png" });
      const base64 = await readFileAsBase64(file);
      expect(base64).toMatch(/^data:image\/png;base64,/);
    });
  });

  describe("triggerFileDownload", () => {
    it("creates temporary anchor and triggers click", () => {
      const clickSpy = vi.fn();
      const appendChildSpy = vi.spyOn(document.body, "appendChild");
      const removeChildSpy = vi.spyOn(document.body, "removeChild");

      const origCreateElement = document.createElement.bind(document);
      vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
        const el = origCreateElement(tagName);
        if (tagName === "a") {
          el.click = clickSpy;
        }
        return el;
      });

      triggerFileDownload("/api/channels/ch1/assets/file/logo.png", "logo.png");
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
    });
  });
});
