import { describe, expect, it } from "vitest";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type { Channel, ChannelAssetManifest } from "@studio/shared";
import {
  extractChannelInitial,
  resolveChannelBrandIdentity,
} from "../src/quiz/brand/channelBrandAssetResolver.js";
import { renderBrandLogoBadge } from "../src/quiz/render/candyArcade/transitions/brandLogoFallbackBadge.js";
import type { RepositoryService } from "../src/repository.js";

describe("Phase 2: Channel Brand Asset Pipeline & Smart Fallback", () => {
  describe("extractChannelInitial", () => {
    it("extracts uppercase first character from single or multi-word channel names", () => {
      expect(extractChannelInitial("Galaxy Quiz")).toBe("G");
      expect(extractChannelInitial("felix")).toBe("F");
      expect(extractChannelInitial("  arcade mania  ")).toBe("A");
    });

    it("falls back to star emblem for empty or undefined channel names", () => {
      expect(extractChannelInitial("")).toBe("★");
      expect(extractChannelInitial("   ")).toBe("★");
      expect(extractChannelInitial(null)).toBe("★");
      expect(extractChannelInitial(undefined)).toBe("★");
    });
  });

  describe("resolveChannelBrandIdentity", () => {
    const mockChannel: Channel = {
      channel_id: "ch_test_brand",
      slug: "test-channel",
      display_name: "Test Star Channel",
      channel_dna_path: "channels/test-channel/dna.md",
      status: "ACTIVE",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    it("resolves uploaded brand.logo and copies to renderRoot", async () => {
      const tempDir = await mkdir(path.join(os.tmpdir(), "brand-test-" + Date.now()), { recursive: true });
      const channelAssetsDir = path.join(tempDir, "channels", "test-channel", "assets", "brand");
      await mkdir(channelAssetsDir, { recursive: true });

      const logoFile = path.join(channelAssetsDir, "channel_logo.png");
      await writeFile(logoFile, Buffer.from("fake-png-content"));

      const manifest: ChannelAssetManifest = {
        version: 1,
        updated_at: new Date().toISOString(),
        brand: {
          logo: {
            id: "logo-01",
            filename: "channel_logo.png",
            relative_path: path.join("channels", "test-channel", "assets", "brand", "channel_logo.png"),
            mime_type: "image/png",
            size_bytes: 16,
            width: 512,
            height: 512,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        },
        social: {},
        art: [],
      };

      const mockRepository = {
        rootDirectory: tempDir,
        resolvePath: (...segments: string[]) => path.join(tempDir, ...segments),
        getChannelAssetManifest: async () => manifest,
      } as unknown as RepositoryService;

      const renderRoot = path.join(tempDir, "render-workspace");

      const resolved = await resolveChannelBrandIdentity({
        channel: mockChannel,
        repository: mockRepository,
        renderRoot,
      });

      expect(resolved.hasCustomLogo).toBe(true);
      expect(resolved.channelName).toBe("Test Star Channel");
      expect(resolved.fallbackInitial).toBe("T");
      expect(resolved.logoRelativeUrl).toBe("./brand/channel_logo.png");
      expect(resolved.logoWidth).toBe(512);

      await rm(tempDir, { recursive: true, force: true });
    });

    it("falls back gracefully to youtube avatar when brand.logo is absent", async () => {
      const tempDir = await mkdir(path.join(os.tmpdir(), "brand-avatar-test-" + Date.now()), { recursive: true });
      const avatarDir = path.join(tempDir, "channels", "test-channel", "assets", "social", "youtube");
      await mkdir(avatarDir, { recursive: true });

      const avatarFile = path.join(avatarDir, "youtube_avatar.jpg");
      await writeFile(avatarFile, Buffer.from("fake-jpg-content"));

      const manifest: ChannelAssetManifest = {
        version: 1,
        updated_at: new Date().toISOString(),
        brand: {},
        social: {
          youtube: {
            avatar: {
              id: "avatar-01",
              filename: "youtube_avatar.jpg",
              relative_path: path.join("channels", "test-channel", "assets", "social", "youtube", "youtube_avatar.jpg"),
              mime_type: "image/jpeg",
              size_bytes: 16,
              width: 256,
              height: 256,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          },
        },
        art: [],
      };

      const mockRepository = {
        rootDirectory: tempDir,
        resolvePath: (...segments: string[]) => path.join(tempDir, ...segments),
        getChannelAssetManifest: async () => manifest,
      } as unknown as RepositoryService;

      const resolved = await resolveChannelBrandIdentity({
        channel: mockChannel,
        repository: mockRepository,
      });

      expect(resolved.hasCustomLogo).toBe(true);
      expect(resolved.logoRelativeUrl).toBe("./brand/youtube_avatar.jpg");

      await rm(tempDir, { recursive: true, force: true });
    });

    it("falls back to lettermark when manifest has no logo or avatar assets", async () => {
      const mockRepository = {
        resolvePath: (...segments: string[]) => path.join("fake-root", ...segments),
        getChannelAssetManifest: async () => ({
          version: 1,
          updated_at: new Date().toISOString(),
          brand: {},
          social: {},
          art: [],
        }),
      } as unknown as RepositoryService;

      const resolved = await resolveChannelBrandIdentity({
        channel: mockChannel,
        repository: mockRepository,
      });

      expect(resolved.hasCustomLogo).toBe(false);
      expect(resolved.fallbackInitial).toBe("T");
      expect(resolved.channelName).toBe("Test Star Channel");
    });

    it("resolves logo via resolveContextPath without invoking resolvePath with invalid root", async () => {
      const tempDir = await mkdir(path.join(os.tmpdir(), "brand-context-path-test-" + Date.now()), { recursive: true });
      const channelAssetsDir = path.join(tempDir, "channels", "test-channel", "assets", "brand");
      await mkdir(channelAssetsDir, { recursive: true });

      const logoFile = path.join(channelAssetsDir, "brand_mark.png");
      await writeFile(logoFile, Buffer.from("logo-bytes"));

      const manifest: ChannelAssetManifest = {
        version: 1,
        updated_at: new Date().toISOString(),
        brand: {
          logo: {
            id: "logo-context-01",
            filename: "brand_mark.png",
            relative_path: "channels/test-channel/assets/brand/brand_mark.png",
            mime_type: "image/png",
            size_bytes: 10,
            width: 200,
            height: 200,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        },
        social: {},
        art: [],
      };

      let resolveContextPathCalled = false;
      const mockRepository = {
        rootDirectory: tempDir,
        resolveContextPath: (relativePath: string) => {
          resolveContextPathCalled = true;
          return path.join(tempDir, relativePath);
        },
        resolvePath: (root: string, ..._segments: string[]) => {
          // If called with a context path as first argument, it reproduces the real bug
          if (root.includes("/") || root.includes("\\")) {
            throw new TypeError('The "paths[0]" argument must be of type string. Received undefined');
          }
          return path.join(tempDir, root, ..._segments);
        },
        getChannelAssetManifest: async () => manifest,
      } as unknown as RepositoryService;

      const resolved = await resolveChannelBrandIdentity({
        channel: mockChannel,
        repository: mockRepository,
      });

      expect(resolveContextPathCalled).toBe(true);
      expect(resolved.hasCustomLogo).toBe(true);
      expect(resolved.logoSourcePath).toBe(path.join(tempDir, "channels/test-channel/assets/brand/brand_mark.png"));

      await rm(tempDir, { recursive: true, force: true });
    });

    it("gracefully falls back to lettermark if path resolution throws an error", async () => {
      const manifest: ChannelAssetManifest = {
        version: 1,
        updated_at: new Date().toISOString(),
        brand: {
          logo: {
            id: "broken-logo",
            filename: "broken.png",
            relative_path: "channels/invalid-escape/brand.png",
            mime_type: "image/png",
            size_bytes: 10,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        },
        social: {},
        art: [],
      };

      const mockRepository = {
        resolveContextPath: () => {
          throw new Error("Unsafe context path");
        },
        getChannelAssetManifest: async () => manifest,
      } as unknown as RepositoryService;

      const resolved = await resolveChannelBrandIdentity({
        channel: mockChannel,
        repository: mockRepository,
      });

      expect(resolved.hasCustomLogo).toBe(false);
      expect(resolved.fallbackInitial).toBe("T");
    });
  });

  describe("renderBrandLogoBadge", () => {
    it("renders custom logo frame with shimmer when hasCustomLogo is true", () => {
      const html = renderBrandLogoBadge({
        hasCustomLogo: true,
        logoUrl: "./brand/logo.png",
        channelName: "Space Quest",
        fallbackInitial: "S",
      });

      expect(html).toContain("brand-stinger-custom-logo");
      expect(html).toContain('src="./brand/logo.png"');
      expect(html).toContain('alt="Space Quest"');
      expect(html).toContain("brand-stinger-shimmer");
    });

    it("renders 3D metallic lettermark badge when hasCustomLogo is false", () => {
      const html = renderBrandLogoBadge({
        hasCustomLogo: false,
        channelName: "Galaxy Trivia",
        fallbackInitial: "G",
      });

      expect(html).toContain("brand-stinger-fallback-badge");
      expect(html).toContain("brand-lettermark-text");
      expect(html).toContain(">G<");
      expect(html).not.toContain("<img");
      expect(html).toContain("brand-badge-ring");
    });
  });
});
