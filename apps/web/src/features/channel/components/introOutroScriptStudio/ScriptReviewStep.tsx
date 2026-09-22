import { useEffect, useMemo, useState } from "react";
import type {
  IntroOutroClipKind,
  IntroOutroScriptContent,
  IntroOutroScriptJob,
  IntroOutroScriptProject,
  IntroOutroScriptRevision,
  IntroOutroValidationIssue,
} from "@studio/shared";
import { CheckCircle, FloppyDisk, WarningCircle } from "@phosphor-icons/react";
import { useScriptDraftEditor } from "../../hooks/useScriptDraftEditor";
import { ScriptTimelineEditor } from "./ScriptTimelineEditor";
import { ScriptRevisionActions } from "./ScriptRevisionActions";

export type UploadScriptLinks = {
  projectId: string;
  introRevisionId?: string;
  outroRevisionId?: string;
};

type Props = {
  project: IntroOutroScriptProject;
  revisions: IntroOutroScriptRevision[];
  job: IntroOutroScriptJob | null;
  busy: string | null;
  onSave: (kind: IntroOutroClipKind, content: IntroOutroScriptContent) => Promise<void>;
  onCheckpoint: (kind: IntroOutroClipKind) => Promise<void>;
  onValidate: (kind: IntroOutroClipKind) => Promise<IntroOutroValidationIssue[]>;
  onApprove: (revisionId: string) => Promise<void>;
  onCopyPrompt: (revisionId: string) => Promise<void>;
  onDraftPendingChange?: (pending: boolean) => void;
};

export function ScriptReviewStep(props: Props) {
  const [kind, setKind] = useState<IntroOutroClipKind>("intro");
  const editor = useScriptDraftEditor({
    project: props.project,
    kind,
    onSave: props.onSave,
    onValidate: props.onValidate,
    onPendingChange: props.onDraftPendingChange,
  });
  const clipRevisions = useMemo(
    () => props.revisions.filter((revision) => revision.clip_kind === kind).sort((a, b) => b.revision_number - a.revision_number),
    [kind, props.revisions],
  );
  const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null);
  const selectedRevision = clipRevisions.find((revision) => revision.revision_id === selectedRevisionId) ?? clipRevisions[0] ?? null;
  const activeJob =
    props.job && (props.job.status === "queued" || props.job.status === "running") && props.job.requested_clip_kinds.includes(kind);

  useEffect(() => {
    setSelectedRevisionId(clipRevisions[0]?.revision_id ?? null);
  }, [kind, clipRevisions[0]?.revision_id]);

  return (
    <div className="script-review">
      <div className="script-review-toolbar">
        <div className="script-kind-tabs" role="tablist" aria-label="Script clip">
          {(["intro", "outro"] as const).map((clipKind) => (
            <button
              type="button"
              role="tab"
              aria-selected={kind === clipKind}
              className={kind === clipKind ? "active" : ""}
              onClick={() => setKind(clipKind)}
              disabled={editor.pending || editor.validating}
              key={clipKind}
            >
              {clipKind === "intro" ? "Intro" : "Outro"}
              {props.project.approved_revision_ids[clipKind] ? <CheckCircle size={14} weight="fill" /> : null}
            </button>
          ))}
        </div>
        <span className={`script-save-status ${editor.saveStatus}`} role="status">
          {editor.pending && editor.saveStatus !== "failed" ? "Saving..." : editor.saveStatus === "failed" ? "Save failed" : "Saved"}
          {editor.saveStatus === "failed" ? (
            <button type="button" className="quiet-button" onClick={() => void editor.retrySave()}>
              Retry save
            </button>
          ) : null}
        </span>
      </div>

      {activeJob ? <div className="script-job-banner">{props.job?.step}</div> : null}

      {editor.content ? (
        <>
          <ScriptTimelineEditor
            content={editor.content}
            disabled={Boolean(activeJob) || props.busy !== null}
            onChange={editor.updateContent}
          />
          {editor.issues.length ? (
            <div className="script-validation-list" aria-live="polite">
              {editor.issues.map((issue, index) => (
                <div className={issue.severity} key={`${issue.code}-${index}`}>
                  <WarningCircle size={16} />
                  <span>{issue.message}</span>
                </div>
              ))}
            </div>
          ) : editor.validationRan ? (
            <div className="script-validation-success" role="status">
              Structure checked. Save a revision for AI review.
            </div>
          ) : null}
          {editor.validationError ? (
            <div className="script-alert error" role="alert">
              {editor.validationError}
            </div>
          ) : null}
          <div className="script-inline-actions">
            <button
              type="button"
              className="quiet-button"
              onClick={() => void editor.validate()}
              disabled={editor.validating || editor.pending || props.busy !== null || Boolean(activeJob)}
            >
              {editor.validating ? "Validating..." : "Validate"}
            </button>
            <button
              type="button"
              className="quiet-button"
              onClick={() => void props.onCheckpoint(kind).catch(() => undefined)}
              disabled={editor.validating || editor.pending || props.busy !== null || Boolean(activeJob)}
            >
              <FloppyDisk size={15} /> Save revision
            </button>
          </div>
        </>
      ) : (
        <div className="script-empty-project">
          <h4>No {kind} script yet</h4>
        </div>
      )}

      <section className="script-history">
        <div className="script-section-heading">
          <h4>Revision history</h4>
          {clipRevisions.length ? (
            <select
              aria-label="Script revision"
              value={selectedRevision?.revision_id ?? ""}
              onChange={(event) => setSelectedRevisionId(event.target.value)}
            >
              {clipRevisions.map((revision) => (
                <option value={revision.revision_id} key={revision.revision_id}>
                  Revision {revision.revision_number} · {revision.origin}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        {selectedRevision ? (
          <ScriptRevisionActions
            key={selectedRevision.revision_id}
            revision={selectedRevision}
            approved={props.project.approved_revision_ids[kind] === selectedRevision.revision_id}
            busy={props.busy !== null}
            hideIssueDetails={
              editor.issues.length > 0 && props.project.drafts[kind].source_revision_id === selectedRevision.revision_id
            }
            onCopyPrompt={props.onCopyPrompt}
            onApprove={props.onApprove}
          />
        ) : null}
      </section>
    </div>
  );
}
