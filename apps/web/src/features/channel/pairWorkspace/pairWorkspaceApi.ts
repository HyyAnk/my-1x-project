import type { IntroOutroScriptJob, IntroOutroScriptProject } from "@studio/shared";
import { request } from "../../../api/client";
import type { PairGenerationRequest, PairTexts, WorkspaceResponse } from "./pairWorkspace.types";

const base = (channelId: string) => `/api/channels/${encodeURIComponent(channelId)}`;
const projectUrl = (channelId: string, id: string) => `${base(channelId)}/intro-outro-scripts/${encodeURIComponent(id)}`;

export const pairWorkspaceApi = {
  open: (channelId: string, category: string): Promise<WorkspaceResponse> =>
    request(`${base(channelId)}/intro-outro-pair-workspace`, {
      method: "POST",
      body: JSON.stringify({ style_preset_id: category }),
    }),
  get: (channelId: string, id: string): Promise<{ project: IntroOutroScriptProject }> => request(projectUrl(channelId, id)),
  save: (channelId: string, project: IntroOutroScriptProject, texts: PairTexts): Promise<{ project: IntroOutroScriptProject }> =>
    request(projectUrl(channelId, project.project_id), {
      method: "PATCH",
      body: JSON.stringify({
        expected_version: project.version,
        drafts: { intro: { prompt_text: texts.intro }, outro: { prompt_text: texts.outro } },
      }),
    }),
  generate: (channelId: string, id: string, input: PairGenerationRequest): Promise<{ job: IntroOutroScriptJob }> =>
    request(`${projectUrl(channelId, id)}/generate`, { method: "POST", body: JSON.stringify(input) }),
  job: (channelId: string, id: string): Promise<{ job: IntroOutroScriptJob }> =>
    request(`${base(channelId)}/intro-outro-script-jobs/${encodeURIComponent(id)}`),
  cancel: (channelId: string, id: string): Promise<{ job: IntroOutroScriptJob }> =>
    request(`${base(channelId)}/intro-outro-script-jobs/${encodeURIComponent(id)}/cancel`, { method: "POST" }),
};
