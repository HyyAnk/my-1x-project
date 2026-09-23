import type { IntroOutroScriptRevision } from "@studio/shared";
import { useScriptPackageDownload } from "../../hooks/useScriptPackageDownload";

type Props = {
  revision: IntroOutroScriptRevision;
  selectedForUpload: boolean;
  busy: string | null;
  hideIssueDetails?: boolean;
  onApprove: (id: string) => Promise<void>;
  nextActionLabel: string;
  onNextAction: () => void;
};

export function ScriptRevisionActions({
  revision,
  selectedForUpload,
  busy,
  hideIssueDetails = false,
  onApprove,
  nextActionLabel,
  onNextAction,
}: Props) {
  const { download, downloading, error } = useScriptPackageDownload();
  const findings = revision.quality_review?.findings ?? [];
  const findingKeys = new Set(findings.map((finding) => `${finding.code}:${finding.path}:${finding.message}`));
  const validationIssues = revision.validation_issues.filter((issue) => !findingKeys.has(`${issue.code}:${issue.path}:${issue.message}`));
  const needsReview = revision.template_version === "intro-outro-script-v3" && !revision.quality_review;
  const hasBlockingIssues = [...revision.validation_issues, ...findings].some((issue) => issue.severity === "error");
  return (
    <>
      <section className="script-approval-panel" aria-label="Revision status and actions">
        <div className="script-revision-meta">
          <strong>{selectedForUpload ? `Selected for upload · Revision ${revision.revision_number}` : "Not selected for upload"}</strong>
          <span>
            {revision.quality_review
              ? findings.length
                ? `Gemini Flash review: ${findings.length} finding${findings.length === 1 ? "" : "s"}`
                : "Gemini Flash review passed"
              : needsReview
                ? "Gemini Flash review required"
                : "Legacy revision"}
          </span>
        </div>
        <p className="script-approval-explanation">
          {selectedForUpload
            ? "This revision will be linked to the video you upload. It does not create or upload a video."
            : "Use for upload selects this revision as the script linked to your uploaded video. It does not generate or upload a video."}
        </p>
        <details className="script-review-explanation">
          <summary>What Gemini reviewed</summary>
          <p>
            Mascot identity, feasible motion, camera, timing, audio, logo placement, final hold, creative seeds, and Intro–Outro continuity.
          </p>
        </details>
        <div className="script-revision-actions">
          <button type="button" className="quiet-button" onClick={() => void download(revision)} disabled={downloading}>
            {downloading ? "Preparing..." : "Download package"}
          </button>
          {selectedForUpload ? (
            <button type="button" className="primary-button" onClick={onNextAction} disabled={busy !== null}>
              {nextActionLabel}
            </button>
          ) : (
            <button
              type="button"
              className="primary-button"
              onClick={() => void onApprove(revision.revision_id).catch(() => undefined)}
              disabled={busy !== null || needsReview || hasBlockingIssues}
            >
              {busy === "use-for-upload" ? "Selecting..." : "Use for upload"}
            </button>
          )}
        </div>
      </section>
      {downloading ? <div role="status">Preparing package...</div> : null}
      {error ? (
        <div className="script-alert error" role="alert">
          {error}
        </div>
      ) : null}
      {needsReview ? <p className="script-review-note">Save a new revision to run the Gemini Flash review before selection.</p> : null}
      {!hideIssueDetails && findings.length ? (
        <ul className="script-validation-list" aria-label="Gemini Flash review findings">
          {findings.map((finding, index) => (
            <li className={finding.severity} key={`${finding.code}-${index}`}>
              <strong>{finding.severity === "error" ? "Blocker" : "Review"}</strong> {finding.message}
            </li>
          ))}
        </ul>
      ) : null}
      {!hideIssueDetails && validationIssues.length ? (
        <ul className="script-validation-list" aria-label="Revision validation issues">
          {validationIssues.map((issue, index) => (
            <li className={issue.severity} key={`${issue.code}-${index}`}>
              {issue.message}
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
