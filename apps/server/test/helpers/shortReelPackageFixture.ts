import path from "node:path";
import { writeFile } from "node:fs/promises";
import sharp from "sharp";
import { repairFixture } from "./shortReelRepairFixture.js";

export function packageImage(color = "red", width = 1080, height = 1920) {
  return sharp({ create: { width, height, channels: 4, background: color } })
    .png()
    .toBuffer();
}

export async function packageFixture() {
  const f = await repairFixture();
  const mascot = await f.repo.saveMascot({ name: "Selected mascot" });
  await f.repo.updateChannel(f.channel.channel_id, { mascot_id: mascot.id });
  const master = await f.repo.saveMascotAsset(mascot.id, "master.png", await packageImage("red", 200, 200));
  const anchor = await f.repo.saveMascotAsset(mascot.id, "anchor.png", await packageImage("blue", 200, 200));
  await f.repo.saveMascot({
    ...mascot,
    master_image_url: master,
    active_style_id: "selected",
    styles: [
      {
        id: "selected",
        name: "Selected style",
        keyword: "cinematic",
        anchor_image_url: anchor,
        is_default: true,
        states: { thinking: [], celebrate: [] },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  });
  const providerPath = path.join(f.root, "provider.png");
  await writeFile(providerPath, await packageImage());
  return {
    ...f,
    mascot,
    master,
    anchor,
    providerPath,
    imageProvider: { generateReference: () => Promise.resolve({ asset_path: providerPath }) },
  };
}
