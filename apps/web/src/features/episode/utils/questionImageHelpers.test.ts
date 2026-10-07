import { describe, expect, it } from "vitest";
import {
  createOptimisticItem,
  formatFileSize,
  MAX_IMAGE_FILE_SIZE_BYTES,
  validateImageFile,
} from "./questionImageHelpers";
import type { QuestionImageItem } from "../types/questionImages.types";

describe("questionImageHelpers", () => {
  describe("validateImageFile", () => {
    it("accepts valid image formats within size limit", () => {
      const pngFile = new File(["dummy"], "test.png", { type: "image/png" });
      const jpgFile = new File(["dummy"], "test.jpg", { type: "image/jpeg" });
      const webpFile = new File(["dummy"], "test.webp", { type: "image/webp" });

      expect(validateImageFile(pngFile).valid).toBe(true);
      expect(validateImageFile(jpgFile).valid).toBe(true);
      expect(validateImageFile(webpFile).valid).toBe(true);
    });

    it("rejects non-image mime types", () => {
      const textFile = new File(["dummy"], "test.txt", { type: "text/plain" });
      const result = validateImageFile(textFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("PNG, JPEG, and WebP");
    });

    it("rejects files exceeding size limit", () => {
      const largeFile = new File([new Uint8Array(20 * 1024 * 1024)], "large.png", { type: "image/png" });
      const result = validateImageFile(largeFile, MAX_IMAGE_FILE_SIZE_BYTES);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("File size exceeds");
    });
  });

  describe("formatFileSize", () => {
    it("formats 0 bytes correctly", () => {
      expect(formatFileSize(0)).toBe("0 B");
    });

    it("formats kilobytes and megabytes", () => {
      expect(formatFileSize(1024)).toBe("1.0 KB");
      expect(formatFileSize(1024 * 1024 * 2.5)).toBe("2.5 MB");
    });
  });

  describe("createOptimisticItem", () => {
    it("creates an optimistic item with explicit source and user_uploaded status", () => {
      const initial: QuestionImageItem = {
        question_number: 1,
        question_id: "q1",
        question_text: "What is the capital of France?",
        asset_id: "q1_hero",
        status: "missing",
        source: "none",
        image_url: null,
        prompt: "A beautiful view of Eiffel Tower",
        aspect_ratio: "16:9",
        user_selected: false,
        slots: [],
      };

      const optimistic = createOptimisticItem(initial, "eiffel.png");
      expect(optimistic.status).toBe("user_uploaded");
      expect(optimistic.user_selected).toBe(true);
      expect(optimistic.source).toBe("explicit_episode");
      expect(optimistic.filename).toBe("eiffel.png");
      expect(optimistic.updated_at).toBeDefined();
    });
  });
});
