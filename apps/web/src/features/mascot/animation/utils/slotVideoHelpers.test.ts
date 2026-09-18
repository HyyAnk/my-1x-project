import { describe, expect, it } from "vitest";
import { ALLOWED_EXTENSIONS, MAX_VIDEO_SIZE_BYTES, fileToBase64, makeSlotKey, validateVideoFile } from "./slotVideoHelpers";

describe("slotVideoHelpers", () => {
  it("formats slot key correctly", () => {
    expect(makeSlotKey("thinking", 1)).toBe("thinking_1");
    expect(makeSlotKey("celebrate", 10)).toBe("celebrate_10");
  });

  it("validates video file extension and size", () => {
    expect(ALLOWED_EXTENSIONS).toContain(".mp4");
    expect(MAX_VIDEO_SIZE_BYTES).toBe(52428800);

    const validFile = new File(["test content"], "video.mp4", { type: "video/mp4" });
    expect(() => validateVideoFile(validFile)).not.toThrow();

    const invalidExtFile = new File(["test content"], "video.txt", { type: "text/plain" });
    expect(() => validateVideoFile(invalidExtFile)).toThrow(/Unsupported video format/);

    const oversizedFile = new File(["x".repeat(100)], "video.mp4", { type: "video/mp4" });
    Object.defineProperty(oversizedFile, "size", { value: 60 * 1024 * 1024 });
    expect(() => validateVideoFile(oversizedFile)).toThrow(/Video file too large/);
  });

  it("converts file to data URL base64", async () => {
    const file = new File(["dummy data"], "sample.mp4", { type: "video/mp4" });
    const result = await fileToBase64(file);
    expect(typeof result).toBe("string");
    expect(result).toContain("data:video/mp4;base64,");
  });
});
