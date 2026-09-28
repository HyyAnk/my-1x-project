import path from "node:path";
import { parseArgs } from "node:util";
import { realpath } from "node:fs/promises";
import { storageLog } from "./lib/storage-audit-log.js";
import { auditMascotStorage } from "../apps/server/src/quiz/mascot/videoAnimation/storage/storageAudit.js";
import { acquireStorageMaintenanceLease } from "../apps/server/src/quiz/mascot/videoAnimation/storage/maintenanceLease.js";
import { assertServerOffline } from "../apps/server/src/quiz/mascot/videoAnimation/storage/offlineGuard.js";
import { archiveSourceFrames } from "../apps/server/src/quiz/mascot/videoAnimation/storage/sourceFrameArchive.js";
import { verifyArchiveArtifacts } from "../apps/server/src/quiz/mascot/videoAnimation/storage/verifyArchiveArtifacts.js";
import { writeDurableJson } from "../apps/server/src/quiz/mascot/videoAnimation/storage/archiveFiles.js";

const started = Date.now();
let release: (() => void) | undefined;
try {
  const { values } = parseArgs({
    strict: true,
    options: {
      root: { type: "string" },
      "archive-root": { type: "string" },
      apply: { type: "boolean", default: false },
      port: { type: "string", default: "4310" },
    },
  });
  if (!values.root || !path.isAbsolute(values.root) || path.basename(values.root) !== ".quiz-studio")
    throw new Error("Provide absolute --root ending in .quiz-studio");
  const root = await realpath(values.root);
  storageLog(
    "INFO",
    "startup",
    `root=${root}; mode=${values.apply ? "apply" : "dry-run"}; concurrency=1; profiles=discovered; method=filesystem`,
  );
  if (values.apply) {
    if (!values["archive-root"]) throw new Error("Apply requires --archive-root");
    await assertServerOffline(Number(values.port));
    release = acquireStorageMaintenanceLease(path.dirname(root));
    await assertServerOffline(Number(values.port));
  }
  const report = await auditMascotStorage(root);
  const candidates = report.attempts.filter((attempt) => attempt.source.files.length > 0);
  storageLog(
    "INFO",
    "plan",
    `attempts=${candidates.length}; bytes=${report.potentialSourceBytes}; excluded=${report.skipped.length}; matted=untouched`,
  );
  const results: { attempt: string; archive: string; files: number; bytes: number }[] = [];
  if (values.apply) {
    const archiveRoot = path.resolve(values["archive-root"]!);
    for (const [index, plan] of candidates.entries()) {
      storageLog("STEP", "attempt", `${index + 1}/${candidates.length}; ${plan.attemptDirectory}`);
      const result = await archiveSourceFrames({
        root,
        attempt: plan.attemptDirectory,
        archiveRoot,
        verifyArtifacts: verifyArchiveArtifacts,
      });
      results.push({ attempt: plan.attemptDirectory, ...result });
      storageLog("OK", "archived", `${index + 1}/${candidates.length}; bytes=${result.bytes}; archive=${result.archive}`);
    }
    await writeDurableJson(path.join(archiveRoot, `batch-${Date.now()}.json`), { root, results, excluded: report.skipped });
  }
  storageLog(
    "OK",
    "summary",
    `total=${candidates.length}; success=${results.length}; skipped=${report.skipped.length}; failed=0; retries=0; bytes=${results.reduce((sum, item) => sum + item.bytes, 0)}; elapsedMs=${Date.now() - started}`,
  );
} catch (error) {
  storageLog(
    "ERROR",
    "summary",
    `failed=1; elapsedMs=${Date.now() - started}; ${error instanceof Error ? error.message : String(error)}. Batch stopped; previous archives and per-attempt manifests remain recoverable`,
  );
  process.exitCode = 1;
} finally {
  release?.();
}
