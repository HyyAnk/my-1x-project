import { describe, expect, it } from "vitest";
import {
  isRecord,
  normalizeMascotPackageManifest,
  parseRawMascotActionEntry,
  parseRawMascotManifest,
} from "../src/quiz/mascot/package/packageManifestParser.js";
import { remapAssetUrl } from "../src/quiz/mascot/package/packageImporter.js";
import * as packageManagerFacade from "../src/quiz/mascot/packageManager.js";
import * as packageIndex from "../src/quiz/mascot/package/index.js";

describe("Mascot Package Subsystem Unit Tests", () => {
  describe("packageManifestParser", () => {
    it("identifies records correctly with isRecord", () => {
      expect(isRecord({})).toBe(true);
      expect(isRecord({ a: 1 })).toBe(true);
      expect(isRecord(null)).toBe(false);
      expect(isRecord([])).toBe(false);
      expect(isRecord("string")).toBe(false);
      expect(isRecord(123)).toBe(false);
    });

    it("parses raw mascot action entries and validates fields", () => {
      expect(parseRawMascotActionEntry(null)).toBeNull();
      expect(parseRawMascotActionEntry("not-a-record")).toBeNull();

      const validEntry = parseRawMascotActionEntry({
        action: "idle",
        sprite_url: "https://example.com/sprite.png",
        preview_url: "https://example.com/preview.png",
        frames_count: 8,
        fps: 12,
        loop: true,
        frame_width: 512,
        frame_height: 512,
        offset_x: 10,
        offset_y: -20,
        motion_preset: "breathe",
        motion_speed: 1.5,
        motion_intensity: "dynamic",
      });

      expect(validEntry).toEqual({
        action: "idle",
        sprite_url: "https://example.com/sprite.png",
        preview_url: "https://example.com/preview.png",
        frames_count: 8,
        fps: 12,
        loop: true,
        frame_width: 512,
        frame_height: 512,
        offset_x: 10,
        offset_y: -20,
        motion_preset: "breathe",
        motion_speed: 1.5,
        motion_intensity: "dynamic",
      });
    });

    it("throws an error when manifest root is not an object", () => {
      expect(() => parseRawMascotManifest("invalid")).toThrow("Invalid Mascot ZIP package: mascot.json manifest root must be an object");
      expect(() => parseRawMascotManifest(null)).toThrow("Invalid Mascot ZIP package: mascot.json manifest root must be an object");
    });

    it("parses and normalizes raw mascot manifest", () => {
      const parsed = parseRawMascotManifest({
        id: "mascot-123",
        name: "Test Mascot",
        description: "A test mascot",
        actions: {
          idle: {
            action: "idle",
            sprite_url: "idle.png",
          },
          invalid: null,
        },
      });

      expect(parsed.id).toBe("mascot-123");
      expect(parsed.name).toBe("Test Mascot");
      expect(parsed.actions?.idle?.action).toBe("idle");
      expect(parsed.actions?.invalid).toBeNull();

      const normalized = normalizeMascotPackageManifest(parsed);
      expect(normalized.name).toBe("Test Mascot");
      expect(normalized.styles).toEqual([]);
    });
  });

  describe("packageImporter helpers", () => {
    it("remaps asset URLs according to urlMap correctly", () => {
      const urlMap = new Map<string, string>([["sprite.png", "https://cdn.example.com/new_sprite.png"]]);

      expect(remapAssetUrl(null, urlMap)).toBeNull();
      expect(remapAssetUrl("https://old.com/assets/sprite.png?v=1", urlMap)).toBe("https://cdn.example.com/new_sprite.png");
      expect(remapAssetUrl("https://old.com/assets/unmapped.png", urlMap)).toBe("https://old.com/assets/unmapped.png");
    });
  });

  describe("packageManager backward-compatibility facade", () => {
    it("re-exports all functions from package/index.js", () => {
      expect(packageManagerFacade.exportMascotPackage).toBe(packageIndex.exportMascotPackage);
      expect(packageManagerFacade.importMascotPackage).toBe(packageIndex.importMascotPackage);
      expect(packageManagerFacade.parseRawMascotManifest).toBe(packageIndex.parseRawMascotManifest);
      expect(packageManagerFacade.parseRawMascotActionEntry).toBe(packageIndex.parseRawMascotActionEntry);
      expect(packageManagerFacade.normalizeMascotPackageManifest).toBe(packageIndex.normalizeMascotPackageManifest);
    });
  });
});
