import type { IntroOutroClipKind } from "@studio/shared";
import { FloppyDisk, WarningCircle } from "@phosphor-icons/react";
import type { useScriptDraftEditor } from "../../hooks/useScriptDraftEditor";
import { ScriptTimelineEditor } from "./ScriptTimelineEditor";

type Props = {
  kind: IntroOutroClipKind;
  editor: ReturnType<typeof useScriptDraftEditor>;
  disabled: boolean;
  onCheckpoint: (kind: IntroOutroClipKind) => Promise<void>;
};

export function ScriptDraftDetails({ kind, editor, disabled, onCheckpoint }: Props) {
  return (
    <>
      {editor.issues.length ? (
        <div className="script-validation-list" aria-live="polite">
          {editor.issues.map((issue, index) => (
            <div className={issue.severity} key={`${issue.code}-${index}`}>
              <WarningCircle size={16} />
              <span>{issue.message}</span>
            </div>
          ))}
        </div>
      ) : null}
      {editor.validationError ? (
        <div className="script-alert error" role="alert">
          {editor.validationError}
        </div>
      ) : null}
      {editor.saveStatus === "failed" ? (
        <div className="script-alert error" role="alert">
          <span>Draft could not be saved.</span>
          <button type="button" className="quiet-button" onClick={() => void editor.retrySave()}>
            Retry save
          </button>
        </div>
      ) : null}

      {editor.content ? (
        <details className="script-review-details">
          <summary>Edit script details</summary>
          <div className="script-review-details-content">
            <span className={`script-save-status ${editor.saveStatus}`} role="status">
              {editor.pending && editor.saveStatus !== "failed"
                ? "Saving draft..."
                : editor.saveStatus === "failed"
                  ? "Save failed"
                  : "Draft saved"}
            </span>
            <ScriptTimelineEditor content={editor.content} disabled={disabled} onChange={editor.updateContent} />
            {editor.validationRan && !editor.issues.length ? (
              <div className="script-validation-success" role="status">
                Structure checked. Save a revision to run the Gemini Flash review.
              </div>
            ) : null}
            <div className="script-inline-actions">
              <button
                type="button"
                className="quiet-button"
                onClick={() => void editor.validate()}
                disabled={editor.validating || editor.pending || disabled}
              >
                {editor.validating ? "Validating..." : "Validate"}
              </button>
              <button
                type="button"
                className="quiet-button"
                onClick={() => void onCheckpoint(kind).catch(() => undefined)}
                disabled={editor.validating || editor.pending || disabled}
              >
                <FloppyDisk size={15} /> Save and review
              </button>
            </div>
          </div>
        </details>
      ) : null}
    </>
  );
}
