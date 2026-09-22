import { z } from "zod";

export const AssetCategorySchema = z.enum(["brand", "social", "art"]);
export type AssetCategory = z.infer<typeof AssetCategorySchema>;

export const SocialPlatformSchema = z.enum(["youtube", "x", "facebook", "tiktok"]);
export type SocialPlatform = z.infer<typeof SocialPlatformSchema>;

export const SocialAssetKindSchema = z.enum(["avatar", "banner"]);
export type SocialAssetKind = z.infer<typeof SocialAssetKindSchema>;

export const BrandAssetItemSchema = z.object({
  id: z.string().min(1),
  filename: z.string().min(1),
  relative_path: z.string().min(1),
  url: z.string().optional(),
  mime_type: z.string().min(1),
  size_bytes: z.number().int().nonnegative(),
  width: z.number().int().nonnegative(),
  height: z.number().int().nonnegative(),
  created_at: z.string().min(1),
  updated_at: z.string().min(1),
});
export type BrandAssetItem = z.infer<typeof BrandAssetItemSchema>;

export const BrandIdentityAssetsSchema = z.object({
  logo: BrandAssetItemSchema.optional(),
});
export type BrandIdentityAssets = z.infer<typeof BrandIdentityAssetsSchema>;

export const SocialPlatformAssetsSchema = z.object({
  avatar: BrandAssetItemSchema.optional(),
  banner: BrandAssetItemSchema.optional(),
});
export type SocialPlatformAssets = z.infer<typeof SocialPlatformAssetsSchema>;

export const SocialDesignAssetsSchema = z.record(SocialPlatformSchema, SocialPlatformAssetsSchema);
export type SocialDesignAssets = z.infer<typeof SocialDesignAssetsSchema>;

export const SocialArtAssetSchema = BrandAssetItemSchema.extend({
  tags: z.array(z.string()).optional().default([]),
  caption: z.string().optional(),
});
export type SocialArtAsset = z.infer<typeof SocialArtAssetSchema>;

export const ChannelAssetManifestSchema = z.object({
  version: z.number().int().default(1),
  updated_at: z.string().min(1),
  brand: BrandIdentityAssetsSchema.default({}),
  social: SocialDesignAssetsSchema.default({}),
  art: z.array(SocialArtAssetSchema).default([]),
});
export type ChannelAssetManifest = z.infer<typeof ChannelAssetManifestSchema>;

export const UploadBrandLogoInputSchema = z.object({
  image_data: z.string().min(1),
  filename: z.string().optional(),
  mime_type: z.string().optional(),
});
export type UploadBrandLogoInput = z.infer<typeof UploadBrandLogoInputSchema>;

export const UploadSocialAssetInputSchema = z.object({
  platform: SocialPlatformSchema,
  kind: SocialAssetKindSchema,
  image_data: z.string().min(1),
  filename: z.string().optional(),
  mime_type: z.string().optional(),
});
export type UploadSocialAssetInput = z.infer<typeof UploadSocialAssetInputSchema>;

export const UploadSocialArtInputSchema = z.object({
  image_data: z.string().min(1),
  filename: z.string().optional(),
  mime_type: z.string().optional(),
  caption: z.string().optional(),
  tags: z.array(z.string()).optional(),
});
export type UploadSocialArtInput = z.infer<typeof UploadSocialArtInputSchema>;

export const DeleteSocialArtInputSchema = z.object({
  asset_id: z.string().min(1),
});
export type DeleteSocialArtInput = z.infer<typeof DeleteSocialArtInputSchema>;

export const ChannelMascotSummarySchema = z.object({
  mascot_id: z.string().min(1),
  name: z.string().min(1),
  master_image_url: z.string().nullable(),
});
export type ChannelMascotSummary = z.infer<typeof ChannelMascotSummarySchema>;

export const ChannelAssetsOverviewResponseSchema = z.object({
  channel_id: z.string().min(1),
  channel_slug: z.string().min(1),
  manifest: ChannelAssetManifestSchema,
  mascot: ChannelMascotSummarySchema.nullable(),
});
export type ChannelAssetsOverviewResponse = z.infer<typeof ChannelAssetsOverviewResponseSchema>;

export const ChannelAssetMutationResponseSchema = z.object({
  asset: BrandAssetItemSchema,
  manifest: ChannelAssetManifestSchema,
});
export type ChannelAssetMutationResponse<T extends BrandAssetItem = BrandAssetItem> = {
  asset: T;
  manifest: ChannelAssetManifest;
};

export const ChannelAssetDeleteResponseSchema = z.object({
  ok: z.literal(true),
  manifest: ChannelAssetManifestSchema,
});
export type ChannelAssetDeleteResponse = z.infer<typeof ChannelAssetDeleteResponseSchema>;
