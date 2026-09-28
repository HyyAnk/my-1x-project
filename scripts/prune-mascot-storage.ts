import { parseArgs } from "node:util";
import { readdir, realpath } from "node:fs/promises";
import path from "node:path";
import { storageLog } from "./lib/storage-audit-log.js";
import { auditMascotStorage } from "../apps/server/src/quiz/mascot/videoAnimation/storage/storageAudit.js";
import { planRedundantArchive } from "../apps/server/src/quiz/mascot/videoAnimation/storage/redundantArchivePlan.js";
import { purgeRedundantArchive } from "../apps/server/src/quiz/mascot/videoAnimation/storage/purgeRedundantArchive.js";
import { pruneCompletedIntermediates } from "../apps/server/src/quiz/mascot/videoAnimation/storage/pruneCompletedIntermediates.js";
import { verifyArchiveArtifacts } from "../apps/server/src/quiz/mascot/videoAnimation/storage/verifyArchiveArtifacts.js";
import { assertServerOffline } from "../apps/server/src/quiz/mascot/videoAnimation/storage/offlineGuard.js";
import { acquireStorageMaintenanceLease } from "../apps/server/src/quiz/mascot/videoAnimation/storage/maintenanceLease.js";

const started = Date.now();
let release: (() => void) | undefined;
let success = 0;
let skipped = 0;
let bytes = 0;
let files = 0;
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
    `root=${root}; mode=${values.apply ? "apply" : "dry-run"}; concurrency=1; method=filesystem; profiles=discovered; relocation=none`,
  );
  if (values.apply) {
    await assertServerOffline(Number(values.port));
    release = acquireStorageMaintenanceLease(path.dirname(root));
    await assertServerOffline(Number(values.port));
  }
  if (values["archive-root"]) {
    const archiveRoot = path.resolve(values["archive-root"]);
    for (const entry of await readdir(archiveRoot, { withFileTypes: true })) {
      if (!entry.name.startsWith("source-")) continue;
      const archive = path.join(archiveRoot, entry.name);
      const plan = await planRedundantArchive(root, archive);
      const result = values.apply
        ? await purgeRedundantArchive(root, archive, verifyArchiveArtifacts)
        : { files: plan.files.length, bytes: plan.bytes };
      files += result.files;
      bytes += result.bytes;
      storageLog("OK", "archive-frames", `item=${++success}; files=${result.files}; bytes=${result.bytes}; path=${archive}`);
    }
  } else {
    const audit = await auditMascotStorage(root);
    skipped = audit.skipped.length;
    for (const plan of audit.attempts) {
      const candidates = plan.source.files.length + (plan.mattedProtected ? 0 : plan.matted.files.length);
      if (!candidates) {
        skipped++;
        continue;
      }
      const result = values.apply
        ? await pruneCompletedIntermediates(root, plan.attemptDirectory, verifyArchiveArtifacts)
        : {
            files: candidates,
            bytes: plan.source.bytes + (plan.mattedProtected ? 0 : plan.matted.bytes),
          };
      files += result.files;
      bytes += result.bytes;
      storageLog("OK", "intermediates", `item=${++success}; files=${result.files}; bytes=${result.bytes}; path=${plan.attemptDirectory}`);
    }
  }
  storageLog(
    "OK",
    "summary",
    `success=${success}; skipped=${skipped}; failed=0; retries=0; files=${files}; ${values.apply ? "reclaimedBytes" : "potentialBytes"}=${bytes}; elapsedMs=${Date.now() - started}`,
  );
} catch (error) {
  storageLog(
    "ERROR",
    "summary",
    `success=${success}; skipped=${skipped}; failed=1; confirmedBytes=${bytes}; ${error instanceof Error ? error.message : String(error)}. Stop writers and inspect the journal before retrying; no automatic rollback after deletion`,
  );
  process.exitCode = 1;
} finally {
  release?.();
}
