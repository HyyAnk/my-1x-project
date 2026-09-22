import { useEffect, useState } from "react";
import { WarningCircle, X } from "@phosphor-icons/react";
import type { Notice } from "../../../../components/types";
import { useIntroOutroScriptStudio } from "../../hooks/useIntroOutroScriptStudio";
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
      />

      {activeJob ? (
        <div className="script-job-banner" aria-live="polite">
          <span>{studio.job?.step}</span>
          <button
            type="button"
            className="icon-button"
            onClick={() => void studio.cancelJob().catch(() => undefined)}
            aria-label="Cancel script job"
          >
            <X size={15} />
          </button>
        </div>
      ) : null}
      {studio.busy && !activeJob ? (
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
          onCopyPrompt={studio.copyPrompt}
          onDraftPendingChange={setDraftPending}
        />
      ) : null}

      {step === "upload" && studio.project ? <ScriptUploadStep project={studio.project} onUpload={props.onUpload} /> : null}
    </section>
  );
}
