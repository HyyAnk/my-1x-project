import { useCallback } from "react";
import type { ShortReelRecord } from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";

export interface UseShortReelExportOptions {
  channelId: string;
  reelId: string;
  reel: ShortReelRecord | null;
  onNotice?: (notice: NonNullable<Notice>) => void;
}

export interface UseShortReelExportResult {
  exportPackage: () => Promise<void>;
}

function buildDownloadFileName(reel: ShortReelRecord): string {
  return `short-reel-${reel.reel_id}-rev${reel.revision}.zip`;
}

/** Triggers a browser download of a generated PKZIP package through a temporary anchor element. */
function downloadBlob(blob: Blob, fileName: string): void {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(anchor);
}

/** Downloads the PKZIP export package for the current reel and reports the outcome via notices. */
export function useShortReelExport({ channelId, reelId, reel, onNotice }: UseShortReelExportOptions): UseShortReelExportResult {
  const exportPackage = useCallback(async () => {
    if (!reel) return;
    try {
      const blob = await api.exportPackage(channelId, reelId, reel.revision);
      downloadBlob(blob, buildDownloadFileName(reel));
      onNotice?.({ tone: "good", message: "Package exported successfully." });
    } catch (err) {
      onNotice?.({
        tone: "bad",
        message: err instanceof Error ? err.message : "Failed to export package.",
      });
    }
  }, [channelId, reelId, reel, onNotice]);

  return { exportPackage };
}
