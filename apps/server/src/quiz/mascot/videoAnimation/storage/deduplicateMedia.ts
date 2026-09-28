import path from "node:path";
import { readdir, mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { auditMascotStorage } from "./storageAudit.js";
import { fileExists, writeDurableJson, hashFile } from "./archiveFiles.js";
import { linkIdenticalMedia } from "./identicalMediaLink.js";
import { assertContainedPath } from "./safeFrameFiles.js";

/** Offline operation: exact byte duplicates only. All URLs and filenames remain usable. */
export async function deduplicateMedia(root: string, log: (message: string) => void) {
  const pairs: { canonical: string; duplicate: string }[] = [];
  for (const plan of (await auditMascotStorage(root)).attempts) {
    for (const entry of await readdir(plan.attemptDirectory, { withFileTypes: true })) {
      if (entry.isFile() && /^\d+\.mp4$/i.test(entry.name))
        pairs.push({ canonical: path.join(plan.attemptDirectory, "source.mp4"), duplicate: path.join(plan.attemptDirectory, entry.name) });
    }
  }
  const mascots = path.join(root, "mascots");
  for (const mascot of await readdir(mascots, { withFileTypes: true })) {
    if (!mascot.isDirectory() || mascot.isSymbolicLink()) continue;
    const assets = path.join(mascots, mascot.name, "assets");
    if (!(await fileExists(assets))) continue;
    await assertContainedPath(root, assets);
    for (const entry of await readdir(assets, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.includes("_raw") || !entry.name.endsWith(".png")) continue;
      const canonical = path.join(assets, entry.name.replace("_raw_", "_").replace("_raw.png", ".png"));
      if (await fileExists(canonical)) pairs.push({ canonical, duplicate: path.join(assets, entry.name) });
    }
  }
  const journal = path.join(root, "maintenance", `dedup-${randomUUID()}`);
  await mkdir(journal, { recursive: true });
  await assertContainedPath(root, journal);
  await writeDurableJson(path.join(journal, "plan.json"), pairs);
  let bytes = 0;
  let files = 0;
  for (const [index, pair] of pairs.entries()) {
    const reclaimed = await linkIdenticalMedia(root, pair.canonical, pair.duplicate);
    if (reclaimed) {
      if ((await hashFile(pair.canonical)) !== (await hashFile(pair.duplicate))) throw new Error("Linked bytes changed unexpectedly");
      bytes += reclaimed;
      files++;
    }
    if (index % 100 === 0) log(`Checked=${index + 1}/${pairs.length}; consolidatedBytes=${bytes}`);
  }
  const result = { files, bytes, checked: pairs.length };
  await writeDurableJson(path.join(journal, "completed.json"), result);
  return result;
}
