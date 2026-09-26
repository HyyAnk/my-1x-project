import { useState } from "react";
import { CheckCircle, Circle, ArrowSquareOut, Spinner, Sparkle } from "@phosphor-icons/react";
import type { IntroOutroScriptJob, IntroOutroScriptProject } from "@studio/shared";

type Props = {
  projects: IntroOutroScriptProject[];
  activeJobs: IntroOutroScriptJob[];
  currentProjectId: string | null;
  onSelectProject: (projectId: string) => void;
  onOpenBatchModal: () => void;
  onApproveProject: (projectId: string) => Promise<void>;
  busy: string | null;
};

export function BatchReviewMatrix({
  projects,
  activeJobs,
  currentProjectId,
  onSelectProject,
  onOpenBatchModal,
  onApproveProject,
  busy,
}: Props) {
  const [approvingAll, setApprovingAll] = useState(false);

  const activeJobByProjectId = new Map(activeJobs.map((job) => [job.project_id, job]));

  const unapprovedProjects = projects.filter(
    (p) =>
      (!p.approved_revision_ids.intro && p.drafts.intro.content) ||
      (!p.approved_revision_ids.outro && p.drafts.outro.content),
  );

  const handleApproveAll = async () => {
    setApprovingAll(true);
    try {
      for (const project of unapprovedProjects) {
        await onApproveProject(project.project_id).catch(() => undefined);
      }
    } finally {
      setApprovingAll(false);
    }
  };

  return (
    <div className="batch-review-matrix" aria-label="Batch Script Overview">
      <div className="batch-matrix-toolbar">
        <div>
          <h4>Batch Script Catalog</h4>
          <p>
            {projects.length} total projects &bull; {projects.filter((p) => p.approved_revision_ids.intro && p.approved_revision_ids.outro).length} ready pairs
            {activeJobs.length > 0 ? ` \u2022 ${activeJobs.length} active jobs running` : ""}
          </p>
        </div>
        <div className="batch-matrix-actions">
          <button type="button" className="quiet-button" onClick={onOpenBatchModal} disabled={busy !== null}>
            <Sparkle size={15} weight="fill" />
            <span>Generate Batch</span>
          </button>
          {unapprovedProjects.length > 0 ? (
            <button
              type="button"
              className="primary-button"
              onClick={() => void handleApproveAll()}
              disabled={approvingAll || busy !== null}
            >
              {approvingAll ? "Approving Pairs..." : `Approve All Ready (${unapprovedProjects.length})`}
            </button>
          ) : null}
        </div>
      </div>

      <div className="batch-matrix-table-wrapper">
        <table className="batch-matrix-table">
          <thead>
            <tr>
              <th>Project Name</th>
              <th>Intro Script</th>
              <th>Outro Script</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => {
              const activeJob = activeJobByProjectId.get(project.project_id);
              const introApproved = Boolean(project.approved_revision_ids.intro);
              const outroApproved = Boolean(project.approved_revision_ids.outro);
              const introContent = project.drafts.intro.content;
              const outroContent = project.drafts.outro.content;
              const isSelected = project.project_id === currentProjectId;

              return (
                <tr key={project.project_id} className={isSelected ? "selected-row" : ""}>
                  <td className="project-name-cell">
                    <strong>{project.name}</strong>
                    {isSelected ? <span className="current-badge">Active</span> : null}
                  </td>
                  <td className="clip-snippet-cell">
                    <div className="clip-snippet-item">
                      {introApproved ? (
                        <CheckCircle size={15} weight="fill" className="approved-icon" />
                      ) : (
                        <Circle size={15} />
                      )}
                      <span>
                        {introContent
                          ? introContent.timeline[0]?.action.slice(0, 70) + "..."
                          : activeJob?.requested_clip_kinds.includes("intro")
                            ? "Generating intro..."
                            : "Empty draft"}
                      </span>
                    </div>
                  </td>
                  <td className="clip-snippet-cell">
                    <div className="clip-snippet-item">
                      {outroApproved ? (
                        <CheckCircle size={15} weight="fill" className="approved-icon" />
                      ) : (
                        <Circle size={15} />
                      )}
                      <span>
                        {outroContent
                          ? outroContent.timeline[0]?.action.slice(0, 70) + "..."
                          : activeJob?.requested_clip_kinds.includes("outro")
                            ? "Generating outro..."
                            : "Empty draft"}
                      </span>
                    </div>
                  </td>
                  <td className="status-cell">
                    {activeJob ? (
                      <span className="job-status-pill running">
                        <Spinner size={14} className="spin" />
                        <span>{activeJob.step}</span>
                      </span>
                    ) : introApproved && outroApproved ? (
                      <span className="job-status-pill approved">Ready for Video</span>
                    ) : introContent || outroContent ? (
                      <span className="job-status-pill draft">Draft Ready</span>
                    ) : (
                      <span className="job-status-pill empty">Empty</span>
                    )}
                  </td>
                  <td className="actions-cell">
                    <button
                      type="button"
                      className="quiet-button icon-text-button"
                      onClick={() => onSelectProject(project.project_id)}
                      title="Open in Prompt Editor"
                    >
                      <span>Edit</span>
                      <ArrowSquareOut size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
