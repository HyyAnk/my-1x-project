import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { computeContrastRatio, evaluateContrast } from "../src/quiz/visual/contrastCalculator.js";
import { RepositoryError } from "../src/repository.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("Security & Resilience Suite", () => {
  describe("API Key Masking", () => {
    it("masks image_generation.api_key in /api/config and /api/image/settings", async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "sec-test-"));
      roots.push(root);
      const studioDir = path.join(root, ".quiz-studio");
      await mkdir(studioDir, { recursive: true });
      await writeFile(
        path.join(studioDir, "image.local.json"),
        JSON.stringify({
          image_generation: {
            enabled: true,
            provider: "shopaikey",
            api_key: "sk-super-secret-key-12345",
          },
        }),
        "utf8",
      );

      const app = await buildApp(root);
      try {
        const configRes = await app.server.inject({ method: "GET", url: "/api/config" });
        expect(configRes.statusCode).toBe(200);
        const configData = configRes.json();
        expect(configData.image_generation.api_key).toBe("");
        expect(configData.image_generation.has_api_key).toBe(true);

        const settingsRes = await app.server.inject({ method: "GET", url: "/api/image/settings" });
        expect(settingsRes.statusCode).toBe(200);
        const settingsData = settingsRes.json();
        expect(settingsData.settings.api_key).toBe("");
        expect(settingsData.settings.has_api_key).toBe(true);
      } finally {
        await app.close();
      }
    });
  });

  describe("CORS Protection", () => {
    it("allows loopback origins and denies external origins", async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "cors-test-"));
      roots.push(root);
      const app = await buildApp(root);
      try {
        // Localhost origin should be allowed
        const localhostRes = await app.server.inject({
          method: "GET",
          url: "/api/config",
          headers: { origin: "http://localhost:5173" },
        });
        expect(localhostRes.statusCode).toBe(200);
        expect(localhostRes.headers["access-control-allow-origin"]).toBe("http://localhost:5173");

        // 127.0.0.1 origin should be allowed
        const ipRes = await app.server.inject({
          method: "GET",
          url: "/api/config",
          headers: { origin: "http://127.0.0.1:3000" },
        });
        expect(ipRes.statusCode).toBe(200);
        expect(ipRes.headers["access-control-allow-origin"]).toBe("http://127.0.0.1:3000");

        // Malicious external origin should be blocked by CORS
        const maliciousRes = await app.server.inject({
          method: "GET",
          url: "/api/config",
          headers: { origin: "https://evil-attacker-site.com" },
        });
        expect(maliciousRes.headers["access-control-allow-origin"]).toBeUndefined();
      } finally {
        await app.close();
      }
    });
  });

  describe("WCAG 2.1 Contrast Calculation", () => {
    it("accurately evaluates high contrast and low contrast color pairs", () => {
      // Black text on white background (maximum contrast 21:1)
      const blackOnWhite = evaluateContrast("#000000", "#FFFFFF", 4.5);
      expect(blackOnWhite.ok).toBe(true);
      expect(blackOnWhite.ratio).toBe(21);
      expect(blackOnWhite.message).toContain("Passes WCAG AA");

      // White text on white background (no contrast 1:1)
      const whiteOnWhite = evaluateContrast("#FFFFFF", "#FFFFFF", 4.5);
      expect(whiteOnWhite.ok).toBe(false);
      expect(whiteOnWhite.ratio).toBe(1);
      expect(whiteOnWhite.message).toContain("Fails WCAG AA");

      // Dark blue text on light cream surface
      const candyArcadeContrast = computeContrastRatio("#152A57", "#FFFDF7");
      expect(candyArcadeContrast).toBeGreaterThanOrEqual(10.0);
    });
  });

  describe("Error Handler HTTP Status & Stack Trace Sanitization", () => {
    it("maps NOT_FOUND errors to 404 and does not leak stack traces in response", async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "err-test-"));
      roots.push(root);
      const app = await buildApp(root);
      try {
        const res = await app.server.inject({
          method: "GET",
          url: "/api/channels/non-existent-channel/episodes/non-existent-episode",
        });
        expect(res.statusCode).toBe(404);
        const data = res.json();
        expect(data.error).toBeTruthy();
        expect(data.detail).toBeUndefined();
      } finally {
        await app.close();
      }
    });
  });
});
