import type {
  BrandAssetItem,
  ChannelAssetManifest,
  SocialArtAsset,
  SocialAssetKind,
  SocialPlatform,
} from "@studio/shared";

export interface IChannelAssetRepository {
  ensureChannelAssetDirs(channelSlug: string): Promise<void>;
  getChannelAssetManifest(channelSlug: string): Promise<ChannelAssetManifest>;
  saveChannelAssetManifest(channelSlug: string, manifest: ChannelAssetManifest): Promise<void>;
  storeBrandLogo(channelSlug: string, buffer: Buffer, mimeType: string, filename: string): Promise<BrandAssetItem>;
  deleteBrandLogo(channelSlug: string): Promise<void>;
  storeSocialAsset(
    channelSlug: string,
    platform: SocialPlatform,
    kind: SocialAssetKind,
    buffer: Buffer,
    mimeType: string,
    filename: string,
  ): Promise<BrandAssetItem>;
  deleteSocialAsset(channelSlug: string, platform: SocialPlatform, kind: SocialAssetKind): Promise<void>;
  storeSocialArt(
    channelSlug: string,
    buffer: Buffer,
    mimeType: string,
    filename: string,
    caption?: string,
  ): Promise<SocialArtAsset>;
  deleteSocialArt(channelSlug: string, assetId: string): Promise<void>;
}
