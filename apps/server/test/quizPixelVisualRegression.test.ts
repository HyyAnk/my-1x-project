import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  VISUAL_SNAPSHOT_CASES,
  captureLayoutSnapshot,
  visualSnapshotBaselinePath,
  type VisualSnapshotCase,
} from "./helpers/visualSnapshotHarness.js";
import { diffPngs, writeDiffArtifact } from "./helpers/visualSnapshotCompare.js";

// Pixel-level regression gate: renders every production layout through the
// same HyperFrames engine used for video output and compares the captured
// frame against a committed baseline PNG.
// Regenerate baselines after an intentional visual change:
//   UPDATE_VISUAL_SNAPSHOTS=1 pnpm --filter @studio/server test -- test/quizPixelVisualRegression.test.ts
// Set SKIP_VISUAL_REGRESSION=1 to skip on machines without Chrome.

const MAX_DIFF_PERCENT = 1;

function shouldSkip(): boolean {
  return process.env.SKIP_VISUAL_REGRESSION === "1";
}

async function assertMatchesBaseline(caseItem: VisualSnapshotCase): Promise<void> {
  const baselinePath = visualSnapshotBaselinePath(caseItem);
  const caseName = `${caseItem.layoutId}-${caseItem.aspectRatio}-${caseItem.phase}`;
  const captured = await captureLayoutSnapshot(caseItem);

  if (process.env.UPDATE_VISUAL_SNAPSHOTS === "1") {
    await mkdir(path.dirname(baselinePath), { recursive: true });
    await writeFile(baselinePath, captured);
    return;
  }

  if (!existsSync(baselinePath)) {
    throw new Error(`Missing visual baseline for ${caseName}. Run UPDATE_VISUAL_SNAPSHOTS=1 to generate it at ${baselinePath}.`);
  }

  const baseline = await readFile(baselinePath);
  const diff = await diffPngs(baseline, captured);
  if (diff.diffPercent > MAX_DIFF_PERCENT) {
    const diffPath = await writeDiffArtifact(caseName, diff);
    throw new Error(
      `Visual regression in ${caseName}: ${diff.differentPixels}/${diff.totalPixels} pixels differ ` +
        `(${diff.diffPercent.toFixed(3)}% > ${MAX_DIFF_PERCENT}%). Diff image: ${diffPath}. ` +
        `If the change is intentional, regenerate baselines with UPDATE_VISUAL_SNAPSHOTS=1.`,
    );
  }
  expect(diff.diffPercent).toBeLessThanOrEqual(MAX_DIFF_PERCENT);
}

describe.skipIf(shouldSkip())("quiz layout pixel visual regression", () => {
  for (const caseItem of VISUAL_SNAPSHOT_CASES) {
    it(`matches baseline for ${caseItem.layoutId} (${caseItem.aspectRatio}, ${caseItem.phase})`, { timeout: 90_000 }, async () => {
      await assertMatchesBaseline(caseItem);
    });
  }
});
