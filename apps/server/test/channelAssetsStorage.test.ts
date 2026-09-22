import { mkdtemp, mkdir, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RepositoryService, RepositoryError } from "../src/repository.js";

describe("Channel Assets Storage Service Foundation", () => {
  let tempRoot: string;
  let repository: RepositoryService;
  const channelSlug = "science-quiz-hub";

  beforeEach(async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), "brand-hub-test-"));
    await mkdir(path.join(tempRoot, "templates"), { recursive: true });
    await mkdir(path.join(tempRoot, "channels", channelSlug), { recursive: true });
    repository = new RepositoryService(tempRoot);
    await repository.ensureBootstrap();
  });

  afterEach(async () => {
    await repository.close();
    await rm(tempRoot, { recursive: true, force: true }).catch(() => {});
  });

  async function createTestImage(width: number, height: number, color = { r: 64, g: 128, b: 255, alpha: 1 }): Promise<Buffer> {
    return sharp({
      create: {
        width,
        height,
        channels: 4,
        background: color,
      },
    })
      .png()
      .toBuffer();
  }

  it("creates all required channel asset directories in ensureChannelAssetDirs", async () => {
    await repository.ensureChannelAssetDirs(channelSlug);

    const checkDir = async (...segments: string[]) => {
      const dirPath = path.join(repository.storageRoot, "channels", channelSlug, "assets", ...segments);
      const stats = await stat(dirPath);
      expect(stats.isDirectory()).toBe(true);
    };

    await checkDir("brand");
    await checkDir("social", "youtube");
    await checkDir("social", "x");
    await checkDir("social", "facebook");
    await checkDir("social", "tiktok");
    await checkDir("art");
  });

  it("initializes a default manifest if one does not exist", async () => {
    const manifest = await repository.getChannelAssetManifest(channelSlug);

    expect(manifest.version).toBe(1);
    expect(typeof manifest.updated_at).toBe("string");
    expect(manifest.brand).toEqual({});
    expect(manifest.social.youtube).toEqual({});
    expect(manifest.social.x).toEqual({});
    expect(manifest.social.facebook).toEqual({});
    expect(manifest.social.tiktok).toEqual({});
    expect(manifest.art).toEqual([]);

    const manifestFilePath = path.join(repository.storageRoot, "channels", channelSlug, "assets", "manifest.json");
    const onDiskRaw = await readFile(manifestFilePath, "utf8");
    const onDisk = JSON.parse(onDiskRaw);
    expect(onDisk.version).toBe(1);
  });

  it("saves manifest updates atomically", async () => {
    const initial = await repository.getChannelAssetManifest(channelSlug);
    const updated = {
      ...initial,
      art: [],
    };

    await repository.saveChannelAssetManifest(channelSlug, updated);
    const reloaded = await repository.getChannelAssetManifest(channelSlug);
    expect(reloaded.version).toBe(1);
    expect(reloaded.updated_at).toBeDefined();
  });

  it("stores and replaces brand logo with sharp dimension extraction", async () => {
    const imageBuffer = await createTestImage(320, 240);
    const logo = await repository.storeBrandLogo(channelSlug, imageBuffer, "image/png", "brand_logo.png");

    expect(logo.id).toMatch(/^logo_/);
    expect(logo.filename).toBe("brand_logo.png");
    expect(logo.width).toBe(320);
    expect(logo.height).toBe(240);
    expect(logo.mime_type).toBe("image/png");
    expect(logo.size_bytes).toBe(imageBuffer.byteLength);

    const logoFullPath = path.join(repository.storageRoot, logo.relative_path);
    const diskStat = await stat(logoFullPath);
    expect(diskStat.isFile()).toBe(true);

    const manifestAfterFirst = await repository.getChannelAssetManifest(channelSlug);
    expect(manifestAfterFirst.brand.logo?.id).toBe(logo.id);

    // Replace brand logo with new dimensions
    const replacementBuffer = await createTestImage(500, 500);
    const newLogo = await repository.storeBrandLogo(channelSlug, replacementBuffer, "image/png", "new_logo.png");

    expect(newLogo.id).not.toBe(logo.id);
    expect(newLogo.width).toBe(500);
    expect(newLogo.height).toBe(500);

    // Ensure previous file was deleted
    await expect(stat(logoFullPath)).rejects.toThrow();

    // Ensure new file exists
    const newLogoPath = path.join(repository.storageRoot, newLogo.relative_path);
    const newStat = await stat(newLogoPath);
    expect(newStat.isFile()).toBe(true);

    const manifestAfterSecond = await repository.getChannelAssetManifest(channelSlug);
    expect(manifestAfterSecond.brand.logo?.id).toBe(newLogo.id);
  });

  it("deletes brand logo and updates manifest", async () => {
    const imageBuffer = await createTestImage(200, 200);
    const logo = await repository.storeBrandLogo(channelSlug, imageBuffer, "image/png", "temp_logo.png");
    const logoFullPath = path.join(repository.storageRoot, logo.relative_path);

    await repository.deleteBrandLogo(channelSlug);

    await expect(stat(logoFullPath)).rejects.toThrow();
    const manifest = await repository.getChannelAssetManifest(channelSlug);
    expect(manifest.brand.logo).toBeUndefined();
  });

  it("stores and deletes social assets across multiple platforms", async () => {
    const avatarBuffer = await createTestImage(800, 800);
    const bannerBuffer = await createTestImage(1920, 1080);

    const ytAvatar = await repository.storeSocialAsset(channelSlug, "youtube", "avatar", avatarBuffer, "image/png", "yt_avatar.png");
    const ytBanner = await repository.storeSocialAsset(channelSlug, "youtube", "banner", bannerBuffer, "image/png", "yt_banner.png");
    const xBanner = await repository.storeSocialAsset(channelSlug, "x", "banner", bannerBuffer, "image/png", "x_banner.png");

    expect(ytAvatar.width).toBe(800);
    expect(ytAvatar.height).toBe(800);
    expect(ytBanner.width).toBe(1920);
    expect(ytBanner.height).toBe(1080);

    const manifest = await repository.getChannelAssetManifest(channelSlug);
    expect(manifest.social.youtube.avatar?.id).toBe(ytAvatar.id);
    expect(manifest.social.youtube.banner?.id).toBe(ytBanner.id);
    expect(manifest.social.x.banner?.id).toBe(xBanner.id);

    // Delete YouTube avatar
    const ytAvatarPath = path.join(repository.storageRoot, ytAvatar.relative_path);
    await repository.deleteSocialAsset(channelSlug, "youtube", "avatar");

    await expect(stat(ytAvatarPath)).rejects.toThrow();
    const manifestAfterDelete = await repository.getChannelAssetManifest(channelSlug);
    expect(manifestAfterDelete.social.youtube.avatar).toBeUndefined();
    expect(manifestAfterDelete.social.youtube.banner?.id).toBe(ytBanner.id);
  });

  it("stores, retrieves, and deletes social art gallery assets", async () => {
    const artBuffer1 = await createTestImage(1024, 768);
    const artBuffer2 = await createTestImage(1280, 720);

    const art1 = await repository.storeSocialArt(channelSlug, artBuffer1, "image/png", "fanart1.png", "First Concept");
    const art2 = await repository.storeSocialArt(channelSlug, artBuffer2, "image/png", "fanart2.png", "Second Concept");

    expect(art1.caption).toBe("First Concept");
    expect(art1.width).toBe(1024);
    expect(art2.caption).toBe("Second Concept");
    expect(art2.width).toBe(1280);

    const manifest = await repository.getChannelAssetManifest(channelSlug);
    expect(manifest.art.length).toBe(2);
    expect(manifest.art[0]?.id).toBe(art1.id);
    expect(manifest.art[1]?.id).toBe(art2.id);

    // Delete first art asset
    const art1Path = path.join(repository.storageRoot, art1.relative_path);
    await repository.deleteSocialArt(channelSlug, art1.id);

    await expect(stat(art1Path)).rejects.toThrow();
    const manifestAfterDelete = await repository.getChannelAssetManifest(channelSlug);
    expect(manifestAfterDelete.art.length).toBe(1);
    expect(manifestAfterDelete.art[0]?.id).toBe(art2.id);

    // Deleting non-existent art asset throws ASSET_NOT_FOUND
    await expect(repository.deleteSocialArt(channelSlug, "non_existent_id")).rejects.toThrow(RepositoryError);
  });

  it("handles concurrent asset operations sequentially without corrupting manifest", async () => {
    const buffers = await Promise.all([
      createTestImage(100, 100),
      createTestImage(200, 200),
      createTestImage(300, 300),
    ]);

    await Promise.all([
      repository.storeSocialArt(channelSlug, buffers[0]!, "image/png", "concurrent1.png", "Art 1"),
      repository.storeSocialArt(channelSlug, buffers[1]!, "image/png", "concurrent2.png", "Art 2"),
      repository.storeSocialArt(channelSlug, buffers[2]!, "image/png", "concurrent3.png", "Art 3"),
    ]);

    const manifest = await repository.getChannelAssetManifest(channelSlug);
    expect(manifest.art.length).toBe(3);
  });
});
