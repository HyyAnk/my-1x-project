import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { buildApp, type StudioApp } from "../src/app.js";
import type { Channel, MascotProfile } from "@studio/shared";

export async function createTestImageBuffer(
  width: number,
  height: number,
  color = { r: 64, g: 128, b: 255, alpha: 1 },
): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: color,
    },
  })
    .png()
    .toBuffer();
}

export async function createTestImageBase64(
  width: number,
  height: number,
  color?: { r: number; g: number; b: number; alpha: number },
): Promise<string> {
  const buf = await createTestImageBuffer(width, height, color);
  return `data:image/png;base64,${buf.toString("base64")}`;
}

export async function createTestApp(): Promise<{ app: StudioApp; root: string; cleanup: () => Promise<void> }> {
  const root = await mkdtemp(path.join(os.tmpdir(), "brand-api-test-"));
  await mkdir(path.join(root, "templates"), { recursive: true });
  await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n");
  await writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# DNA\n");
  await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n");

  const app = await buildApp(root);
  const cleanup = async () => {
    await app.close();
    await rm(root, { recursive: true, force: true }).catch(() => {});
  };

  return { app, root, cleanup };
}

export async function setupTestChannelWithMascot(
  app: StudioApp,
  name = "Science Hub",
): Promise<{ channel: Channel; mascot: MascotProfile }> {
  const channel = await app.repository.createChannel({
    name,
    target_audience: "curious teens",
  });

  const mascot = await app.repository.saveMascot({
    name: "Professor Nova",
    description: "An eccentric astrophysicist mascot",
    master_image_url: "/api/mascots/prof-nova/master.png",
  });

  const updatedChannel = await app.repository.assignMascotToChannel(channel.channel_id, mascot.id);
  return { channel: updatedChannel, mascot };
}
