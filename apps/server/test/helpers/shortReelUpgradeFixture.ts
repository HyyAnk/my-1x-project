import { vi } from "vitest";
import type { PortraitImageClient } from "../../src/providers/imageGeneration/imageGeneration.types.js";
import { resolveMascotReference } from "../../src/shortReel/mascotReferenceService.js";
import { adoptVisualContext } from "../../src/shortReel/visualContextService.js";
import { packageFixture } from "./shortReelPackageFixture.js";
import { repairScript } from "./shortReelRepairFixture.js";

export function fakePortraitClient(bytes: Uint8Array): PortraitImageClient {
  return {
    supportsReferenceImage: true,
    generate: vi.fn(async () => ({
      bytes,
      provider: "test",
      model: "fixture-model",
    })),
  };
}

export async function createUpgradeFixture() {
  const f = await packageFixture();
  const mascot = await f.repo.getMascot(f.mascot.id);
  await f.repo.saveMascot({
    ...mascot,
    styles: mascot.styles.map((style) => ({ ...style, anchor_image_url: null })),
  });
  const signal = new AbortController().signal;
  const context = await resolveMascotReference(f.repo, f.key, signal);
  await adoptVisualContext(f.repo, f.key, context);
  const snapshot = await f.repo.updateShortReel(
    f.key,
    {
      expected_revision: (await f.repo.getShortReel(f.key)).revision,
      request_id: "fixture-script",
    },
    { kind: "update_script", script: repairScript() },
  );
  return { ...f, snapshot, signal };
}
