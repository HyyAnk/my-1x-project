import { DownloadSimple } from "@phosphor-icons/react";
import { useVariantExport } from "../../hooks/useVariantExport";
import { VariantExportModal } from "./VariantExportModal";
import "../../../../styles/features/mascot/variantExport.css";

export function VariantExportControls({ mascotId, mascotName }: { mascotId: string; mascotName: string }) {
  const state = useVariantExport(mascotId);
  return (
    <>
      <button type="button" className="quiet-button" onClick={() => state.open("original")}>
        <DownloadSimple size={16} />
        Download Original
      </button>
      <button type="button" className="quiet-button" onClick={() => state.open("transparent")}>
        <DownloadSimple size={16} />
        Download Transparent
      </button>
      {state.job && (
        <span role="status" className="variant-export-toolbar-status">
          Export{" "}
          {state.job.status === "running"
            ? `${state.job.processed}/${state.job.total}`
            : state.job.status.replace("partial", "completed with errors")}
        </span>
      )}
      {state.isOpen && <VariantExportModal state={state} mascotName={mascotName} />}
    </>
  );
}
