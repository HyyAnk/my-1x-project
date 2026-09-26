import type {
  BatchGenerateIntroOutroScriptsInput,
  CreativeSeed,
  IntroOutroClipKind,
  IntroOutroScriptContext,
  IntroOutroScriptJob,
  IntroOutroScriptProject,
  IntroOutroScriptRevision,
  IntroOutroValidationIssue,
  MascotStyleIdentityProfile,
} from "@studio/shared";
import type { Notice } from "../../../components/types";
import type { GenerateScriptClipInput } from "../../../api/introOutroScriptApi";

export type ScriptContextBundle = {
  context: IntroOutroScriptContext;
  identity: MascotStyleIdentityProfile | null;
  seeds: CreativeSeed[];
};

export type ScriptStudioState = {
  contextBundle: ScriptContextBundle | null;
  projects: IntroOutroScriptProject[];
  project: IntroOutroScriptProject | null;
  revisions: IntroOutroScriptRevision[];
  job: IntroOutroScriptJob | null;
  activeJobs: IntroOutroScriptJob[];
  loading: boolean;
  busy: string | null;
  error: string | null;
};

export type ScriptStudioActions = {
  selectProject: (projectId: string) => void;
  createProject: () => Promise<void>;
  duplicateProject: () => Promise<void>;
  renameProject: (name: string) => Promise<void>;
  archiveProject: () => Promise<void>;
  analyzeIdentity: () => Promise<void>;
  reviewIdentity: (profile: MascotStyleIdentityProfile) => Promise<void>;
  generate: (clips: GenerateScriptClipInput[]) => Promise<void>;
  batchGenerate: (input: Omit<BatchGenerateIntroOutroScriptsInput, "style_preset_id">) => Promise<void>;
  cancelJob: () => Promise<void>;
  cancelSpecificJob: (jobId: string) => Promise<void>;
  saveContent: (kind: IntroOutroClipKind, content: IntroOutroScriptRevision["content"]) => Promise<void>;
  checkpoint: (kind: IntroOutroClipKind) => Promise<void>;
  validate: (kind: IntroOutroClipKind) => Promise<IntroOutroValidationIssue[]>;
  approve: (revisionId: string) => Promise<void>;
  loadPrompt: (revisionId: string) => Promise<string>;
  refresh: () => Promise<void>;
};

export type UseScriptStudioProps = {
  channelId: string;
  stylePresetId: string;
  categoryName: string;
  onNotice: (notice: NonNullable<Notice>) => void;
};
