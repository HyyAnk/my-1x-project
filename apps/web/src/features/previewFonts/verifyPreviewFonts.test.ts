import { describe, expect, it } from "vitest";
import { verifyPreviewFonts, type PreviewFontStatus } from "./verifyPreviewFonts";

describe("verifyPreviewFonts", () => {
  it("accepts only a ready font contract", async () => {
    const status: PreviewFontStatus = { state: "ready", families: ["Fredoka"] };
    const frame = frameWith({ __fontReadyPromise: Promise.resolve(status), __fontStatus: status });
    await expect(verifyPreviewFonts(frame)).resolves.toBeUndefined();
  });

  it("rejects previews without the readiness contract", async () => {
    await expect(verifyPreviewFonts(frameWith({}))).rejects.toThrow("readiness contract is missing");
  });

  it("rejects a failed font load instead of accepting fallback text", async () => {
    const status: PreviewFontStatus = { state: "error", message: "Font unavailable: Fredoka", families: ["Fredoka"] };
    const frame = frameWith({ __fontReadyPromise: Promise.reject(new Error(status.message)), __fontStatus: status });
    await expect(verifyPreviewFonts(frame)).rejects.toThrow("Font unavailable: Fredoka");
  });
});

function frameWith(contentWindow: object): HTMLIFrameElement {
  return { contentWindow } as HTMLIFrameElement;
}
