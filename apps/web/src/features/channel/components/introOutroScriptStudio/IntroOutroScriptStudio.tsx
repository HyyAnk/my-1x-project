import { useEffect, useState } from "react";
import { WarningCircle } from "@phosphor-icons/react";
import type { Notice } from "../../../../components/types";
import { useIntroOutroScriptStudio } from "../../hooks/useIntroOutroScriptStudio";
import { ActiveJobsBanner } from "./ActiveJobsBanner";
import { BatchGenerateModal } from "./BatchGenerateModal";
import { BatchReviewMatrix } from "./BatchReviewMatrix";
import { ScriptConfigureStep } from "./ScriptConfigureStep";
import { ScriptReviewStep, type UploadScriptLinks } from "./ScriptReviewStep";
import { ScriptStudioHeader, type ScriptStudioStep } from "./ScriptStudioHeader";
import { ScriptUploadStep } from "./ScriptUploadStep";

type Props = {
  channelId: string;
  stylePresetId: string;
  categoryName: string;
  onNotice: (notice: NonNullable<Notice>) => void;
  onUpload: (links: UploadScriptLinks) => void;
};

export function IntroOutroScriptStudio(props: Props) {
  const studio = useIntroOutroScriptStudio(props);
  const [step, setStep] = useState<ScriptStudioStep>("configure");
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [draftPending, setDraftPending] = useState(false);
  const hasContent = Boolean(studio.project?.drafts.intro.content || studio.project?.drafts.outro.content);
  const activeJob = studio.job && (studio.job.status === "queued" || studio.job.status === "running");

  useEffect(() => {
    if (studio.job?.type === "script_generation" && (studio.job.status === "succeeded" || studio.job.status === "partial") && hasContent) {
      setStep("review");
    }
  }, [hasContent, studio.job?.status, studio.job?.type]);

  if (studio.loading && !studio.contextBundle) {
    return <div className="intro-outro-loading">Loading Script Studio...</div>;
  }

  if (!studio.contextBundle) {
    return (
      <div className="script-alert error">
        <WarningCircle size={17} />
        <span>{studio.error ?? "Script Studio is unavailable"}</span>
        <button type="button" className="quiet-button" onClick={() => void studio.refresh()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <section className="intro-outro-script-studio" aria-label="Intro and Outro Script Studio">
      <ScriptStudioHeader
        studio={studio}
        step={step}
        onStepChange={setStep}
        hasContent={hasContent}
        activeJob={Boolean(activeJob)}
        draftPending={draftPending}
        onOpenBatchModal={() => setBatchModalOpen(true)}
      />

      <ActiveJobsBanner
        currentJob={studio.job}
        activeJobs={studio.activeJobs}
        onCancelJob={() => void studio.cancelJob().catch(() => undefined)}
        onCancelSpecificJob={(id) => void studio.cancelSpecificJob(id).catch(() => undefined)}
      />

      {studio.busy && !activeJob && studio.activeJobs.length === 0 ? (
        <div className="script-operation-status" aria-live="polite">
          {studio.busy.replaceAll("-", " ")}...
        </div>
      ) : null}
      {studio.error ? (
        <div className="script-alert error">
          <WarningCircle size={17} />
          <span>{studio.error}</span>
        </div>
      ) : null}

      {step === "configure" ? (
        <ScriptConfigureStep
          channelId={props.channelId}
          stylePresetId={props.stylePresetId}
          contextBundle={studio.contextBundle}
          project={studio.project}
          job={studio.job}
          busy={studio.busy}
          onCreateProject={studio.createProject}
          onAnalyzeIdentity={studio.analyzeIdentity}
          onReviewIdentity={studio.reviewIdentity}
          onGenerate={studio.generate}
          onRefresh={studio.refresh}
          onOpenBatchModal={() => setBatchModalOpen(true)}
        />
      ) : null}

      {step === "matrix" ? (
        <BatchReviewMatrix
          projects={studio.projects}
          activeJobs={studio.activeJobs}
          currentProjectId={studio.project?.project_id ?? null}
          onSelectProject={(projectId) => {
            studio.selectProject(projectId);
            setStep("review");
          }}
          onOpenBatchModal={() => setBatchModalOpen(true)}
          onApproveProject={async (projectId) => {
            const p = studio.projects.find((item) => item.project_id === projectId);
            if (!p) return;
            if (p.drafts.intro.source_revision_id && !p.approved_revision_ids.intro) {
              await studio.approve(p.drafts.intro.source_revision_id);
            }
            if (p.drafts.outro.source_revision_id && !p.approved_revision_ids.outro) {
              await studio.approve(p.drafts.outro.source_revision_id);
            }
          }}
          busy={studio.busy}
        />
      ) : null}

      {step === "review" && studio.project ? (
        <ScriptReviewStep
          project={studio.project}
          revisions={studio.revisions}
          job={studio.job}
          busy={studio.busy}
          onSave={studio.saveContent}
          onCheckpoint={studio.checkpoint}
          onValidate={studio.validate}
          onApprove={studio.approve}
          onLoadPrompt={studio.loadPrompt}
          onContinueToUpload={() => setStep("upload")}
          onDraftPendingChange={setDraftPending}
        />
      ) : null}

      {step === "upload" && studio.project ? <ScriptUploadStep project={studio.project} onUpload={props.onUpload} /> : null}

      <BatchGenerateModal
        isOpen={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        onSubmit={studio.batchGenerate}
        busy={studio.busy !== null}
      />
    </section>
  );
}
