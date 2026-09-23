import { useEffect, useMemo, useState } from "react";
import type {
  IntroOutroClipKind,
  IntroOutroScriptContent,
  IntroOutroScriptJob,
  IntroOutroScriptProject,
  IntroOutroScriptRevision,
  IntroOutroValidationIssue,
} from "@studio/shared";
import { CheckCircle } from "@phosphor-icons/react";
import { useScriptDraftEditor } from "../../hooks/useScriptDraftEditor";
import { ScriptDraftDetails } from "./ScriptDraftDetails";
import { ScriptPromptPanel } from "./ScriptPromptPanel";
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
  onLoadPrompt: (revisionId: string) => Promise<string>;
  onContinueToUpload: () => void;
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
  const otherKind: IntroOutroClipKind = kind === "intro" ? "outro" : "intro";
  const hasOtherRevision = props.revisions.some((revision) => revision.clip_kind === otherKind);
  const otherSelectedForUpload = Boolean(props.project.approved_revision_ids[otherKind]);
  const nextActionLabel =
    hasOtherRevision && !otherSelectedForUpload ? `Review ${otherKind === "intro" ? "Intro" : "Outro"}` : "Continue to upload";
  const activeJob =
    props.job && (props.job.status === "queued" || props.job.status === "running") && props.job.requested_clip_kinds.includes(kind);
  const draftDiffersFromRevision = Boolean(
    selectedRevision && editor.content && JSON.stringify(editor.content) !== JSON.stringify(selectedRevision.content),
  );

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
        {clipRevisions.length ? (
          <label className="script-revision-selection">
            <span>Version</span>
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
          </label>
        ) : null}
      </div>

      {activeJob ? <div className="script-job-banner">{props.job?.step}</div> : null}

      {selectedRevision ? (
        <>
          <ScriptPromptPanel revision={selectedRevision} onLoadPrompt={props.onLoadPrompt} />
          {draftDiffersFromRevision ? (
            <div className="script-alert warning" role="status">
              Draft changes are not in this prompt. Save a new revision to update it.
            </div>
          ) : null}
          <ScriptRevisionActions
            key={selectedRevision.revision_id}
            revision={selectedRevision}
            selectedForUpload={props.project.approved_revision_ids[kind] === selectedRevision.revision_id}
            busy={props.busy}
            hideIssueDetails={editor.issues.length > 0 && props.project.drafts[kind].source_revision_id === selectedRevision.revision_id}
            onApprove={props.onApprove}
            nextActionLabel={nextActionLabel}
            onNextAction={hasOtherRevision && !otherSelectedForUpload ? () => setKind(otherKind) : props.onContinueToUpload}
          />
        </>
      ) : (
        <div className="script-empty-project">
          <h4>No {kind} script yet</h4>
        </div>
      )}

      <ScriptDraftDetails
        kind={kind}
        editor={editor}
        disabled={Boolean(activeJob) || props.busy !== null}
        onCheckpoint={props.onCheckpoint}
      />
    </div>
  );
}
