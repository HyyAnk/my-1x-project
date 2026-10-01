import type { IntroOutroScriptRevision } from "@studio/shared";
import { createZipArchive } from "../quiz/zipHelper.js";
import type { IntroOutroScriptRepository } from "./repository.js";
import { compileProductionPrompt, referenceFilename } from "./productionPrompt.js";

export async function exportScriptPackage(scripts: IntroOutroScriptRepository, revision: IntroOutroScriptRevision): Promise<Buffer> {
  const assets = await Promise.all(
    revision.references.map(async (reference) => ({
      filename: referenceFilename(reference),
      data: await scripts.readReferenceSnapshot(revision.channel_id, revision.project_id, reference),
    })),
  );
  const prompt = compileProductionPrompt(revision);
  const isTwoPartOutro =
    revision.clip_kind === "outro" &&
    prompt.includes("PART 1: THE RUN-UP & KINEMATIC TRANSITION") &&
    prompt.includes("PART 2: MOMENTUM RECOVERY, CTA & FAREWELL");

  const promptFiles: Array<{ filename: string; data: Buffer }> = [
    { filename: "prompt.txt", data: Buffer.from(prompt) },
  ];

  if (isTwoPartOutro) {
    const partDelimiter = "================================================================================\nPART 2:";
    const part2Index = prompt.indexOf(partDelimiter);
    if (part2Index !== -1) {
      const part1Text = prompt.slice(0, part2Index).trim();
      const part2Text = prompt.slice(part2Index).trim();
      promptFiles.push(
        { filename: "part1_prompt.txt", data: Buffer.from(part1Text) },
        { filename: "part2_prompt.txt", data: Buffer.from(part2Text) },
      );
    }
  }

  const readme = `# Manual video production package

This package does not generate or upload a video automatically.
1. Read prompt.txt and select a video tool that supports the required input mode.${isTwoPartOutro ? "\n   (For this 2-part kinematic outro, part1_prompt.txt and part2_prompt.txt are also provided for convenience)." : ""}
2. Attach mascot_subject as the character reference, or as the first frame only when reference_mode is first_frame. If your tool only supports first-frame input, prepare a matching opening frame before generating.
3. In post_overlay mode, do not ask the video model to draw the logo. Composite channel_logo in your editor in the reserved region at the scripted timing. In supplied_reference mode, attach the logo separately and manually check fidelity.
4. Generate narration/music separately if the video tool does not support audio. The timing budget is an estimate, not a measured voice duration.
5. Inspect mascot identity, logo fidelity, timing, audio and the final hold. Automated script review is not video QA or user approval.
6. Upload the finished 1920x1080 clips through the existing Intro/Outro upload workflow.

revision.json includes the immutable identity snapshot, seed snapshot, asset hashes and review findings. Missing identity snapshots on legacy revisions require manual identity verification.
`;
  return createZipArchive([
    ...promptFiles,
    { filename: "revision.json", data: Buffer.from(JSON.stringify(revision, null, 2)) },
    { filename: "README.md", data: Buffer.from(readme) },
    ...assets,
  ]);
}
