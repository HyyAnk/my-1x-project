import { expect, it, vi } from "vitest";
import type { IntroOutroScriptJob, IntroOutroScriptProject } from "@studio/shared";
import type { StudioApp } from "../../src/app.js";
import type { FakeGeminiFlashClient } from "./introOutroScriptClient.js";

type Context = { app: StudioApp; channelId: string; client: FakeGeminiFlashClient };
type Wait = (app: StudioApp, channelId: string, jobId: string) => Promise<IntroOutroScriptJob>;

export function registerIndependentScriptCases(getContext: () => Context, waitForJob: Wait) {
  it.each(["finish", "cancel"] as const)("publishes the fast clip before its sibling and handles %s", async (operation) => {
    const { app, channelId, client } = getContext();
    const base = `/api/channels/${channelId}/intro-outro-scripts`;
    const created = await app.server.inject({
      method: "POST",
      url: base,
      payload: { style_preset_id: "preset_arcade_classic", name: "Independent clips" },
    });
    const project = created.json<{ project: IntroOutroScriptProject }>().project;
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const entered: string[] = [];
    client.generationGate = async (prompt) => {
      const clips = JSON.parse(prompt.split("STRUCTURE AND SEED MATRIX\n")[1].split("\n\nCHANNEL")[0]) as Array<{ kind: string }>;
      expect(clips).toHaveLength(1);
      entered.push(clips[0].kind);
      if (clips[0].kind === "intro") await gate;
    };
    try {
      const started = await app.server.inject({
        method: "POST",
        url: `${base}/${project.project_id}/generate`,
        payload: {
          expected_version: project.version,
          idempotency_key: `independent-${operation}`,
          clips: ["intro", "outro"].map((kind) => ({ clip_kind: kind, duration_seconds: 8, randomization_seed: kind })),
        },
      });
      const job = started.json<{ job: IntroOutroScriptJob }>().job;
      const jobUrl = `/api/channels/${channelId}/intro-outro-script-jobs/${job.job_id}`;
      await vi.waitFor(() => expect(entered.sort()).toEqual(["intro", "outro"]));
      await vi.waitFor(async () => {
        const running = (await app.server.inject({ method: "GET", url: jobUrl })).json<{ job: IntroOutroScriptJob }>().job;
        expect(running.status).toBe("running");
        expect(running.result_revision_ids).toHaveLength(1);
      });
      const partial = (await app.server.inject({ method: "GET", url: `${base}/${project.project_id}` })).json<{
        project: IntroOutroScriptProject;
      }>().project;
      expect(partial.drafts.outro.content).not.toBeNull();
      expect(partial.drafts.intro.content).toBeNull();
      if (operation === "cancel") {
        const cancelled = (await app.server.inject({ method: "POST", url: `${jobUrl}/cancel` })).json<{ job: IntroOutroScriptJob }>().job;
        expect(cancelled.result_revision_ids).toHaveLength(1);
      }
      release();
      const terminal = await waitForJob(app, channelId, job.job_id);
      expect(terminal.status).toBe(operation === "cancel" ? "cancelled" : "succeeded");
      const final = (await app.server.inject({ method: "GET", url: `${base}/${project.project_id}` })).json<{
        project: IntroOutroScriptProject;
      }>().project;
      expect(final.drafts.outro.source_revision_id).toBe(partial.drafts.outro.source_revision_id);
      if (operation === "finish") {
        expect(final.drafts.intro.content?.style).toEqual(final.drafts.outro.content?.style);
        expect(final.drafts.intro.content?.audio.music_direction).toBe(final.drafts.outro.content?.audio.music_direction);
      } else expect(final.drafts.intro.content).toBeNull();
    } finally {
      release();
      client.generationGate = undefined;
    }
  });
}
