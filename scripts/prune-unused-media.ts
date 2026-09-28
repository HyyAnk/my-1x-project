import path from "node:path";
import { parseArgs } from "node:util";
import { maintainUnusedMedia } from "../apps/server/src/quiz/mascot/videoAnimation/storage/unusedMediaMaintenance.js";
import { acquireStorageMaintenanceLease } from "../apps/server/src/quiz/mascot/videoAnimation/storage/maintenanceLease.js";
import { assertServerOffline } from "../apps/server/src/quiz/mascot/videoAnimation/storage/offlineGuard.js";
import { storageLog } from "./lib/storage-audit-log.js";

let release: (() => void) | undefined;
const started = Date.now();
try {
  const { values } = parseArgs({ strict: true, options: { root: { type: "string" }, apply: { type: "boolean", default: false } } });
  if (!values.root || !path.isAbsolute(values.root) || path.basename(values.root) !== ".quiz-studio")
    throw new Error("Provide absolute .quiz-studio root");
  storageLog(
    "INFO",
    "startup",
    `mode=${values.apply ? "apply" : "dry-run"}; root=${values.root}; concurrency=1; profiles=discovered; method=filesystem`,
  );
  if (values.apply) {
    await assertServerOffline(4310);
    release = acquireStorageMaintenanceLease(path.dirname(values.root));
    await assertServerOffline(4310);
  }
  const result = await maintainUnusedMedia(values.root, values.apply, (message) => storageLog("STEP", "scan", message));
  storageLog("OK", "summary", `failed=0; retries=0; elapsedMs=${Date.now() - started}; ${JSON.stringify(result)}`);
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
