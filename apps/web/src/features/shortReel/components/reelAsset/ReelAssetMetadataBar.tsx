import { DownloadSimple } from "@phosphor-icons/react";
import type { ReelAssetMetadataBarProps } from "./reelAsset.types";

export function ReelAssetMetadataBar({
  meta,
  downloadUrl,
  downloadName = "asset.png",
  downloadAriaLabel,
  title,
}: ReelAssetMetadataBarProps) {
  if (!meta) return null;

  return (
    <div className="short-reel-asset-metadata">
      {meta.dimensions && <span>{meta.dimensions}</span>}
      {meta.mimeType && <span>• {meta.mimeType}</span>}
      {meta.checksum && (
        <code title={meta.checksum} className="short-reel-checksum-code">
          Hash: {meta.checksum.slice(0, 10)}...
        </code>
      )}
      {downloadUrl && (
        <a
          href={downloadUrl}
          download={downloadName}
          className="short-reel-download-link"
          aria-label={downloadAriaLabel ?? `Download ${title}`}
        >
          <DownloadSimple size={14} />
          <span>Download</span>
        </a>
      )}
    </div>
  );
}
