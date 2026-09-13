import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { acquireRenderLease } from "../src/tasks/video/resume/renderLease.js";

const roots: string[] = [];
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "render-lease-"));
  roots.push(root);
  return root;
}
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

it("refuses overlapping live workers and permits work after release", async () => {
  const root = await fixture();
  const release = await acquireRenderLease(root);
  await expect(acquireRenderLease(root, 0)).rejects.toThrow("Another render worker");
  await release();
  const next = await acquireRenderLease(root);
  await next();
});
it("reclaims an immutable lease left by a dead process", async () => {
  const root = await fixture();
  const directory = path.join(root, ".render-worker-lock");
  await mkdir(directory);
  await writeFile(path.join(directory, `2147483647-${randomUUID()}.lease`), "");
  const release = await acquireRenderLease(root);
  await release();
});
