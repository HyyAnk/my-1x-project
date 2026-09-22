import type { FastifyInstance } from "fastify";
import {
  SocialAssetKindSchema,
  SocialPlatformSchema,
  UploadBrandLogoInputSchema,
  UploadSocialArtInputSchema,
  UploadSocialAssetInputSchema,
} from "@studio/shared";
import { attachAssetUrls, attachItemUrl, extractBase64Buffer } from "./channelAssetHelpers.js";
import type { ChannelAssetsRouteDeps } from "./channelAssetTypes.js";

export function registerChannelAssetMutationRoutes(server: FastifyInstance, deps: ChannelAssetsRouteDeps): void {
  const { repository } = deps;

  server.post("/api/channels/:channelId/assets/brand/logo", async (request) => {
    const { channelId } = request.params as { channelId: string };
    const channel = await repository.getChannel(channelId);
    const input = UploadBrandLogoInputSchema.parse(request.body);
    const { buffer, mimeType } = extractBase64Buffer(input.image_data, input.mime_type);
    const asset = await repository.storeBrandLogo(channel.slug, buffer, mimeType, input.filename || "logo.png");
    const manifest = await repository.getChannelAssetManifest(channel.slug);
    return {
      asset: attachItemUrl(channel.channel_id, asset),
      manifest: attachAssetUrls(channel.channel_id, manifest),
    };
  });

  server.delete("/api/channels/:channelId/assets/brand/logo", async (request) => {
    const { channelId } = request.params as { channelId: string };
    const channel = await repository.getChannel(channelId);
    await repository.deleteBrandLogo(channel.slug);
    const manifest = await repository.getChannelAssetManifest(channel.slug);
    return {
      ok: true as const,
      manifest: attachAssetUrls(channel.channel_id, manifest),
    };
  });

  server.post("/api/channels/:channelId/assets/social/:platform/:kind", async (request) => {
    const params = request.params as { channelId: string; platform: string; kind: string };
    const channel = await repository.getChannel(params.channelId);
    const platform = SocialPlatformSchema.parse(params.platform);
    const kind = SocialAssetKindSchema.parse(params.kind);
    const body = request.body && typeof request.body === "object" ? request.body : {};
    const input = UploadSocialAssetInputSchema.parse({ ...body, platform, kind });
    const { buffer, mimeType } = extractBase64Buffer(input.image_data, input.mime_type);
    const filename = input.filename || `${platform}_${kind}.png`;
    const asset = await repository.storeSocialAsset(channel.slug, platform, kind, buffer, mimeType, filename);
    const manifest = await repository.getChannelAssetManifest(channel.slug);
    return {
      asset: attachItemUrl(channel.channel_id, asset),
      manifest: attachAssetUrls(channel.channel_id, manifest),
    };
  });

  server.delete("/api/channels/:channelId/assets/social/:platform/:kind", async (request) => {
    const params = request.params as { channelId: string; platform: string; kind: string };
    const channel = await repository.getChannel(params.channelId);
    const platform = SocialPlatformSchema.parse(params.platform);
    const kind = SocialAssetKindSchema.parse(params.kind);
    await repository.deleteSocialAsset(channel.slug, platform, kind);
    const manifest = await repository.getChannelAssetManifest(channel.slug);
    return {
      ok: true as const,
      manifest: attachAssetUrls(channel.channel_id, manifest),
    };
  });

  server.post("/api/channels/:channelId/assets/art", async (request) => {
    const { channelId } = request.params as { channelId: string };
    const channel = await repository.getChannel(channelId);
    const input = UploadSocialArtInputSchema.parse(request.body);
    const { buffer, mimeType } = extractBase64Buffer(input.image_data, input.mime_type);
    const filename = input.filename || "art.png";
    const asset = await repository.storeSocialArt(channel.slug, buffer, mimeType, filename, input.caption);
    const manifest = await repository.getChannelAssetManifest(channel.slug);
    return {
      asset: attachItemUrl(channel.channel_id, asset),
      manifest: attachAssetUrls(channel.channel_id, manifest),
    };
  });

  server.delete("/api/channels/:channelId/assets/art/:assetId", async (request) => {
    const params = request.params as { channelId: string; assetId: string };
    const channel = await repository.getChannel(params.channelId);
    await repository.deleteSocialArt(channel.slug, params.assetId);
    const manifest = await repository.getChannelAssetManifest(channel.slug);
    return {
      ok: true as const,
      manifest: attachAssetUrls(channel.channel_id, manifest),
    };
  });
}
