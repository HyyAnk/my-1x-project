import { expect, it, vi } from "vitest";
import type { IntroOutroScriptJob, IntroOutroScriptProject, IntroOutroScriptRevision } from "@studio/shared";
import type { StudioApp } from "../../src/app.js";
import type { FakeGeminiFlashClient } from "./introOutroScriptClient.js";

type Context = { app: StudioApp; channelId: string; client: FakeGeminiFlashClient };
type WaitForJob = (app: StudioApp, channelId: string, jobId: string) => Promise<IntroOutroScriptJob>;

async function createProject({ app, channelId }: Context) {
  const response = await app.server.inject({
    method: "POST",
    url: `/api/channels/${channelId}/intro-outro-scripts`,
    payload: { style_preset_id: "preset_arcade_classic", name: "Single Pass Checks" },
  });
  expect(response.statusCode).toBe(201);
  return response.json<{ project: IntroOutroScriptProject }>().project;
}

async function generate(context: Context, project: IntroOutroScriptProject, kinds: Array<"intro" | "outro">, key: string) {
  const response = await context.app.server.inject({
    method: "POST",
    url: `/api/channels/${context.channelId}/intro-outro-scripts/${project.project_id}/generate`,
    payload: {
      expected_version: project.version,
      idempotency_key: key,
      clips: kinds.map((kind) => ({ clip_kind: kind, duration_seconds: kind === "intro" ? 6 : 10, randomization_seed: "stable" })),
    },
  });
  expect(response.statusCode).toBe(202);
  return response.json<{ job: IntroOutroScriptJob }>().job;
}

export function registerSinglePassScriptCases(getContext: () => Context, waitForJob: WaitForJob): void {
  it.each(["error", "timeout", "reference"] as const)("reports provider %s without retrying the request", async (failure) => {
    const context = getContext();
    const { app, channelId, client } = context;
    const project = await createProject(context);
    const calls = client.generationPrompts.length;
    client.generationFailure = failure;
    try {
      const started = await generate(context, project, ["intro", "outro"], `provider-${failure}`);
      const result = await waitForJob(app, channelId, started.job_id);
      expect(result.status).toBe("failed");
      expect(result.result_revision_ids).toEqual([]);
      expect(result.failed_clip_kinds).toEqual(["intro", "outro"]);
      expect(result.clip_errors).toHaveLength(2);
      expect(client.generationPrompts.length - calls).toBe(2);
      expect(client.reviewCalls).toBe(0);
    } finally {
      client.generationFailure = "none";
    }
  });

  it("retries only the failed clip and preserves the pair anchor across different durations", async () => {
    const context = getContext();
    const { app, channelId, client } = context;
    const project = await createProject(context);
    const base = `/api/channels/${channelId}/intro-outro-scripts/${project.project_id}`;
    const calls = client.generationPrompts.length;
    client.failOutro = true;
    try {
      const started = await generate(context, project, ["intro", "outro"], "partial-retry-start");
      expect((await waitForJob(app, channelId, started.job_id)).status).toBe("partial");
    } finally {
      client.failOutro = false;
    }
    const saved = (await app.server.inject({ method: "GET", url: base })).json<{ project: IntroOutroScriptProject }>().project;
    const retried = await generate(context, saved, ["outro"], "partial-retry-finish");
    expect((await waitForJob(app, channelId, retried.job_id)).status).toBe("succeeded");
    const final = (await app.server.inject({ method: "GET", url: base })).json<{ project: IntroOutroScriptProject }>().project;
    expect(client.generationPrompts.length - calls).toBe(3);
    expect(final.drafts.intro.source_revision_id).toBe(saved.drafts.intro.source_revision_id);
    expect(final.drafts.outro.content?.style).toEqual(saved.drafts.intro.content?.style);
    expect(final.drafts.outro.content?.audio.music_direction).toBe(saved.drafts.intro.content?.audio.music_direction);
    expect(final.drafts.intro.content?.timeline[2].end_seconds).toBe(6);
    expect(final.drafts.outro.content?.timeline[2].end_seconds).toBe(10);
  });

  it.each(["cancel", "edit"] as const)("handles %s while independent AI calls are pending", async (operation) => {
    const context = getContext();
    const { app, channelId, client } = context;
    const project = await createProject(context);
    const base = `/api/channels/${channelId}/intro-outro-scripts/${project.project_id}`;
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const entered = vi.fn();
    client.generationGate = async () => {
      entered();
      await gate;
    };
    try {
      const started = await generate(context, project, ["intro", "outro"], `pending-${operation}`);
      await vi.waitFor(() => expect(entered).toHaveBeenCalledTimes(2));
      if (operation === "cancel") {
        const cancelled = await app.server.inject({
          method: "POST",
          url: `/api/channels/${channelId}/intro-outro-script-jobs/${started.job_id}/cancel`,
        });
        expect(cancelled.json<{ job: IntroOutroScriptJob }>().job.status).toBe("cancelled");
      } else {
        const edited = await app.server.inject({
          method: "PATCH",
          url: base,
          payload: { expected_version: project.version, name: "Preserved edit" },
        });
        expect(edited.statusCode).toBe(200);
      }
      release();
      const terminal = await waitForJob(app, channelId, started.job_id);
      expect(terminal.status).toBe(operation === "cancel" ? "cancelled" : "succeeded");
      // Allow a late provider result to settle before checking persistence.
      await new Promise((resolve) => setTimeout(resolve, 60));
      const revisions = (await app.server.inject({ method: "GET", url: `${base}/revisions` })).json<{
        revisions: IntroOutroScriptRevision[];
      }>().revisions;
      const final = (await app.server.inject({ method: "GET", url: base })).json<{ project: IntroOutroScriptProject }>().project;
      expect(revisions).toHaveLength(operation === "cancel" ? 0 : 2);
      expect(final.drafts.intro.content).toBeNull();
      expect(final.drafts.outro.content).toBeNull();
      if (operation === "edit") expect(final.name).toBe("Preserved edit");
    } finally {
      release();
      client.generationGate = undefined;
    }
  });

  it("retains the outro when the intro fails local validation", async () => {
    const context = getContext();
    const { app, channelId, client } = context;
    const project = await createProject(context);
    client.invalidIntro = true;
    try {
      const started = await generate(context, project, ["intro", "outro"], "invalid-intro-valid-outro");
      const final = await waitForJob(app, channelId, started.job_id);
      expect(final.status).toBe("partial");
      expect(final.failed_clip_kinds).toEqual(["intro"]);
      expect(final.result_revision_ids).toHaveLength(1);
    } finally {
      client.invalidIntro = false;
    }
  });
}
