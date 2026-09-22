import type { IntroOutroScriptProject } from "@studio/shared";
import { CheckCircle, Circle } from "@phosphor-icons/react";
import type { UploadScriptLinks } from "./ScriptReviewStep";

type Props = {
  project: IntroOutroScriptProject;
  onUpload: (links: UploadScriptLinks) => void;
};

export function ScriptUploadStep({ project, onUpload }: Props) {
  const introRevisionId = project.approved_revision_ids.intro ?? undefined;
  const outroRevisionId = project.approved_revision_ids.outro ?? undefined;
  return (
    <div className="script-upload-step">
      <h3>Upload video pair</h3>
      <div className="script-upload-links">
        <div>
          {introRevisionId ? <CheckCircle size={18} weight="fill" /> : <Circle size={18} />}
          <span>Intro {introRevisionId ? "approved and ready to link" : "will be uploaded without a script link"}</span>
        </div>
        <div>
          {outroRevisionId ? <CheckCircle size={18} weight="fill" /> : <Circle size={18} />}
          <span>Outro {outroRevisionId ? "approved and ready to link" : "will be uploaded without a script link"}</span>
        </div>
      </div>
      <button
        type="button"
        className="primary-button"
        onClick={() =>
          onUpload({
            projectId: project.project_id,
            ...(introRevisionId ? { introRevisionId } : {}),
            ...(outroRevisionId ? { outroRevisionId } : {}),
          })
        }
      >
        Select videos
      </button>
    </div>
  );
}
