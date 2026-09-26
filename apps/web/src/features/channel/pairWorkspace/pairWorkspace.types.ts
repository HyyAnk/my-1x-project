import type { IntroOutroClipKind, IntroOutroScriptJob, IntroOutroScriptProject } from "@studio/shared";

export type PairTexts = Record<IntroOutroClipKind, string>;
export type WorkspaceResponse = { project: IntroOutroScriptProject; job: IntroOutroScriptJob | null };
export type PairGenerationRequest = {
  expected_version: number;
  auto_identity: boolean;
  idempotency_key: string;
  clips: Array<{ clip_kind: IntroOutroClipKind; duration_seconds: number; randomization_seed: string }>;
};
export type SaveStatus = "saved" | "saving" | "unsaved" | "failed";
export const emptyPairTexts = (): PairTexts => ({ intro: "", outro: "" });
export const projectTexts = (project: IntroOutroScriptProject): PairTexts => ({
  intro: project.drafts.intro.prompt_text ?? "",
  outro: project.drafts.outro.prompt_text ?? "",
});
