import type {
  ChannelAssetDeleteResponse,
  ChannelAssetMutationResponse,
  ChannelAssetsOverviewResponse,
  SocialArtAsset,
  SocialAssetKind,
  SocialPlatform,
  UploadBrandLogoInput,
  UploadSocialArtInput,
  UploadSocialAssetInput,
} from "@studio/shared";
import { request } from "./client";

export const channelAssetsApi = {
  getChannelAssets: (channelId: string): Promise<ChannelAssetsOverviewResponse> =>
    request<ChannelAssetsOverviewResponse>(`/api/channels/${encodeURIComponent(channelId)}/assets`),

  uploadBrandLogo: (channelId: string, input: UploadBrandLogoInput): Promise<ChannelAssetMutationResponse> =>
    request<ChannelAssetMutationResponse>(`/api/channels/${encodeURIComponent(channelId)}/assets/brand/logo`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  deleteBrandLogo: (channelId: string): Promise<ChannelAssetDeleteResponse> =>
    request<ChannelAssetDeleteResponse>(`/api/channels/${encodeURIComponent(channelId)}/assets/brand/logo`, {
      method: "DELETE",
    }),

  uploadSocialAsset: (
    channelId: string,
    platform: SocialPlatform,
    kind: SocialAssetKind,
    input: UploadSocialAssetInput,
  ): Promise<ChannelAssetMutationResponse> =>
    request<ChannelAssetMutationResponse>(
      `/api/channels/${encodeURIComponent(channelId)}/assets/social/${encodeURIComponent(platform)}/${encodeURIComponent(kind)}`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    ),

  deleteSocialAsset: (
    channelId: string,
    platform: SocialPlatform,
    kind: SocialAssetKind,
  ): Promise<ChannelAssetDeleteResponse> =>
    request<ChannelAssetDeleteResponse>(
      `/api/channels/${encodeURIComponent(channelId)}/assets/social/${encodeURIComponent(platform)}/${encodeURIComponent(kind)}`,
      {
        method: "DELETE",
      },
    ),

  uploadSocialArt: (
    channelId: string,
    input: UploadSocialArtInput,
  ): Promise<ChannelAssetMutationResponse<SocialArtAsset>> =>
    request<ChannelAssetMutationResponse<SocialArtAsset>>(
      `/api/channels/${encodeURIComponent(channelId)}/assets/art`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    ),

  deleteSocialArt: (channelId: string, assetId: string): Promise<ChannelAssetDeleteResponse> =>
    request<ChannelAssetDeleteResponse>(
      `/api/channels/${encodeURIComponent(channelId)}/assets/art/${encodeURIComponent(assetId)}`,
      {
        method: "DELETE",
      },
    ),

  getExportZipUrl: (channelId: string): string =>
    `/api/channels/${encodeURIComponent(channelId)}/assets/export-zip`,
};
