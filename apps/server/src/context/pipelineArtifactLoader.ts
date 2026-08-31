import { readFile } from "node:fs/promises";
import type { TaskType } from "@studio/shared";
import type { RepositoryService } from "../repository.js";
import type { ContextFile } from "./contextTypes.js";
import { readSharedRules } from "./contextManifestFinalizer.js";

export type ArtifactContext = {
  files: ContextFile[];
  sharedFiles: ContextFile[];
  dna: string;
  dnaPath: string;
  stylePath: string;
  isQuiz: boolean;
  runtimeConfig: { video_generation: { max_scene_duration_seconds?: number; narration_words_per_second?: number } };
  add: (file: ContextFile) => void;
  loadArtifact: (filename: string, required?: boolean) => Promise<{ path: string; content: string }>;
  artifact: (filename: string, reason: string, required?: boolean) => Promise<string>;
};

export async function loadPipelineArtifacts(taskType: TaskType, repository: RepositoryService, ctx: ArtifactContext): Promise<void> {
  const { stylePath, sharedFiles, artifact } = ctx;
  if (taskType === "GENERATE_RESEARCH") {
    const absolute = repository.resolveContextPath(stylePath);
    try {
      const content = await readFile(absolute, "utf8");
      ctx.add({ path: stylePath, reason: "channel style guide", content });
    } catch {
      // optional
    }
    await readSharedRules(repository, ["research_rules.md"], sharedFiles);
  } else if (taskType === "GENERATE_TREATMENT") {
    const absolute = repository.resolveContextPath(stylePath);
    try {
      const content = await readFile(absolute, "utf8");
      ctx.add({ path: stylePath, reason: "channel style guide", content });
    } catch {
      // optional
    }
    await artifact("research.md", "verified research dossier", true);
    await readSharedRules(repository, ["treatment_rules.md"], sharedFiles);
  } else if (taskType === "GENERATE_SCRIPT") {
    const absolute = repository.resolveContextPath(stylePath);
    try {
      const content = await readFile(absolute, "utf8");
      ctx.add({ path: stylePath, reason: "channel style guide", content });
    } catch {
      // optional
    }
    await artifact("research.md", "verified research dossier", true);
    await artifact("treatment.md", "approved treatment", true);
    await readSharedRules(repository, ["script_rules.md"], sharedFiles);
  } else if (taskType === "GENERATE_VISUAL_BIBLE") {
    const absolute = repository.resolveContextPath(stylePath);
    try {
      const content = await readFile(absolute, "utf8");
      ctx.add({ path: stylePath, reason: "channel style guide", content });
    } catch {
      // optional
    }
    await artifact("research.md", "verified research dossier", true);
    await artifact("treatment.md", "approved treatment", true);
    await artifact("script.md", "confirmed episode script", true);
    await readSharedRules(repository, ["visual_bible_rules.md", "prompt_rules.md"], sharedFiles);
  }
}
