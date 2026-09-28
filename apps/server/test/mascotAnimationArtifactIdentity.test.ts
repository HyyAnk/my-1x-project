import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  parseAnimationArtifactUrl,
  resolveAnimationPhysicalFile,
  buildLocalizedArtifactFilename,
} from "../src/tasks/video/mascotAnimationResolver.js";
import { localizeAnimationArtifact } from "../src/tasks/video/mascotAssetDiskCopier.js";

const url = "/api/mascots/owl/styles/classic/animations/thinking/1/artifacts/frame_001.png";
const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "animation-pin-"));
  roots.push(root);
  const slot = path.join(root, "mascots/owl/animations/classic/thinking/slot_1");
  for (const [relative, content] of [
    ["frame_001.png", "published"],
    ["attempts/att_1/frames/matted/frame_001.png", "original-one"],
    ["attempts/att_2/frames/matted/frame_001.png", "original-two"],
  ]) {
    const file = path.join(slot, relative);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content);
  }
  return root;
}

describe("animation artifact attempt identity", () => {
  it.each([url, "/mascot/assets/animations/owl/classic/thinking/1/frame_001.png"])("preserves pins for %s", (base) => {
    expect(parseAnimationArtifactUrl(`${base}?attempt=2#preview`)?.attempt).toBe(2);
    expect(parseAnimationArtifactUrl(base)?.attempt).toBeUndefined();
  });

  it.each(["0", "-1", "1.5", "abc", "", "9007199254740992", "1&attempt=2"])("rejects invalid pin %s", (pin) => {
    expect(parseAnimationArtifactUrl(`${url}?attempt=${pin}`)).toBeNull();
  });

  it("preserves pins for context-based filenames", () => {
    expect(parseAnimationArtifactUrl("frame_001.png?attempt=3", { mascotId: "owl", styleId: "classic", state: "thinking" })?.attempt).toBe(
      3,
    );
  });

  it.each([url.replace("frame_001.png", "%2e%2e%2fsecret.png"), url.replace("owl", "%ZZ"), url.replace("thinking/1/", "thinking/1junk/")])(
    "rejects malformed identity %s",
    (input) => {
      expect(parseAnimationArtifactUrl(input)).toBeNull();
    },
  );

  it("resolves the exact attempt without falling back to published or newer media", async () => {
    const root = await fixture();
    const artifact = parseAnimationArtifactUrl(`${url}?attempt=1`)!;
    expect(await readFile((await resolveAnimationPhysicalFile(root, artifact))!, "utf8")).toBe("original-one");
    expect(await resolveAnimationPhysicalFile(root, { ...artifact, attempt: 3 })).toBeNull();
    expect(await resolveAnimationPhysicalFile(root, { ...artifact, attempt: NaN })).toBeNull();
  });

  it("keeps legacy unpinned lookup and filenames", async () => {
    const root = await fixture();
    const artifact = parseAnimationArtifactUrl(url)!;
    expect(await readFile((await resolveAnimationPhysicalFile(root, artifact))!, "utf8")).toBe("published");
    expect(buildLocalizedArtifactFilename(artifact)).toBe("owl_classic_thinking_s1_frame_001.png");
  });

  it("localizes two attempts without overwriting either frame", async () => {
    const root = await fixture();
    const render = path.join(root, "render");
    await mkdir(render);
    const one = await localizeAnimationArtifact(`${url}?attempt=1`, root, "owl", render);
    const two = await localizeAnimationArtifact(`${url}?attempt=2`, root, "owl", render);
    expect(one).not.toBe(two);
    expect(await readFile(path.join(render, path.basename(one!)), "utf8")).toBe("original-one");
    expect(await readFile(path.join(render, path.basename(two!)), "utf8")).toBe("original-two");
    expect(await localizeAnimationArtifact(`${url}?attempt=99`, root, "owl", render)).toBeNull();
  });
});
