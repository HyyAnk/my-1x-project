import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { AppConfig } from "@studio/shared";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function createStudioRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "mascot-settings-test-"));
  roots.push(root);
  await mkdir(path.join(root, "templates"), { recursive: true });
  await Promise.all([
    writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8"),
    writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz DNA\n", "utf8"),
    writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8"),
  ]);
  return root;
}

describe("Dual default placements persistence in mascot stage settings", () => {
  it("saves and merges 16:9 and 9:16 default presets independently", async () => {
    const root = await createStudioRoot();
    const app = await buildApp(root);

    try {
      // 1. Initial config should have default recommended 16:9 placement
      const initialConfig = await app.server.inject({ method: "GET", url: "/api/config" });
      expect(initialConfig.statusCode).toBe(200);
      const parsedInitial = initialConfig.json<AppConfig>();
      expect(parsedInitial.mascot_stage.default_placement.position).toBe("bottom_left");

      // 2. Save custom 16:9 default placement
      const preset16_9 = {
        position: "bottom_left" as const,
        scale: 1.5,
        offset_x: 25,
        offset_y: 35,
        flip_x: false,
      };
      const response16 = await app.server.inject({
        method: "POST",
        url: "/api/mascot-stage/settings",
        payload: {
          default_placements: {
            "16:9": preset16_9,
          },
        },
      });
      expect(response16.statusCode).toBe(200);
      let loaded = await loadConfig(root);
      expect(loaded.mascot_stage.default_placements?.["16:9"]).toEqual(preset16_9);
      expect(loaded.mascot_stage.default_placement).toEqual(preset16_9);

      // 3. Save custom 9:16 default placement without specifying 16:9
      const preset9_16 = {
        position: "bottom_right" as const,
        scale: 2.2,
        offset_x: -50,
        offset_y: 80,
        flip_x: true,
      };
      const response9 = await app.server.inject({
        method: "POST",
        url: "/api/mascot-stage/settings",
        payload: {
          default_placements: {
            "9:16": preset9_16,
          },
        },
      });
      expect(response9.statusCode).toBe(200);

      // 4. Verify BOTH 16:9 and 9:16 coexist and neither overwrote the other
      loaded = await loadConfig(root);
      expect(loaded.mascot_stage.default_placements?.["16:9"]).toEqual(preset16_9);
      expect(loaded.mascot_stage.default_placements?.["9:16"]).toEqual(preset9_16);
      // Flat default_placement maintains 16:9 for legacy consumers
      expect(loaded.mascot_stage.default_placement).toEqual(preset16_9);
    } finally {
      await app.close();
    }
  });
});
