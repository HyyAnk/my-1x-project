import type { MascotStateVariant } from "@studio/shared";
import { createZipBlob, triggerZipBlobDownload, type ZipArchiveEntry } from "../../../utils/zipArchive";

export type MascotDownloadKind = "original" | "transparent";

export interface ResolvedVariantDownloadTarget {
  slotIndex: number;
  url: string;
  filename: string;
}

/**
 * Resolves appropriate download URL and filename for a specific mascot pose variant.
 */
export function resolveVariantDownloadTarget(
  variant: MascotStateVariant,
  state: "thinking" | "celebrate",
  kind: MascotDownloadKind,
): ResolvedVariantDownloadTarget | null {
  const imageUrl = variant.image_url?.trim() || "";
  if (!imageUrl) return null;

  const url =
    kind === "original"
      ? variant.raw_image_url || imageUrl
      : variant.transparent_image_url ||
        (imageUrl.includes("/assets/transparent/") ? imageUrl : imageUrl.replace("/assets/", "/assets/transparent/"));

  return {
    slotIndex: variant.slot_index,
    url,
    filename: `${state}_slot_${variant.slot_index}_${kind}.png`,
  };
}

/**
 * Fetches binary buffer for a remote or local image asset.
 */
export async function fetchAssetBuffer(url: string): Promise<Uint8Array | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch {
    return null;
  }
}

export interface BatchZipDownloadResult {
  total: number;
  downloaded: number;
  failed: number;
}

/**
 * Downloads multiple selected mascot pose variants packaged in a single ZIP file.
 */
export async function downloadVariantsAsZip(
  variants: MascotStateVariant[],
  state: "thinking" | "celebrate",
  kind: MascotDownloadKind,
  options?: {
    mascotName?: string;
    styleName?: string;
  },
): Promise<BatchZipDownloadResult> {
  const targets = variants
    .map((variant) => resolveVariantDownloadTarget(variant, state, kind))
    .filter((target): target is ResolvedVariantDownloadTarget => target !== null);

  if (targets.length === 0) {
    return { total: 0, downloaded: 0, failed: 0 };
  }

  const entries: ZipArchiveEntry[] = [];
  let failed = 0;

  await Promise.all(
    targets.map(async (target) => {
      const data = await fetchAssetBuffer(target.url);
      if (data && data.byteLength > 0) {
        entries.push({ filename: target.filename, data });
      } else {
        failed += 1;
      }
    }),
  );

  // Sort entries by filename for consistent ordering in archive
  entries.sort((a, b) => a.filename.localeCompare(b.filename));

  if (entries.length > 0) {
    const blob = createZipBlob(entries);
    const prefixParts = [options?.mascotName, options?.styleName, state, kind].filter(Boolean);
    const sanitizedPrefix = prefixParts
      .join("_")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "_");
    const zipFilename = `${sanitizedPrefix}_slots.zip`;

    triggerZipBlobDownload(blob, zipFilename);
  }

  return {
    total: targets.length,
    downloaded: entries.length,
    failed,
  };
}
