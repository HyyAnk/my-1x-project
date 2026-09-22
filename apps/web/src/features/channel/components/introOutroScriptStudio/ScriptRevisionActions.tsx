import { useRef } from "react";
import type { IntroOutroScriptRevision } from "@studio/shared";
import { useScriptPackageDownload } from "../../hooks/useScriptPackageDownload";

type Props = {
  revision: IntroOutroScriptRevision;
  approved: boolean;
  busy: boolean;
  hideIssueDetails?: boolean;
  onCopyPrompt: (id: string) => Promise<void>;
  onApprove: (id: string) => Promise<void>;
};

export function ScriptRevisionActions({ revision, approved, busy, hideIssueDetails = false, onCopyPrompt, onApprove }: Props) {
  const { download, downloading, error } = useScriptPackageDownload();
  const exportMenu = useRef<HTMLDetailsElement>(null);
  const findings = revision.quality_review?.findings ?? [];
  const findingKeys = new Set(findings.map((finding) => `${finding.code}:${finding.path}:${finding.message}`));
  const validationIssues = revision.validation_issues.filter((issue) => !findingKeys.has(`${issue.code}:${issue.path}:${issue.message}`));
  const needsReview = revision.template_version === "intro-outro-script-v3" && !revision.quality_review;
  const hasBlockingIssues = [...revision.validation_issues, ...findings].some((issue) => issue.severity === "error");
  return (
    <>
      <div className="script-revision-actions">
        <div className="script-revision-meta">
          <span>{approved ? "Approved" : "Not approved"}</span>
          <span>
            {revision.quality_review
              ? findings.length
                ? `AI review: ${findings.length} finding${findings.length === 1 ? "" : "s"}`
                : "AI review passed"
              : needsReview
                ? "AI review required"
                : "Legacy revision"}
          </span>
        </div>
        <details className="script-project-menu" ref={exportMenu}>
          <summary>Export</summary>
          <div>
            <button
              type="button"
              onClick={() => {
                exportMenu.current?.removeAttribute("open");
                void onCopyPrompt(revision.revision_id).catch(() => undefined);
              }}
              disabled={busy}
            >
              Copy prompt
            </button>
            <button
              type="button"
              onClick={() => {
                exportMenu.current?.removeAttribute("open");
                void download(revision);
              }}
              disabled={busy || downloading}
            >
              {downloading ? "Preparing..." : "Download package"}
            </button>
          </div>
        </details>
        <button
          type="button"
          className="primary-button"
          onClick={() => void onApprove(revision.revision_id).catch(() => undefined)}
          disabled={busy || approved || needsReview || hasBlockingIssues}
        >
          Approve
        </button>
      </div>
      {downloading ? <div role="status">Preparing package...</div> : null}
      {error ? (
        <div className="script-alert error" role="alert">
          {error}
        </div>
      ) : null}
      {needsReview ? <p className="script-review-note">Save a new revision to run the AI review before approval.</p> : null}
      {!hideIssueDetails && findings.length ? (
        <ul className="script-validation-list" aria-label="AI review findings">
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
