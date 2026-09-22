import type {
  CreativeSeed,
  IntroOutroClipKind,
  IntroOutroScriptContent,
  IntroOutroScriptContext,
  IntroOutroScriptJob,
  IntroOutroScriptProject,
  IntroOutroScriptRevision,
  IntroOutroValidationIssue,
  MascotStyleIdentityProfile,
} from "@studio/shared";
import { request } from "./client";

const channelBase = (channelId: string) => `/api/channels/${encodeURIComponent(channelId)}`;
const scriptBase = (channelId: string) => `${channelBase(channelId)}/intro-outro-scripts`;
const projectBase = (channelId: string, projectId: string) => `${scriptBase(channelId)}/${encodeURIComponent(projectId)}`;

export type GenerateScriptClipInput = {
  clip_kind: IntroOutroClipKind;
  duration_seconds: number;
  randomization_seed: string;
  selected_seed_ids?: string[];
  locked_dimensions?: CreativeSeed["dimension"][];
};

export const introOutroScriptApi = {
  getIntroOutroScriptContext: (
    channelId: string,
    stylePresetId: string,
    mascotStyleId?: string,
  ): Promise<{ context: IntroOutroScriptContext; identity: MascotStyleIdentityProfile | null; seeds: CreativeSeed[] }> => {
    const query = new URLSearchParams({ style_preset_id: stylePresetId });
    if (mascotStyleId) query.set("mascot_style_id", mascotStyleId);
    return request(`${channelBase(channelId)}/intro-outro-context?${query}`);
  },

  analyzeIntroOutroIdentity: (
    channelId: string,
    payload: { style_preset_id: string; mascot_style_id?: string; idempotency_key: string },
  ): Promise<{ job: IntroOutroScriptJob }> =>
    request(`${channelBase(channelId)}/intro-outro-context/analyze`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  reviewIntroOutroIdentity: (
    channelId: string,
    payload: {
      style_preset_id: string;
      mascot_style_id?: string;
      expected_updated_at?: string | null;
      profile: MascotStyleIdentityProfile;
    },
  ): Promise<{ identity: MascotStyleIdentityProfile }> =>
    request(`${channelBase(channelId)}/intro-outro-context/review`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  listIntroOutroScriptProjects: (channelId: string, stylePresetId: string): Promise<{ projects: IntroOutroScriptProject[] }> => {
    const query = new URLSearchParams({ style_preset_id: stylePresetId });
    return request(`${scriptBase(channelId)}?${query}`);
  },

  listIntroOutroSeeds: (channelId: string): Promise<{ seeds: CreativeSeed[] }> => request(`${channelBase(channelId)}/intro-outro-seeds`),

  createIntroOutroSeed: (
    channelId: string,
    payload: Omit<CreativeSeed, "id" | "revision" | "origin" | "status"> & { id?: string },
  ): Promise<{ seed: CreativeSeed }> =>
    request(`${channelBase(channelId)}/intro-outro-seeds`, { method: "POST", body: JSON.stringify(payload) }),

  updateIntroOutroSeed: (
    channelId: string,
    seedId: string,
    payload: Partial<Omit<CreativeSeed, "id" | "revision" | "origin">> & { expected_revision: number },
  ): Promise<{ seed: CreativeSeed }> =>
    request(`${channelBase(channelId)}/intro-outro-seeds/${encodeURIComponent(seedId)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  createIntroOutroScriptProject: (
    channelId: string,
    payload: { style_preset_id: string; name: string },
  ): Promise<{ project: IntroOutroScriptProject }> => request(scriptBase(channelId), { method: "POST", body: JSON.stringify(payload) }),

  duplicateIntroOutroScriptProject: (
    channelId: string,
    projectId: string,
    payload: { name?: string } = {},
  ): Promise<{ project: IntroOutroScriptProject }> =>
    request(`${projectBase(channelId, projectId)}/duplicate`, { method: "POST", body: JSON.stringify(payload) }),

  getIntroOutroScriptProject: (channelId: string, projectId: string): Promise<{ project: IntroOutroScriptProject }> =>
    request(projectBase(channelId, projectId)),

  updateIntroOutroScriptProject: (
    channelId: string,
    projectId: string,
    payload: {
      expected_version: number;
      name?: string;
      archived?: boolean;
      drafts?: Partial<
        Record<
          IntroOutroClipKind,
          {
            target_duration_seconds?: number;
            seed_selection?: IntroOutroScriptProject["drafts"]["intro"]["seed_selection"];
            content?: IntroOutroScriptContent | null;
          }
        >
      >;
    },
  ): Promise<{ project: IntroOutroScriptProject }> =>
    request(projectBase(channelId, projectId), { method: "PATCH", body: JSON.stringify(payload) }),

  listIntroOutroScriptRevisions: (channelId: string, projectId: string): Promise<{ revisions: IntroOutroScriptRevision[] }> =>
    request(`${projectBase(channelId, projectId)}/revisions`),

  validateIntroOutroScriptDraft: (
    channelId: string,
    projectId: string,
    payload: { clip_kind: IntroOutroClipKind; mascot_style_id?: string },
  ): Promise<{ valid: boolean; issues: IntroOutroValidationIssue[] }> =>
    request(`${projectBase(channelId, projectId)}/validate`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  checkpointIntroOutroScript: (
    channelId: string,
    projectId: string,
    payload: {
      clip_kind: IntroOutroClipKind;
      expected_version: number;
      mascot_style_id?: string;
      warning_acknowledgements?: string[];
    },
  ): Promise<{ revision: IntroOutroScriptRevision; project: IntroOutroScriptProject }> =>
    request(`${projectBase(channelId, projectId)}/revisions`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  generateIntroOutroScripts: (
    channelId: string,
    projectId: string,
    payload: {
      expected_version: number;
      mascot_style_id?: string;
      idempotency_key: string;
      clips: GenerateScriptClipInput[];
    },
  ): Promise<{ job: IntroOutroScriptJob }> =>
    request(`${projectBase(channelId, projectId)}/generate`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  approveIntroOutroScriptRevision: (
    channelId: string,
    projectId: string,
    payload: { revision_id: string; expected_version: number },
  ): Promise<{ project: IntroOutroScriptProject }> =>
    request(`${projectBase(channelId, projectId)}/approve`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  exportIntroOutroScriptRevision: (
    channelId: string,
    projectId: string,
    revisionId: string,
  ): Promise<{ prompt: string; references: IntroOutroScriptRevision["references"]; revision: IntroOutroScriptRevision }> =>
    request(`${projectBase(channelId, projectId)}/revisions/${encodeURIComponent(revisionId)}/export`),

  getIntroOutroScriptJob: (channelId: string, jobId: string): Promise<{ job: IntroOutroScriptJob }> =>
    request(`${channelBase(channelId)}/intro-outro-script-jobs/${encodeURIComponent(jobId)}`),

  cancelIntroOutroScriptJob: (channelId: string, jobId: string): Promise<{ job: IntroOutroScriptJob }> =>
    request(`${channelBase(channelId)}/intro-outro-script-jobs/${encodeURIComponent(jobId)}/cancel`, {
      method: "POST",
    }),
};
