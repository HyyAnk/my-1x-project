import { describe, expect, it } from "vitest";
import Fastify from "fastify";
import { registerShortReelsRoutes } from "../src/routes/shortReels.js";
import { buildTestApp, createTestChannel, createTestReel, createTestRoot, seedTopicRunWithReel } from "./shortReelRoutesTestUtils.js";

describe("Short-Reel HTTP Routes and Confirmation Discrimination", () => {
  it("returns 404 for non-existent topic ID", async () => {
    const root = await createTestRoot();
    const app = await buildTestApp(root);

    try {
      const channel = await createTestChannel(app, "Missing Topic Channel");

      const response = await app.server.inject({
        method: "POST",
        url: `/api/channels/${channel.channel_id}/topics/non-existent-topic-id/confirm`,
        payload: { question_count: 1 },
      });

      expect(response.statusCode).toBe(404);
    } finally {
      await app.close();
    }
  });

  it("rejects invalid question_count for Short-Reel topic with 400 Bad Request", async () => {
    const root = await createTestRoot();
    const app = await buildTestApp(root);

    try {
      const channel = await createTestChannel(app, "Conflicting Count Channel");

      const shortReelTopic = await seedTopicRunWithReel({
        app,
        channelId: channel.channel_id,
        reelTopicId: "topic-reel-count-conflict",
      });

      // Attempt sending question_count: 5 to a Short-Reel candidate
      const response = await app.server.inject({
        method: "POST",
        url: `/api/channels/${channel.channel_id}/topics/${shortReelTopic.topic_id}/confirm`,
        payload: { question_count: 5 },
      });

      expect(response.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  });

  describe("HTTP-01 through HTTP-05: Phase 06 Endpoint Behaviors", () => {
    it("HTTP-06d: direct handler execution errors map to typed status codes without TaskManager", async () => {
      const root = await createTestRoot();
      const app = await buildTestApp(root);

      try {
        const { channel, reel } = await createTestReel(app);

        // Standalone server with routes registered WITHOUT TaskManager
        const standalone = Fastify();
        await standalone.register(
          registerShortReelsRoutes({
            repository: app.repository,
            logger: app.logger,
          }),
        );

        // Case 1: Channel has no mascot -> resolveReelReferences throws ReferenceError("MISSING_REFERENCE") -> 422
        const resMissingRef = await standalone.inject({
          method: "POST",
          url: `/api/channels/${channel.channel_id}/short-reels/${reel.reel_id}/generate`,
          payload: {
            expected_revision: reel.revision,
            request_id: "direct-ref-missing",
            target: "references",
          },
        });
        expect(resMissingRef.statusCode).toBe(422);
        const missingBody = resMissingRef.json<{ code: string; error?: string }>();
        expect(missingBody.code).toBe("MISSING_REFERENCE");
        expect(missingBody.error).toBeDefined();

        // Case 2: Channel has invalid mascot ID -> resolveReelReferences throws ReferenceError("INVALID_REFERENCE_PATH") -> 400
        await app.repository.updateChannel(channel.channel_id, { mascot_id: "invalid@mascot!id" });
        const reelAfterCase1 = await app.repository.getShortReel({ channel_id: channel.channel_id, reel_id: reel.reel_id });
        const resInvalidPath = await standalone.inject({
          method: "POST",
          url: `/api/channels/${channel.channel_id}/short-reels/${reel.reel_id}/generate`,
          payload: {
            expected_revision: reelAfterCase1.revision,
            request_id: "direct-ref-invalid",
            target: "references",
          },
        });
        expect(resInvalidPath.statusCode).toBe(400);
        const invalidBody = resInvalidPath.json<{ code: string }>();
        expect(invalidBody.code).toBe("INVALID_REFERENCE_PATH");

        // Case 3: Cover generation without provider -> CoverGenerationError("PROVIDER_ERROR") -> 503
        const reelAfterCase2 = await app.repository.getShortReel({ channel_id: channel.channel_id, reel_id: reel.reel_id });
        const resCoverProviderErr = await standalone.inject({
          method: "POST",
          url: `/api/channels/${channel.channel_id}/short-reels/${reel.reel_id}/generate`,
          payload: {
            expected_revision: reelAfterCase2.revision,
            request_id: "direct-cover-err",
            target: "cover",
          },
        });
        expect(resCoverProviderErr.statusCode).toBe(503);
        const coverErrBody = resCoverProviderErr.json<{ code: string }>();
        expect(coverErrBody.code).toBe("PROVIDER_ERROR");

        await standalone.close();
      } finally {
        await app.close();
      }
    });
  });
});
