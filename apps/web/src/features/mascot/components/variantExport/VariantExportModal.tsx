import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "@phosphor-icons/react";
import type { useVariantExport } from "../../hooks/useVariantExport";
import { ExportFolderPicker } from "./ExportFolderPicker";
import { VariantExportProgress } from "./VariantExportProgress";
import { VariantExportSummary } from "./VariantExportSummary";
import { useExportDialog } from "../../hooks/useExportDialog";
import { useNativeExportFolder } from "../../hooks/useNativeExportFolder";
import { NativeFolderActions } from "./NativeFolderActions";

export function VariantExportModal({ state, mascotName }: { state: ReturnType<typeof useVariantExport>; mascotName: string }) {
  const dialog = useExportDialog();
  const [choosing, setChoosing] = useState(false);
  const folder = useNativeExportFolder(state.setDestination);
  const busy = state.active || state.pending || folder.pending;
  const { thinking = 0, celebrate = 0 } = state.summary ?? {};
  const total = thinking + celebrate;
  const canRetry =
    state.job && state.job.failed > 0 && !busy && state.job.mode === state.mode && state.job.destination === state.destination;
  const visibleJob = state.job?.mode === state.mode && state.job.destination === state.destination ? state.job : null;
  return createPortal(
    <dialog
      ref={dialog}
      className="variant-export-modal"
      aria-labelledby="variant-export-title"
      onCancel={(event) => {
        event.preventDefault();
        state.close();
      }}
    >
      <div className="variant-export-heading">
        <h2 id="variant-export-title">Download {state.mode === "original" ? "Original" : "Transparent"}</h2>
        <button type="button" className="quiet-button" aria-label="Close export" onClick={state.close}>
          <X size={20} />
        </button>
      </div>
      <p className="variant-export-path">{mascotName}</p>
      <p>Files are saved on the server computer, not the browser device.</p>
      {choosing ? (
        <ExportFolderPicker
          initialPath={state.destination}
          onCancel={() => setChoosing(false)}
          onSelect={(path) => {
            state.setDestination(path);
            setChoosing(false);
          }}
        />
      ) : (
        <>
          <NativeFolderActions folder={folder} busy={busy} destination={state.destination} onFallback={() => setChoosing(true)} />
          {state.destination && (
            <p className="variant-export-path" aria-label="Selected folder">
              {state.destination}
            </p>
          )}
          <VariantExportSummary summary={state.summary} loading={state.loading} />
          {state.mode === "transparent" && <p>Missing transparent images are processed automatically.</p>}
          {visibleJob && <VariantExportProgress job={visibleJob} />}
          <div className="variant-export-actions">
            {state.active ? (
              <button
                type="button"
                className="quiet-button"
                disabled={state.pending || state.job?.status === "cancelling"}
                onClick={() => void state.cancel()}
              >
                {state.pending ? "Cancelling…" : "Cancel Export"}
              </button>
            ) : (
              <>
                {canRetry && (
                  <button type="button" className="quiet-button" onClick={() => void state.start(true)}>
                    Retry Failed
                  </button>
                )}
                <button
                  type="button"
                  className="primary-button"
                  disabled={!state.destination || !total || state.loading || busy}
                  onClick={() => void state.start()}
                >
                  {state.pending ? "Starting…" : "Download Variants"}
                </button>
              </>
            )}
          </div>
        </>
      )}
      {state.error && (
        <div role="alert">
          <p>{state.error}</p>
          {!busy && (
            <button type="button" className="quiet-button" onClick={() => void state.refresh()}>
              Refresh Status
            </button>
          )}
        </div>
      )}
      {state.connectionError && <p role="status">{state.connectionError}</p>}
    </dialog>,
    document.body,
  );
}
