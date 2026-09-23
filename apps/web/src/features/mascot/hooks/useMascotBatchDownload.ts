import { useCallback, useRef, useState } from "react";
import type { MascotStateVariant } from "@studio/shared";
import { downloadVariantsAsZip, type BatchZipDownloadResult, type MascotDownloadKind } from "../utils/mascotSlotDownloadHelpers";

export interface UseMascotBatchDownloadReturn {
  downloadingKind: MascotDownloadKind | null;
  isDownloading: boolean;
  error: string | null;
  downloadSelectedZip: (
    kind: MascotDownloadKind,
    variants: MascotStateVariant[],
    state: "thinking" | "celebrate",
    options?: {
      mascotName?: string;
      styleName?: string;
    },
  ) => Promise<BatchZipDownloadResult | null>;
}

export function useMascotBatchDownload(): UseMascotBatchDownloadReturn {
  const [downloadingKind, setDownloadingKind] = useState<MascotDownloadKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isBusyRef = useRef(false);

  const downloadSelectedZip = useCallback(
    async (
      kind: MascotDownloadKind,
      variants: MascotStateVariant[],
      state: "thinking" | "celebrate",
      options?: {
        mascotName?: string;
        styleName?: string;
      },
    ): Promise<BatchZipDownloadResult | null> => {
      if (isBusyRef.current || variants.length === 0) return null;

      isBusyRef.current = true;
      setDownloadingKind(kind);
      setError(null);

      try {
        const result = await downloadVariantsAsZip(variants, state, kind, options);
        if (result.total > 0 && result.downloaded === 0) {
          setError(`Failed to download images for ${state} slots.`);
        }
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to package ZIP download";
        setError(message);
        return null;
      } finally {
        isBusyRef.current = false;
        setDownloadingKind(null);
      }
    },
    [],
  );

  return {
    downloadingKind,
    isDownloading: downloadingKind !== null,
    error,
    downloadSelectedZip,
  };
}
