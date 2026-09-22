import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AssetCategorySchema,
  SocialPlatformSchema,
  SocialAssetKindSchema,
  BrandAssetItemSchema,
  BrandIdentityAssetsSchema,
  SocialPlatformAssetsSchema,
  SocialDesignAssetsSchema,
  SocialArtAssetSchema,
  ChannelAssetManifestSchema,
  UploadBrandLogoInputSchema,
  UploadSocialAssetInputSchema,
  UploadSocialArtInputSchema,
  DeleteSocialArtInputSchema,
  type BrandAssetItem,
  type ChannelAssetManifest,
  type SocialArtAsset,
} from "../src/index.js";

describe("Channel Assets Domain Schemas", () => {
  it("validates AssetCategorySchema enum values", () => {
    assert.equal(AssetCategorySchema.parse("brand"), "brand");
    assert.equal(AssetCategorySchema.parse("social"), "social");
    assert.equal(AssetCategorySchema.parse("art"), "art");
    assert.throws(() => AssetCategorySchema.parse("invalid"));
  });

  it("validates SocialPlatformSchema enum values", () => {
    assert.equal(SocialPlatformSchema.parse("youtube"), "youtube");
    assert.equal(SocialPlatformSchema.parse("x"), "x");
    assert.equal(SocialPlatformSchema.parse("facebook"), "facebook");
    assert.equal(SocialPlatformSchema.parse("tiktok"), "tiktok");
    assert.throws(() => SocialPlatformSchema.parse("instagram"));
  });

  it("validates SocialAssetKindSchema enum values", () => {
    assert.equal(SocialAssetKindSchema.parse("avatar"), "avatar");
    assert.equal(SocialAssetKindSchema.parse("banner"), "banner");
    assert.throws(() => SocialAssetKindSchema.parse("thumbnail"));
  });

  it("validates BrandAssetItemSchema", () => {
    const raw: BrandAssetItem = {
      id: "asset_logo_123",
      filename: "logo.png",
      relative_path: "channels/my-channel/assets/brand/asset_logo_123_logo.png",
      mime_type: "image/png",
      size_bytes: 4096,
      width: 512,
      height: 512,
      created_at: "2026-09-22T00:00:00.000Z",
      updated_at: "2026-09-22T00:00:00.000Z",
    };
    const parsed = BrandAssetItemSchema.parse(raw);
    assert.equal(parsed.id, "asset_logo_123");
    assert.equal(parsed.width, 512);
  });

  it("validates BrandIdentityAssetsSchema with optional logo", () => {
    const empty = BrandIdentityAssetsSchema.parse({});
    assert.equal(empty.logo, undefined);

    const withLogo = BrandIdentityAssetsSchema.parse({
      logo: {
        id: "logo_1",
        filename: "logo.png",
        relative_path: "channels/ch1/assets/brand/logo.png",
        mime_type: "image/png",
        size_bytes: 1024,
        width: 256,
        height: 256,
        created_at: "2026-09-22T00:00:00.000Z",
        updated_at: "2026-09-22T00:00:00.000Z",
      },
    });
    assert.equal(withLogo.logo?.id, "logo_1");
  });

  it("validates SocialPlatformAssetsSchema and SocialDesignAssetsSchema", () => {
    const parsed = SocialDesignAssetsSchema.parse({
      youtube: {
        avatar: {
          id: "yt_avatar",
          filename: "avatar.png",
          relative_path: "channels/ch1/assets/social/youtube/avatar.png",
          mime_type: "image/png",
          size_bytes: 2048,
          width: 800,
          height: 800,
          created_at: "2026-09-22T00:00:00.000Z",
          updated_at: "2026-09-22T00:00:00.000Z",
        },
      },
    });
    assert.equal(parsed.youtube?.avatar?.id, "yt_avatar");
  });

  it("validates SocialArtAssetSchema with caption and tags", () => {
    const raw: SocialArtAsset = {
      id: "art_1",
      filename: "wallpaper.jpg",
      relative_path: "channels/ch1/assets/art/wallpaper.jpg",
      mime_type: "image/jpeg",
      size_bytes: 10240,
      width: 1920,
      height: 1080,
      created_at: "2026-09-22T00:00:00.000Z",
      updated_at: "2026-09-22T00:00:00.000Z",
      caption: "Season 1 Promo Artwork",
      tags: ["promo", "s1"],
    };
    const parsed = SocialArtAssetSchema.parse(raw);
    assert.equal(parsed.caption, "Season 1 Promo Artwork");
    assert.deepEqual(parsed.tags, ["promo", "s1"]);
  });

  it("validates ChannelAssetManifestSchema with defaults", () => {
    const parsed: ChannelAssetManifest = ChannelAssetManifestSchema.parse({
      updated_at: "2026-09-22T00:00:00.000Z",
    });
    assert.equal(parsed.version, 1);
    assert.deepEqual(parsed.brand, {});
    assert.deepEqual(parsed.social, {});
    assert.deepEqual(parsed.art, []);
  });

  it("validates upload and delete input schemas", () => {
    const brandInput = UploadBrandLogoInputSchema.parse({
      image_data: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==",
      filename: "logo.png",
      mime_type: "image/png",
    });
    assert.equal(brandInput.filename, "logo.png");

    const socialInput = UploadSocialAssetInputSchema.parse({
      platform: "youtube",
      kind: "banner",
      image_data: "base64...",
    });
    assert.equal(socialInput.platform, "youtube");
    assert.equal(socialInput.kind, "banner");

    const artInput = UploadSocialArtInputSchema.parse({
      image_data: "base64...",
      caption: "Featured art",
      tags: ["cool"],
    });
    assert.equal(artInput.caption, "Featured art");

    const deleteArt = DeleteSocialArtInputSchema.parse({
      asset_id: "art_999",
    });
    assert.equal(deleteArt.asset_id, "art_999");
  });
});
