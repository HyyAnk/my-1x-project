import { spawn } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getHyperframesInvocation } from "../../src/tasks/video/videoInvocation.js";
import { buildSandboxComposition } from "../../src/quiz/render/sandboxComposition.js";
import { copyCandyArcadeFonts, resolveCandyArcadeFonts } from "../../src/quiz/render/candyArcade/candyArcadeFonts.js";

export type VisualSnapshotAspect = "16:9" | "9:16";
export type VisualSnapshotFormat = "multiple_choice" | "odd_one_out" | "true_false";

export type VisualSnapshotCase = {
  layoutId: string;
  aspectRatio: VisualSnapshotAspect;
  choices: string[];
  questionFormat: VisualSnapshotFormat;
  phase: "question" | "reveal";
};

export const VISUAL_SNAPSHOT_CAPTURE_SECONDS = 6;

export const VISUAL_SNAPSHOT_CASES: VisualSnapshotCase[] = [
  {
    layoutId: "media_left_choices_right",
    aspectRatio: "16:9",
    choices: ["Option A", "Option B", "Option C"],
    questionFormat: "multiple_choice",
    phase: "reveal",
  },
  {
    layoutId: "visual_choices_three",
    aspectRatio: "16:9",
    choices: ["Choice A", "Choice B", "Choice C"],
    questionFormat: "multiple_choice",
    phase: "reveal",
  },
  {
    layoutId: "visual_choices_three_pure",
    aspectRatio: "16:9",
    choices: ["Detail 1", "Detail 2", "Detail 3"],
    questionFormat: "odd_one_out",
    phase: "reveal",
  },
  { layoutId: "split_versus_two", aspectRatio: "16:9", choices: ["Lion", "Tiger"], questionFormat: "multiple_choice", phase: "reveal" },
  { layoutId: "verdict_true_false", aspectRatio: "16:9", choices: ["True", "False"], questionFormat: "true_false", phase: "reveal" },
  {
    layoutId: "full_stack_list",
    aspectRatio: "16:9",
    choices: ["Answer A", "Answer B", "Answer C"],
    questionFormat: "multiple_choice",
    phase: "reveal",
  },
  {
    layoutId: "mystery_reveal",
    aspectRatio: "16:9",
    choices: ["Secret A", "Secret B", "Secret C"],
    questionFormat: "multiple_choice",
    phase: "reveal",
  },
  {
    layoutId: "clue_deduction",
    aspectRatio: "16:9",
    choices: ["Clue A", "Clue B", "Clue C"],
    questionFormat: "multiple_choice",
    phase: "reveal",
  },
];

export function visualSnapshotBaselinePath(caseItem: VisualSnapshotCase): string {
  const fileName = `${caseItem.layoutId}-${caseItem.aspectRatio.replace(":", "x")}-${caseItem.phase}.png`;
  return path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "__snapshots__", "visual", fileName);
}

function sandboxPreviewInputFor(caseItem: VisualSnapshotCase) {
  return {
    layout_id: caseItem.layoutId,
    aspect_ratio: caseItem.aspectRatio,
    phase: caseItem.phase,
    choices: caseItem.choices,
    correct_choice_index: 0,
    question_format: caseItem.questionFormat,
    question_text: `Sample question for ${caseItem.layoutId}?`,
    fact_card_title: "DID YOU KNOW?",
    fact_card_text: "Deterministic fact used for visual regression captures.",
  };
}

function inlinePreviewFonts(html: string): string {
  let inlined = html;
  for (const font of resolveCandyArcadeFonts()) {
    inlined = inlined.replaceAll(`/api/quiz/fonts/${font.id}?v=${font.sha256.slice(0, 16)}`, `./fonts/${font.filename}`);
  }
  return inlined;
}

async function writeCaptureProject(caseItem: VisualSnapshotCase): Promise<string> {
  const projectDir = await mkdtemp(path.join(tmpdir(), "quiz-visual-"));
  await copyCandyArcadeFonts(projectDir);
  const composition = buildSandboxComposition(sandboxPreviewInputFor(caseItem));
  await writeFile(path.join(projectDir, "index.html"), inlinePreviewFonts(composition.html), "utf8");
  return projectDir;
}

function runHyperframesSnapshot(projectDir: string, outputDir: string): Promise<void> {
  const invocation = getHyperframesInvocation(
    "snapshot",
    projectDir,
    "--at",
    String(VISUAL_SNAPSHOT_CAPTURE_SECONDS),
    "--no-end",
    "--no-browser-gpu",
    "--describe",
    "false",
    "--timeout",
    "10000",
    "-o",
    outputDir,
  );
  return new Promise((resolve, reject) => {
    const child = spawn(invocation.command, invocation.args, { stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      output += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`hyperframes snapshot exited with ${code}:\n${output.slice(-2000)}`));
    });
  });
}

async function readCapturedFrame(outputDir: string): Promise<Buffer> {
  const entries = await readdir(outputDir);
  const frameFile = entries.find((name) => name.endsWith(".png"));
  if (!frameFile) throw new Error(`hyperframes snapshot produced no PNG in ${outputDir}`);
  return readFile(path.join(outputDir, frameFile));
}

export async function captureLayoutSnapshot(caseItem: VisualSnapshotCase): Promise<Buffer> {
  const projectDir = await writeCaptureProject(caseItem);
  try {
    const outputDir = path.join(projectDir, "snapshots");
    await runHyperframesSnapshot(projectDir, outputDir);
    return await readCapturedFrame(outputDir);
  } finally {
    await rm(projectDir, { recursive: true, force: true });
  }
}
