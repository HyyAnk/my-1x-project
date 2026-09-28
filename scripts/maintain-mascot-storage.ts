import { parseArgs } from "node:util";
import path from "node:path";
import { realpath } from "node:fs/promises";
import { storageLog } from "./lib/storage-audit-log.js";
import { acquireStorageMaintenanceLease } from "../apps/server/src/quiz/mascot/videoAnimation/storage/maintenanceLease.js";
import { assertServerOffline } from "../apps/server/src/quiz/mascot/videoAnimation/storage/offlineGuard.js";
import { planAttemptRetention } from "../apps/server/src/quiz/mascot/videoAnimation/storage/attemptRetentionPlan.js";
import { archiveSourceFrames } from "../apps/server/src/quiz/mascot/videoAnimation/storage/sourceFrameArchive.js";
import { restoreSourceFrames } from "../apps/server/src/quiz/mascot/videoAnimation/storage/restoreSourceFrames.js";
import { verifyArchiveArtifacts } from "../apps/server/src/quiz/mascot/videoAnimation/storage/verifyArchiveArtifacts.js";

const started = Date.now();
let release: (() => void) | undefined;
try {
  const { values } = parseArgs({
    strict: true,
    options: {
      root: { type: "string" },
      attempt: { type: "string" },
      "archive-root": { type: "string" },
      restore: { type: "string" },
      apply: { type: "boolean", default: false },
      port: { type: "string", default: "4310" },
    },
  });
  if (!values.root || !path.isAbsolute(values.root) || path.basename(values.root) !== ".quiz-studio")
    throw new Error("Provide absolute --root ending in .quiz-studio");
  const root = await realpath(values.root);
  if (values.restore && values.attempt) throw new Error("Choose either --restore or --attempt");
  storageLog(
    "INFO",
    "startup",
    `root=${root}; mode=${values.apply ? "apply" : "dry-run"}; concurrency=1; profiles=1; method=filesystem; port=${values.port}`,
  );
  if (!values.apply) {
    if (values.restore) throw new Error("Restore requires --apply after reviewing the archive manifest");
    if (!values.attempt) throw new Error("Provide --attempt with the exact absolute attempt directory");
    const plan = await planAttemptRetention(root, values.attempt);
    storageLog(
      "OK",
      "plan",
      `attempt=${plan.attemptDirectory}; sourceFiles=${plan.source.files.length}; sourceBytes=${plan.source.bytes}; matted=protected; deleted=0`,
    );
  } else {
    await assertServerOffline(Number(values.port));
    release = acquireStorageMaintenanceLease(path.dirname(root));
    await assertServerOffline(Number(values.port));
    if (values.restore) {
      const result = await restoreSourceFrames(root, path.resolve(values.restore));
      storageLog("OK", "restore", JSON.stringify(result));
    } else {
      if (!values.attempt || !values["archive-root"]) throw new Error("Apply requires --attempt and an existing --archive-root directory");
      const result = await archiveSourceFrames({
        root,
        attempt: values.attempt,
        archiveRoot: values["archive-root"],
        verifyArtifacts: verifyArchiveArtifacts,
        progress: (step, done, total) => {
          if (done === total || done % 50 === 0) storageLog("STEP", step, `${done}/${total} (${Math.round((done / total) * 100)}%)`);
        },
      });
      storageLog("OK", "archive", JSON.stringify(result));
    }
  }
  storageLog("OK", "summary", `total=1; success=1; failed=0; retries=0; elapsedMs=${Date.now() - started}; archive retained for recovery`);
} catch (error) {
  storageLog(
    "ERROR",
    "summary",
    `failed=1; elapsedMs=${Date.now() - started}; ${error instanceof Error ? error.message : String(error)}. Inspect any retained archive; do not delete it`,
  );
  process.exitCode = 1;
} finally {
  release?.();
}
