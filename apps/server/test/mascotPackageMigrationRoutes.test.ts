import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import type { MascotProfile } from "@studio/shared";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("Mascot Package and Migration HTTP Routes", () => {
  it("handles mascot package export, import, and migration endpoints", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mascot-pkg-test-"));
    roots.push(root);
    await mkdir(path.join(root, "templates"), { recursive: true });
    await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");

    const app = await buildApp(root);

    // Create a mascot
    const createRes = await app.server.inject({
      method: "POST",
      url: "/api/mascots",
      payload: {
        name: "Packaged Mascot",
        description: "Testing export and import",
        visual_style: "flat_vector",
        master_prompt: "Test prompt",
      },
    });
    expect(createRes.statusCode).toBe(201);
    const mascot = createRes.json<{ mascot: MascotProfile }>().mascot;

    // Test export via /api/mascots/:mascotId/export
    const exportRes1 = await app.server.inject({
      method: "GET",
      url: `/api/mascots/${mascot.id}/export`,
    });
    expect(exportRes1.statusCode).toBe(200);
    expect(exportRes1.headers["content-type"]).toBe("application/zip");

    // Test export via /api/mascots/:mascotId/package/export
    const exportRes2 = await app.server.inject({
      method: "GET",
      url: `/api/mascots/${mascot.id}/package/export`,
    });
    expect(exportRes2.statusCode).toBe(200);
    expect(exportRes2.headers["content-type"]).toBe("application/zip");

    const zipBuffer = exportRes1.rawPayload;
    const base64Data = zipBuffer.toString("base64");

    // Test import via /api/mascots/import
    const importRes1 = await app.server.inject({
      method: "POST",
      url: "/api/mascots/import",
      payload: { data: base64Data },
    });
    expect(importRes1.statusCode).toBe(201);
    const importedMascot1 = importRes1.json<{ mascot: MascotProfile }>().mascot;
    expect(importedMascot1.name).toContain("Packaged Mascot");

    // Test import via /api/mascots/package/import
    const importRes2 = await app.server.inject({
      method: "POST",
      url: "/api/mascots/package/import",
      payload: { data: base64Data },
    });
    expect(importRes2.statusCode).toBe(201);
    const importedMascot2 = importRes2.json<{ mascot: MascotProfile }>().mascot;
    expect(importedMascot2.name).toContain("Packaged Mascot");

    // Test migration endpoint
    const migrationRes = await app.server.inject({
      method: "POST",
      url: "/api/mascots/migration",
      payload: { mode: "dry_run" },
    });
    expect(migrationRes.statusCode).toBe(200);
    const migrationBody = migrationRes.json<{ report: { mode: string; entries: unknown[] } }>();
    expect(migrationBody.report.mode).toBe("dry_run");
  });

  it("modernizes mascot action endpoints and preserves render_bundle and styles across package export/import", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mascot-modern-test-"));
    roots.push(root);
    await mkdir(path.join(root, "templates"), { recursive: true });
    await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");

    const app = await buildApp(root);

    // 1. Create Mascot
    const createRes = await app.server.inject({
      method: "POST",
      url: "/api/mascots",
      payload: {
        name: "Aero the Falcon",
        description: "A fast and smart falcon mascot",
        visual_style: "pixar_3d",
        master_prompt: "Heroic falcon with sleek goggles",
        color_theme: "#10b981",
      },
    });
    expect(createRes.statusCode).toBe(201);
    const mascot = createRes.json<{ mascot: MascotProfile }>().mascot;

    // 2. Generate Action Art via modern endpoint /api/mascots/:id/actions/:action/generate
    const genRes = await app.server.inject({
      method: "POST",
      url: `/api/mascots/${mascot.id}/actions/wave/generate`,
      payload: {
        frames_count: 1,
        fps: 8,
        loop: true,
      },
    });
    expect(genRes.statusCode).toBe(200);
    const genData = genRes.json<{
      mascot: MascotProfile;
      action_asset: MascotProfile["render_bundle"] extends { assets: { actions: infer A } } ? NonNullable<A[keyof A]> : any;
      render_bundle: NonNullable<MascotProfile["render_bundle"]>;
      action_sprite: NonNullable<MascotProfile["actions"]["wave"]>;
    }>();

    expect(genData.mascot.id).toBe(mascot.id);
    expect(genData.action_asset).toBeDefined();
    expect(genData.action_asset.action).toBe("wave");
    expect(genData.action_asset.image_url).toContain(`/api/mascots/${mascot.id}/assets/`);
    expect(genData.render_bundle.assets.actions.wave?.image_url).toBe(genData.action_asset.image_url);
    expect(genData.action_sprite.action).toBe("wave");

    // 3. Upload Action Art via modern endpoint /api/mascots/:id/actions/:action/upload
    const uploadRes = await app.server.inject({
      method: "POST",
      url: `/api/mascots/${mascot.id}/actions/celebrate/upload`,
      payload: {
        data: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        frames_count: 1,
        motion_preset: "jump",
      },
    });
    expect(uploadRes.statusCode).toBe(200);
    const uploadData = uploadRes.json<{
      mascot: MascotProfile;
      action_asset: any;
      render_bundle: NonNullable<MascotProfile["render_bundle"]>;
      action_sprite: any;
    }>();

    expect(uploadData.action_asset.action).toBe("celebrate");
    expect(uploadData.action_asset.motion.preset).toBe("jump");
    expect(uploadData.render_bundle.assets.actions.celebrate?.image_url).toBe(uploadData.action_asset.image_url);

    // 4. Calibrate Action via POST and PATCH endpoints
    const calibrateRes = await app.server.inject({
      method: "PATCH",
      url: `/api/mascots/${mascot.id}/actions/wave/calibrate`,
      payload: {
        offset_x: 14,
        offset_y: -8,
        pivot_x: 250,
        pivot_y: 500,
        motion: {
          preset: "sway",
          speed: 1.8,
          intensity: "dynamic",
        },
      },
    });
    expect(calibrateRes.statusCode).toBe(200);
    const calData = calibrateRes.json<{
      mascot: MascotProfile;
      action: any;
      action_asset: any;
      render_bundle: NonNullable<MascotProfile["render_bundle"]>;
    }>();

    expect(calData.action_asset.action).toBe("wave");
    expect(calData.action_asset.registration.offset_x).toBe(14);
    expect(calData.action_asset.registration.offset_y).toBe(-8);
    expect(calData.action_asset.registration.pivot).toEqual({ x: 250, y: 500 });
    expect(calData.action_asset.motion.preset).toBe("sway");
    expect(calData.action_asset.motion.speed).toBe(1.8);
    expect(calData.action_asset.motion.intensity).toBe("dynamic");
    expect(calData.render_bundle.assets.actions.wave?.registration.offset_x).toBe(14);

    // 5. Create and update a Style to test full style serialization
    const styleRes = await app.server.inject({
      method: "POST",
      url: `/api/mascots/${mascot.id}/styles`,
      payload: {
        name: "Cybernetic Falcon",
        keyword: "cyberpunk metallic neon wings",
      },
    });
    expect(styleRes.statusCode).toBe(201);
    const _createdStyle = styleRes.json<{ style: any }>().style;

    // 6. Export Package
    const exportRes = await app.server.inject({
      method: "GET",
      url: `/api/mascots/${mascot.id}/export`,
    });
    expect(exportRes.statusCode).toBe(200);
    const zipData = exportRes.rawPayload.toString("base64");

    // 7. Import Package into a new Mascot
    const importRes = await app.server.inject({
      method: "POST",
      url: "/api/mascots/import",
      payload: { data: zipData },
    });
    expect(importRes.statusCode).toBe(201);
    const importedMascot = importRes.json<{ mascot: MascotProfile }>().mascot;

    expect(importedMascot.id).not.toBe(mascot.id);
    expect(importedMascot.name).toContain("Aero the Falcon");
    expect(importedMascot.render_bundle).toBeDefined();

    // Verify calibrated V2 action asset was preserved across export and import!
    const importedWave = importedMascot.render_bundle?.assets.actions.wave;
    expect(importedWave).toBeDefined();
    expect(importedWave?.action).toBe("wave");
    expect(importedWave?.registration.offset_x).toBe(14);
    expect(importedWave?.registration.offset_y).toBe(-8);
    expect(importedWave?.registration.pivot).toEqual({ x: 250, y: 500 });
    expect(importedWave?.motion.preset).toBe("sway");
    expect(importedWave?.motion.speed).toBe(1.8);
    expect(importedWave?.motion.intensity).toBe("dynamic");
    expect(importedWave?.image_url).toContain(`/api/mascots/${importedMascot.id}/assets/`);

    // Verify custom style was preserved across export and import!
    expect(importedMascot.styles).toBeDefined();
    const importedCyberStyle = importedMascot.styles?.find((s) => s.name === "Cybernetic Falcon");
    expect(importedCyberStyle).toBeDefined();
    expect(importedCyberStyle?.keyword).toBe("cyberpunk metallic neon wings");
  });
});
