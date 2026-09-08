import { describe, expect, it } from "vitest";
import type { CancelShortReelResponse, GenerateShortReelResponse } from "@studio/shared";
import {
  attachMascotWithStyle,
  beginUnitAttempt,
  buildTestApp,
  createTestReel,
  createTestRoot,
  installStubCoverProvider,
  waitForTaskCompletion,
} from "./shortReelRoutesTestUtils.js";

describe("Short-Reel HTTP Routes and Confirmation Discrimination", () => {
  describe("HTTP-01 through HTTP-05: Phase 06 Endpoint Behaviors", () => {
    it("HTTP-05: POST cancel acknowledges cancellation and terminal state is updated", async () => {
      const root = await createTestRoot();
      const app = await buildTestApp(root);

      try {
        const { channel, reel } = await createTestReel(app);

        // Begin a unit attempt
        await beginUnitAttempt(app, { channel_id: channel.channel_id, reel_id: reel.reel_id }, "cover", "op-cancel-test");

        // Verify pending
        const before = await app.repository.getShortReel({ channel_id: channel.channel_id, reel_id: reel.reel_id });
        expect(before.units.cover.state).toBe("pending");

        // Submit and simulate a running task with AbortController
        const task = app.tasks.submit(
          "GENERATE_SHORT_REEL_PACKAGE",
          channel.channel_id,
          null,
          undefined,
          undefined,
          "op-cancel-test",
          reel.reel_id,
        );
        await app.tasks.update(task.task_id, { status: "RUNNING" });
        const abortCtrl = new AbortController();
        app.tasks.activeShortReelControllers.set(task.task_id, abortCtrl);

        // Call cancel route
        const cancelRes = await app.server.inject({
          method: "POST",
          url: `/api/channels/${channel.channel_id}/short-reels/${reel.reel_id}/cancel`,
          payload: {
            operation_id: "op-cancel-test",
            request_id: "cancel-req-001",
          },
        });

        expect(cancelRes.statusCode).toBe(200);
        const body = cancelRes.json<CancelShortReelResponse>();
        expect(body.acknowledged).toBe(true);
        expect(body.task).toBeDefined();
        expect(body.task?.status).toBe("CANCELLED");
        expect(body.short_reel.units.cover.state).toBe("cancelled");
        expect(abortCtrl.signal.aborted).toBe(true);
        expect(app.tasks.get(task.task_id).status).toBe("CANCELLED");
      } finally {
        await app.close();
      }
    });

    it("HTTP-05b: POST cancel with the task ID cancels its running task and pending units", async () => {
      const root = await createTestRoot();
      const app = await buildTestApp(root);

      try {
        const { channel, reel } = await createTestReel(app);

        await beginUnitAttempt(app, { channel_id: channel.channel_id, reel_id: reel.reel_id }, "script", "op-unit-internal-99");

        const task = app.tasks.submit(
          "GENERATE_SHORT_REEL_PACKAGE",
          channel.channel_id,
          null,
          undefined,
          undefined,
          "gen-req-99",
          reel.reel_id,
        );
        await app.tasks.update(task.task_id, { status: "RUNNING" });
        const abortCtrl = new AbortController();
        app.tasks.activeShortReelControllers.set(task.task_id, abortCtrl);

        const cancelRes = await app.server.inject({
          method: "POST",
          url: `/api/channels/${channel.channel_id}/short-reels/${reel.reel_id}/cancel`,
          payload: {
            operation_id: task.task_id,
            request_id: "cancel-req-002",
          },
        });

        expect(cancelRes.statusCode).toBe(200);
        const body = cancelRes.json<CancelShortReelResponse>();
        expect(body.acknowledged).toBe(true);
        expect(body.task?.status).toBe("CANCELLED");
        expect(body.short_reel.units.script.state).toBe("cancelled");
        expect(abortCtrl.signal.aborted).toBe(true);
      } finally {
        await app.close();
      }
    });

    it("HTTP-05d: an unrelated operation ID cannot cancel a running reel task or sibling unit", async () => {
      const root = await createTestRoot();
      const app = await buildTestApp(root);

      try {
        const { channel, reel } = await createTestReel(app);
        await beginUnitAttempt(app, { channel_id: channel.channel_id, reel_id: reel.reel_id }, "script", "owned-operation");
        const task = app.tasks.submit(
          "GENERATE_SHORT_REEL_PACKAGE",
          channel.channel_id,
          null,
          undefined,
          undefined,
          "owned-request",
          reel.reel_id,
        );
        await app.tasks.update(task.task_id, { status: "RUNNING" });

        const response = await app.server.inject({
          method: "POST",
          url: `/api/channels/${channel.channel_id}/short-reels/${reel.reel_id}/cancel`,
          payload: { operation_id: "unrelated-operation", request_id: "cancel-unrelated" },
        });

        expect(response.statusCode).toBe(200);
        expect(response.json<CancelShortReelResponse>().acknowledged).toBe(false);
        expect(app.tasks.get(task.task_id).status).toBe("RUNNING");
        const unchanged = await app.repository.getShortReel({ channel_id: channel.channel_id, reel_id: reel.reel_id });
        expect(unchanged.units.script.state).toBe("pending");
        await app.tasks.cancel(task.task_id);
      } finally {
        await app.close();
      }
    });

    it("HTTP-05c: Task runner aborts and respects CANCELLED status without completing", async () => {
      const root = await createTestRoot();
      const app = await buildTestApp(root);

      try {
        const { channel, reel } = await createTestReel(app);
        const task = app.tasks.submit(
          "GENERATE_SHORT_REEL_PACKAGE",
          channel.channel_id,
          null,
          undefined,
          undefined,
          "gen-req-100",
          reel.reel_id,
        );

        // Cancel the task immediately
        await app.tasks.cancel(task.task_id);
        expect(app.tasks.get(task.task_id).status).toBe("CANCELLED");

        // Running a cancelled task should not overwrite CANCELLED status
        await app.tasks.run(app.tasks.get(task.task_id));
        expect(app.tasks.get(task.task_id).status).toBe("CANCELLED");
        expect(app.tasks.activeShortReelControllers.has(task.task_id)).toBe(false);
      } finally {
        await app.close();
      }
    });

    it("HTTP-06a: POST /generate with target: 'cover' regenerates cover specifically even if previously ready", async () => {
      const root = await createTestRoot();
      const app = await buildTestApp(root);

      try {
        const { channel, reel } = await createTestReel(app);

        // Setup mascot and cover provider
        await attachMascotWithStyle(app, channel.channel_id, "Cover Test Mascot");
        await installStubCoverProvider(app, root, "cover-test-provider.png");

        // 1. First cover generation
        const gen1 = await app.server.inject({
          method: "POST",
          url: `/api/channels/${channel.channel_id}/short-reels/${reel.reel_id}/generate`,
          payload: {
            expected_revision: reel.revision,
            request_id: "gen-cover-req-1",
            target: "cover",
          },
        });
        expect(gen1.statusCode).toBe(202);
        const taskId1 = gen1.json<GenerateShortReelResponse>().task.task_id;
        await waitForTaskCompletion(app.tasks, taskId1);
        expect(app.tasks.get(taskId1).status).toBe("COMPLETED");

        const reelAfterFirst = await app.repository.getShortReel({ channel_id: channel.channel_id, reel_id: reel.reel_id });
        expect(reelAfterFirst.units.cover.state).toBe("ready");
        expect(reelAfterFirst.units.cover.last_accepted_payload).toBeDefined();
        expect(reelAfterFirst.units.references.state).toBe("missing");
        expect(reelAfterFirst.units.script.state).toBe("missing");
        expect(reelAfterFirst.units.publishing.state).toBe("missing");

        // 2. Regenerate cover specifically even though it is already ready
        const gen2 = await app.server.inject({
          method: "POST",
          url: `/api/channels/${channel.channel_id}/short-reels/${reel.reel_id}/generate`,
          payload: {
            expected_revision: reelAfterFirst.revision,
            request_id: "gen-cover-req-2",
            target: "cover",
          },
        });
        expect(gen2.statusCode).toBe(202);
        const taskId2 = gen2.json<GenerateShortReelResponse>().task.task_id;
        await waitForTaskCompletion(app.tasks, taskId2);
        expect(app.tasks.get(taskId2).status).toBe("COMPLETED");

        const reelAfterSecond = await app.repository.getShortReel({ channel_id: channel.channel_id, reel_id: reel.reel_id });
        expect(reelAfterSecond.units.cover.state).toBe("ready");
        expect(reelAfterSecond.units.cover.last_accepted_payload).toBeDefined();
        expect(reelAfterSecond.revision).toBeGreaterThan(reelAfterFirst.revision);
        // Ensure other units remained untouched
        expect(reelAfterSecond.units.references.state).toBe("missing");
        expect(reelAfterSecond.units.script.state).toBe("missing");
        expect(reelAfterSecond.units.publishing.state).toBe("missing");
      } finally {
        await app.close();
      }
    });

    it("HTTP-06b: POST /generate with target: 'references' resolves references specifically", async () => {
      const root = await createTestRoot();
      const app = await buildTestApp(root);

      try {
        const { channel, reel } = await createTestReel(app);

        // Setup mascot
        await attachMascotWithStyle(app, channel.channel_id, "References Mascot");

        const gen = await app.server.inject({
          method: "POST",
          url: `/api/channels/${channel.channel_id}/short-reels/${reel.reel_id}/generate`,
          payload: {
            expected_revision: reel.revision,
            request_id: "gen-ref-001",
            target: "references",
          },
        });
        expect(gen.statusCode).toBe(202);
        const taskId = gen.json<GenerateShortReelResponse>().task.task_id;
        await waitForTaskCompletion(app.tasks, taskId);
        expect(app.tasks.get(taskId).status).toBe("COMPLETED");

        const reloaded = await app.repository.getShortReel({ channel_id: channel.channel_id, reel_id: reel.reel_id });
        expect(reloaded.units.references.state).toBe("ready");
        expect(reloaded.units.references.last_accepted_payload?.references.length).toBeGreaterThan(0);
        expect(reloaded.units.script.state).toBe("missing");
        expect(reloaded.units.cover.state).toBe("missing");
        expect(reloaded.units.publishing.state).toBe("missing");
      } finally {
        await app.close();
      }
    });

    it("HTTP-06c: POST /generate with target: 'publishing' generates publishing specifically", async () => {
      const root = await createTestRoot();
      const app = await buildTestApp(root);

      try {
        const { channel, reel } = await createTestReel(app);

        (app.tasks as { codex?: unknown }).codex = {
          connect: () => Promise.resolve(),
          generateContent: () =>
            Promise.resolve(
              JSON.stringify({
                hook: "Hook test",
                description: "Desc test",
                cta: "Comment below!",
                hashtags: ["#Shorts", "#Trivia"],
              }),
            ),
        };

        const gen = await app.server.inject({
          method: "POST",
          url: `/api/channels/${channel.channel_id}/short-reels/${reel.reel_id}/generate`,
          payload: {
            expected_revision: reel.revision,
            request_id: "gen-pub-001",
            target: "publishing",
          },
        });
        expect(gen.statusCode).toBe(202);
        const taskId = gen.json<GenerateShortReelResponse>().task.task_id;
        await waitForTaskCompletion(app.tasks, taskId);
        expect(app.tasks.get(taskId).status).toBe("COMPLETED");

        const reloaded = await app.repository.getShortReel({ channel_id: channel.channel_id, reel_id: reel.reel_id });
        expect(reloaded.units.publishing.state).toBe("ready");
        expect(reloaded.units.publishing.last_accepted_payload?.hook).toBe("Hook test");
        expect(reloaded.units.script.state).toBe("missing");
        expect(reloaded.units.references.state).toBe("missing");
        expect(reloaded.units.cover.state).toBe("missing");
      } finally {
        await app.close();
      }
    });
  });
});
