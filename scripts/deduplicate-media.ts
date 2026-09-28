import path from "node:path";
import { parseArgs } from "node:util";
import { deduplicateMedia } from "../apps/server/src/quiz/mascot/videoAnimation/storage/deduplicateMedia.js";
import { acquireStorageMaintenanceLease } from "../apps/server/src/quiz/mascot/videoAnimation/storage/maintenanceLease.js";
import { assertServerOffline } from "../apps/server/src/quiz/mascot/videoAnimation/storage/offlineGuard.js";
import { storageLog } from "./lib/storage-audit-log.js";
let release: (() => void) | undefined;
try {
  const { values } = parseArgs({ strict: true, options: { root: { type: "string" }, apply: { type: "boolean" } } });
  if (!values.apply || !values.root || !path.isAbsolute(values.root) || path.basename(values.root) !== ".quiz-studio")
    throw new Error("Provide --apply and absolute .quiz-studio --root");
  storageLog(
    "INFO",
    "startup",
    `mode=apply; root=${values.root}; concurrency=1; profiles=discovered; method=NTFS-hardlinks; relocation=none`,
  );
  await assertServerOffline(4310);
  release = acquireStorageMaintenanceLease(path.dirname(values.root));
  await assertServerOffline(4310);
  const result = await deduplicateMedia(values.root, (message) => storageLog("STEP", "deduplicate", message));
  storageLog("OK", "summary", `failed=0; retries=0; ${JSON.stringify(result)}`);
} catch (error) {
  storageLog(
    "ERROR",
    "summary",
    `failed=1; ${error instanceof Error ? error.message : String(error)}; inspect central journals before retrying`,
  );
  process.exitCode = 1;
} finally {
  release?.();
}
