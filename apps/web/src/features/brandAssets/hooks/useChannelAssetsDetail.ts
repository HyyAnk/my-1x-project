import { useCallback, useEffect, useState } from "react";
import type {
  ChannelAssetsOverviewResponse,
  SocialAssetKind,
  SocialPlatform,
} from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";
import { formatPlatformName, readFileAsBase64, triggerFileDownload } from "../utils/fileUploadHelpers";

export interface UseChannelAssetsDetailOptions {
  channelId?: string | null;
  onNotice?: (notice: NonNullable<Notice>) => void;
}

export interface UseChannelAssetsDetailResult {
  overview: ChannelAssetsOverviewResponse | null;
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  uploadLogo: (file: File) => Promise<void>;
  deleteLogo: () => Promise<void>;
  uploadSocialAsset: (platform: SocialPlatform, kind: SocialAssetKind, file: File) => Promise<void>;
  deleteSocialAsset: (platform: SocialPlatform, kind: SocialAssetKind) => Promise<void>;
  uploadSocialArt: (file: File, caption?: string) => Promise<void>;
  deleteSocialArt: (assetId: string) => Promise<void>;
  exportBrandKit: () => void;
}

function notifyMutationError(
  err: unknown,
  fallback: string,
  onNotice?: (notice: NonNullable<Notice>) => void,
): never {
  const message = err instanceof Error ? err.message : fallback;
  onNotice?.({ tone: "bad", message });
  throw err;
}

export function useChannelAssetsDetail({
  channelId,
  onNotice,
}: UseChannelAssetsDetailOptions): UseChannelAssetsDetailResult {
  const [overview, setOverview] = useState<ChannelAssetsOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMutating, setIsMutating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.channelAssets.getChannelAssets(id);
      setOverview(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load channel assets.";
      setError(message);
      onNotice?.({ tone: "bad", message });
    } finally {
      setIsLoading(false);
    }
  }, [onNotice]);

  useEffect(() => {
    if (!channelId) {
      setOverview(null);
      setError(null);
      setIsLoading(false);
      return;
    }
    void fetchOverview(channelId);
  }, [channelId, fetchOverview]);

  const refresh = useCallback(async () => {
    if (channelId) {
      await fetchOverview(channelId);
    }
  }, [channelId, fetchOverview]);

  const uploadLogo = useCallback(async (file: File) => {
    if (!channelId) return;
    setIsMutating(true);
    try {
      const base64 = await readFileAsBase64(file);
      const res = await api.channelAssets.uploadBrandLogo(channelId, {
        image_data: base64,
        filename: file.name,
        mime_type: file.type || "image/png",
      });
      setOverview((prev) => (prev ? { ...prev, manifest: res.manifest } : null));
      onNotice?.({ tone: "good", message: "Channel logo uploaded successfully." });
    } catch (err: unknown) {
      notifyMutationError(err, "Failed to upload channel logo.", onNotice);
    } finally {
      setIsMutating(false);
    }
  }, [channelId, onNotice]);

  const deleteLogo = useCallback(async () => {
    if (!channelId) return;
    setIsMutating(true);
    try {
      const res = await api.channelAssets.deleteBrandLogo(channelId);
      setOverview((prev) => (prev ? { ...prev, manifest: res.manifest } : null));
      onNotice?.({ tone: "good", message: "Channel logo deleted successfully." });
    } catch (err: unknown) {
      notifyMutationError(err, "Failed to delete channel logo.", onNotice);
    } finally {
      setIsMutating(false);
    }
  }, [channelId, onNotice]);

  const uploadSocialAsset = useCallback(
    async (platform: SocialPlatform, kind: SocialAssetKind, file: File) => {
      if (!channelId) return;
      setIsMutating(true);
      try {
        const base64 = await readFileAsBase64(file);
        const res = await api.channelAssets.uploadSocialAsset(channelId, platform, kind, {
          platform,
          kind,
          image_data: base64,
          filename: file.name,
          mime_type: file.type || "image/png",
        });
        setOverview((prev) => (prev ? { ...prev, manifest: res.manifest } : null));
        const platformName = formatPlatformName(platform);
        onNotice?.({ tone: "good", message: `${platformName} ${kind} uploaded successfully.` });
      } catch (err: unknown) {
        notifyMutationError(err, `Failed to upload ${kind}.`, onNotice);
      } finally {
        setIsMutating(false);
      }
    },
    [channelId, onNotice],
  );

  const deleteSocialAsset = useCallback(
    async (platform: SocialPlatform, kind: SocialAssetKind) => {
      if (!channelId) return;
      setIsMutating(true);
      try {
        const res = await api.channelAssets.deleteSocialAsset(channelId, platform, kind);
        setOverview((prev) => (prev ? { ...prev, manifest: res.manifest } : null));
        const platformName = formatPlatformName(platform);
        onNotice?.({ tone: "good", message: `${platformName} ${kind} deleted successfully.` });
      } catch (err: unknown) {
        notifyMutationError(err, `Failed to delete ${kind}.`, onNotice);
      } finally {
        setIsMutating(false);
      }
    },
    [channelId, onNotice],
  );

  const uploadSocialArt = useCallback(
    async (file: File, caption?: string) => {
      if (!channelId) return;
      setIsMutating(true);
      try {
        const base64 = await readFileAsBase64(file);
        const res = await api.channelAssets.uploadSocialArt(channelId, {
          image_data: base64,
          filename: file.name,
          mime_type: file.type || "image/png",
          caption,
        });
        setOverview((prev) => (prev ? { ...prev, manifest: res.manifest } : null));
        onNotice?.({ tone: "good", message: "Social artwork uploaded successfully." });
      } catch (err: unknown) {
        notifyMutationError(err, "Failed to upload artwork.", onNotice);
      } finally {
        setIsMutating(false);
      }
    },
    [channelId, onNotice],
  );

  const deleteSocialArt = useCallback(
    async (assetId: string) => {
      if (!channelId) return;
      setIsMutating(true);
      try {
        const res = await api.channelAssets.deleteSocialArt(channelId, assetId);
        setOverview((prev) => (prev ? { ...prev, manifest: res.manifest } : null));
        onNotice?.({ tone: "good", message: "Social artwork deleted successfully." });
      } catch (err: unknown) {
        notifyMutationError(err, "Failed to delete artwork.", onNotice);
      } finally {
        setIsMutating(false);
      }
    },
    [channelId, onNotice],
  );

  const exportBrandKit = useCallback(() => {
    if (!channelId) return;
    const url = api.channelAssets.getExportZipUrl(channelId);
    const slug = overview?.channel_slug || "channel";
    triggerFileDownload(url, `${slug}-brand-kit.zip`);
    onNotice?.({ tone: "good", message: "Brand kit export initiated." });
  }, [channelId, overview?.channel_slug, onNotice]);

  return {
    overview,
    isLoading,
    isMutating,
    error,
    refresh,
    uploadLogo,
    deleteLogo,
    uploadSocialAsset,
    deleteSocialAsset,
    uploadSocialArt,
    deleteSocialArt,
    exportBrandKit,
  };
}
