import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { AppConfig, Channel } from "@studio/shared";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function createStudioRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "mascot-stage-preset-"));
  roots.push(root);
  await mkdir(path.join(root, "templates"), { recursive: true });
  await Promise.all([
    writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8"),
    writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz DNA\n", "utf8"),
    writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8"),
  ]);
  return root;
}

describe("Mascot Stage default placement preset", () => {
  it("persists the preset, applies it to new assignments, and preserves an existing layout", async () => {
    const root = await createStudioRoot();
    const app = await buildApp(root);

    try {
      const initialConfig = await app.server.inject({ method: "GET", url: "/api/config" });
      expect(initialConfig.statusCode).toBe(200);
      expect(initialConfig.json<AppConfig>().mascot_stage.default_placement).toEqual({
        position: "bottom_left",
        scale: 1.84,
        offset_x: 67,
        offset_y: 90,
        flip_x: false,
      });

      const savedPreset = await app.server.inject({
        method: "POST",
        url: "/api/mascot-stage/settings",
        payload: {
          default_placement: { position: "bottom_right", scale: 1.62, offset_x: 35, offset_y: 84 },
        },
      });
      expect(savedPreset.statusCode).toBe(200);
      expect((await loadConfig(root)).mascot_stage.default_placement).toEqual({
        position: "bottom_right",
        scale: 1.62,
        offset_x: 35,
        offset_y: 84,
        flip_x: false,
      });

      const channel = await app.repository.createChannel({
        name: "Preset Channel",
        description: "",
        target_audience: "",
        language: "English",
        market: "",
        dna_mode: "example",
        group_id: "quiz",
      });
      const firstMascot = await app.repository.saveMascot({ name: "First Mascot" });
      const secondMascot = await app.repository.saveMascot({ name: "Second Mascot" });

      const firstAssignment = await app.server.inject({
        method: "PUT",
        url: `/api/channels/${channel.channel_id}/mascot`,
        payload: { mascot_id: firstMascot.id },
      });
      expect(firstAssignment.statusCode).toBe(200);
      expect(firstAssignment.json<{ channel: Channel }>().channel.mascot_config).toMatchObject({
        position: "bottom_right",
        scale: 1.62,
        offset_x: 35,
        offset_y: 84,
      });

      await app.server.inject({
        method: "PUT",
        url: `/api/channels/${channel.channel_id}/mascot`,
        payload: { mascot_id: firstMascot.id, config: { scale: 1.25, offset_x: -18 } },
      });
      await app.server.inject({
        method: "POST",
        url: "/api/mascot-stage/settings",
        payload: {
          default_placement: { position: "bottom_left", scale: 1.9, offset_x: 12, offset_y: 72 },
        },
      });

      const sameAssignment = await app.server.inject({
        method: "PUT",
        url: `/api/channels/${channel.channel_id}/mascot`,
        payload: { mascot_id: firstMascot.id },
      });
      expect(sameAssignment.json<{ channel: Channel }>().channel.mascot_config).toMatchObject({ scale: 1.25, offset_x: -18 });

      const newAssignment = await app.server.inject({
        method: "PUT",
        url: `/api/channels/${channel.channel_id}/mascot`,
        payload: { mascot_id: secondMascot.id },
      });
      expect(newAssignment.json<{ channel: Channel }>().channel.mascot_config).toMatchObject({
        position: "bottom_left",
        scale: 1.9,
        offset_x: 12,
        offset_y: 72,
      });
    } finally {
      await app.close();
    }
  });

  it("rejects placement values outside the Stage Studio controls", async () => {
    const app = await buildApp(await createStudioRoot());
    try {
      const response = await app.server.inject({
        method: "POST",
        url: "/api/mascot-stage/settings",
        payload: {
          default_placement: { position: "bottom_left", scale: 3.1, offset_x: 0, offset_y: 0 },
        },
      });
      expect(response.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  });
});
