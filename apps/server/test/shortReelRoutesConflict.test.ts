import { describe, expect, it } from "vitest";
import type { GenerateShortReelResponse, GetShortReelResponse } from "@studio/shared";
import {
  attachMascotWithStyle,
  buildTestApp,
  createTestReel,
  createTestRoot,
  installStubCoverProvider,
} from "./shortReelRoutesTestUtils.js";

describe("Short-Reel HTTP Routes and Confirmation Discrimination", () => {
  describe("HTTP-01 through HTTP-05: Phase 06 Endpoint Behaviors", () => {
    it("HTTP-03: stale PATCH revision returns 409 STALE_REVISION and preserves state", async () => {
      const root = await createTestRoot();
      const app = await buildTestApp(root);

      try {
        const { channel, reel } = await createTestReel(app);

        // PATCH with stale expected revision (999 instead of 1)
        const patchRes = await app.server.inject({
          method: "PATCH",
          url: `/api/channels/${channel.channel_id}/short-reels/${reel.reel_id}`,
          payload: {
            expected_revision: 999,
            request_id: "patch-req-stale",
            command: {
              kind: "update_model_note",
              model_note: "This note should not be written",
            },
          },
        });

        expect(patchRes.statusCode).toBe(409);
        expect(["STALE_REVISION", "REVISION_CONFLICT"]).toContain(patchRes.json<{ code: string }>().code);

        // Verify stored reel is unchanged
        const checkRes = await app.server.inject({
          method: "GET",
          url: `/api/channels/${channel.channel_id}/short-reels/${reel.reel_id}`,
        });
        expect(checkRes.statusCode).toBe(200);
        expect(checkRes.json<GetShortReelResponse>().short_reel.revision).toBe(1);
        expect(checkRes.json<GetShortReelResponse>().short_reel.model_note).not.toBe("This note should not be written");
      } finally {
        await app.close();
      }
    });

    it("HTTP-02: double generate with same request ID returns 202 acknowledging the same task", async () => {
      const root = await createTestRoot();
      const app = await buildTestApp(root);

      try {
        const { channel, reel } = await createTestReel(app);

        // Configure mascot and cover mock for channel so package generation can complete
        await attachMascotWithStyle(app, channel.channel_id, "Route Mascot");
        await installStubCoverProvider(app, root, "cover-provider.png");

        // First generation call
        const firstGen = await app.server.inject({
          method: "POST",
          url: `/api/channels/${channel.channel_id}/short-reels/${reel.reel_id}/generate`,
          payload: {
            expected_revision: reel.revision,
            request_id: "gen-req-001",
            target: "references",
          },
        });
        expect(firstGen.statusCode).toBe(202);
        const firstBody = firstGen.json<GenerateShortReelResponse>();
        expect(firstBody.task).toBeDefined();
        expect(firstBody.task.reel_id).toBe(reel.reel_id);
        expect(firstBody.task.episode_id).toBeNull();
        expect(firstBody.task.short_reel_request).toEqual({
          request_id: "gen-req-001",
          expected_revision: reel.revision,
          target: "references",
        });

        // Second generation call with the EXACT SAME request_id (replay)
        const secondGen = await app.server.inject({
          method: "POST",
          url: `/api/channels/${channel.channel_id}/short-reels/${reel.reel_id}/generate`,
          payload: {
            expected_revision: reel.revision,
            request_id: "gen-req-001",
            target: "references",
          },
        });
        expect(secondGen.statusCode).toBe(202);
        const secondBody = secondGen.json<GenerateShortReelResponse>();
        // Acknowledges the identical task ID
        expect(secondBody.task.task_id).toBe(firstBody.task.task_id);

        await new Promise<void>((resolve) => {
          const check = () => {
            const task = app.tasks.get(firstBody.task.task_id);
            if (["COMPLETED", "FAILED", "CANCELLED"].includes(task.status)) {
              app.tasks.off("event", onEvent);
              resolve();
            }
          };
          const onEvent = () => check();
          app.tasks.on("event", onEvent);
          check();
        });
        expect(app.tasks.get(firstBody.task.task_id).status).toBe("COMPLETED");
        const generated = await app.repository.getShortReel({ channel_id: channel.channel_id, reel_id: reel.reel_id });
        expect(generated.units.references.state).toBe("ready");
        expect(generated.units.script.state).toBe("missing");
        const reference = generated.units.references.last_accepted_payload?.references[0];
        expect(reference).toBeDefined();
        const assetResponse = await app.server.inject({
          method: "GET",
          url: `/api/channels/${channel.channel_id}/short-reels/${reel.reel_id}/assets/${reference?.asset_id}`,
        });
        expect(assetResponse.statusCode).toBe(200);
        expect(assetResponse.headers["content-type"]).toContain(reference?.mime_type);
        expect(assetResponse.rawPayload.length).toBeGreaterThan(0);

        const completedReplay = await app.server.inject({
          method: "POST",
          url: `/api/channels/${channel.channel_id}/short-reels/${reel.reel_id}/generate`,
          payload: { expected_revision: reel.revision, request_id: "gen-req-001", target: "references" },
        });
        expect(completedReplay.statusCode).toBe(202);
        expect(completedReplay.json<GenerateShortReelResponse>().task.task_id).toBe(firstBody.task.task_id);
      } finally {
        await app.close();
      }
    });
  });
});
