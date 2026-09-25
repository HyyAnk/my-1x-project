import { FolderOpen } from "@phosphor-icons/react";
import type { useNativeExportFolder } from "../../hooks/useNativeExportFolder";

export function NativeFolderActions({
  folder,
  busy,
  destination,
  onFallback,
}: {
  folder: ReturnType<typeof useNativeExportFolder>;
  busy: boolean;
  destination: string;
  onFallback: () => void;
}) {
  return (
    <>
      <button type="button" className="quiet-button" disabled={busy} onClick={() => void folder.pick(destination)}>
        <FolderOpen size={18} />
        {folder.pending ? "Choosing Folder…" : "Choose Folder"}
      </button>
      {folder.pending && <p role="status">Select a folder in the Windows window on this computer.</p>}
      {folder.error && <p role="alert">{folder.error}</p>}
      {folder.message && <p role="status">{folder.message}</p>}
      <details className="variant-export-folder-alternative">
        <summary>Other locations</summary>
        <button type="button" className="quiet-button" disabled={busy} onClick={onFallback}>
          Use Server Path
        </button>
      </details>
    </>
  );
}
