import { useState } from "react";
import {
  MascotCapabilityIdSchema,
  type IntroOutroScriptJob,
  type IntroOutroScriptProject,
  type MascotStyleIdentityProfile,
} from "@studio/shared";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
import type { GenerateScriptClipInput } from "../../../../api/introOutroScriptApi";
import type { ScriptContextBundle } from "../../hooks/introOutroScriptStudio.types";
import { CustomSeedPanel } from "./CustomSeedPanel";
import { MascotIdentityReview } from "./MascotIdentityReview";
import { ScriptSeedControls } from "./ScriptSeedControls";

type Props = {
  channelId: string;
  stylePresetId: string;
  contextBundle: ScriptContextBundle;
  project: IntroOutroScriptProject | null;
  job: IntroOutroScriptJob | null;
  busy: string | null;
  onCreateProject: () => Promise<void>;
  onAnalyzeIdentity: () => Promise<void>;
  onReviewIdentity: (profile: MascotStyleIdentityProfile) => Promise<void>;
  onGenerate: (clips: GenerateScriptClipInput[]) => Promise<void>;
  onRefresh: () => Promise<void>;
};

function manualProfile(bundle: ScriptContextBundle, stylePresetId: string): MascotStyleIdentityProfile {
  const now = new Date().toISOString();
  return {
    schema_version: 1,
    profile_id: `manual-${Date.now()}`,
    mascot_id: bundle.context.mascot_id ?? "unresolved",
    mascot_style_id: bundle.context.mascot_style_id ?? "unresolved",
    style_preset_id: stylePresetId,
    style_revision: bundle.context.mascot_style_revision ?? 1,
    reference_asset_url: bundle.context.mascot_reference_url ?? "manual-reference",
    reference_sha256: "0".repeat(64),
    reference_mime_type: "image/png",
    summary: "Describe the mascot exactly as shown in the selected style reference.",
    morphology: [],
    features: [],
    capabilities: Object.fromEntries(MascotCapabilityIdSchema.options.map((id) => [id, "unknown"])),
    motion_constraints: [],
    palette: [],
    style_description: "",
    allowed_accessories: [],
    status: "needs_review",
    source: "manual",
    analysis_model: null,
    analysis_version: "manual-v1",
    created_at: now,
    updated_at: now,
    reviewed_at: null,
  };
}

export function ScriptConfigureStep(props: Props) {
  const [reviewing, setReviewing] = useState(false);
  const { context, identity, seeds } = props.contextBundle;
  const activeJob = props.job && (props.job.status === "queued" || props.job.status === "running") ? props.job : null;
  const blocking = context.issues.some((issue) => issue.blocking);
  const reviewed = context.identity_status === "reviewed";
  const reviewProfile = identity ?? manualProfile(props.contextBundle, props.stylePresetId);

  return (
    <div className="script-configure-layout">
      <aside className="script-reference-card">
        <div className="script-reference-frame">
          {context.mascot_reference_url ? (
            <img src={context.mascot_reference_url} alt={context.mascot_style_name ?? "Selected mascot style"} />
          ) : (
            <div className="script-reference-missing">Reference unavailable</div>
          )}
        </div>
        <div>
          <strong>{context.mascot_name ?? "No mascot assigned"}</strong>
          <span>{context.mascot_style_name ?? "Style not mapped"}</span>
        </div>
        <div className={reviewed ? "script-status good" : "script-status warning"}>
          {reviewed ? <CheckCircle size={16} /> : <WarningCircle size={16} />}
          {reviewed ? "Identity reviewed" : "Identity review required"}
        </div>
      </aside>

      <div className="script-configure-main">
        {context.issues.map((issue) => (
          <div className={issue.blocking ? "script-alert error" : "script-alert"} key={issue.code}>
            <WarningCircle size={17} />
            <span>{issue.message}</span>
          </div>
        ))}

        {!reviewed && context.mascot_reference_url ? (
          <div className="script-identity-actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => void props.onAnalyzeIdentity().catch(() => undefined)}
              disabled={Boolean(activeJob) || props.busy !== null}
            >
              {activeJob?.type === "identity_analysis" ? activeJob.step : "Analyze identity"}
            </button>
            <button type="button" className="quiet-button" onClick={() => setReviewing(true)} disabled={props.busy !== null}>
              {identity ? "Review analysis" : "Enter manually"}
            </button>
          </div>
        ) : null}

        {reviewing ? (
          <MascotIdentityReview
            profile={reviewProfile}
            saving={props.busy === "review-identity"}
            onSave={async (profile) => {
              await props.onReviewIdentity(profile);
              setReviewing(false);
            }}
            onCancel={() => setReviewing(false)}
          />
        ) : null}

        {!props.project ? (
          <div className="script-empty-project">
            <h4>Create a script project</h4>
            <button
              type="button"
              className="primary-button"
              onClick={() => void props.onCreateProject().catch(() => undefined)}
              disabled={props.busy !== null}
            >
              Create project
            </button>
          </div>
        ) : (
          <ScriptSeedControls
            seeds={seeds}
            project={props.project}
            disabled={blocking || !reviewed || props.busy !== null || Boolean(activeJob)}
            onGenerate={props.onGenerate}
          />
        )}

        <CustomSeedPanel channelId={props.channelId} onChanged={props.onRefresh} />
      </div>
    </div>
  );
}
