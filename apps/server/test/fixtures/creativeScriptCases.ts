import { expect, it } from "vitest";
import type { IntroOutroScriptJob, IntroOutroScriptProject, IntroOutroScriptRevision } from "@studio/shared";
import type { StudioApp } from "../../src/app.js";
import type { FakeGeminiFlashClient } from "./introOutroScriptClient.js";

type Context = { app: StudioApp; channelId: string; client: FakeGeminiFlashClient };
type Wait = (app: StudioApp, channelId: string, jobId: string) => Promise<IntroOutroScriptJob>;

export function registerCreativeScriptCases(getContext: () => Context, wait: Wait) {
  it("preserves creative speech, score and timing through generation, approval and export despite editorial warnings", async () => {
    const { app, channelId, client } = getContext();
    const base = `/api/channels/${channelId}/intro-outro-scripts`;
    const created = await app.server.inject({
      method: "POST",
      url: base,
      payload: { style_preset_id: "preset_arcade_classic", name: "Creative performance" },
    });
    let project = created.json<{ project: IntroOutroScriptProject }>().project;
    client.creativePerformance = true;
    const calls = client.generationPrompts.length;
    try {
      const started = await app.server.inject({
        method: "POST",
        url: `${base}/${project.project_id}/generate`,
        payload: {
          expected_version: project.version,
          idempotency_key: "creative-performance",
          clips: ["intro", "outro"].map((clip_kind) => ({ clip_kind, duration_seconds: 8, randomization_seed: `creative-${clip_kind}` })),
        },
      });
      expect(started.statusCode).toBe(202);
      const job = await wait(app, channelId, started.json<{ job: IntroOutroScriptJob }>().job.job_id);
      expect(job.status).toBe("succeeded");
      expect(client.generationPrompts.length - calls).toBe(2);
      expect(client.generationPrompts.slice(calls).join("\n")).toContain('"variation_seed":"creative-intro"');
      project = (await app.server.inject({ method: "GET", url: `${base}/${project.project_id}` })).json<{
        project: IntroOutroScriptProject;
      }>().project;
      const response = await app.server.inject({ method: "GET", url: `${base}/${project.project_id}/revisions` });
      const revisions = response.json<{ revisions: IntroOutroScriptRevision[] }>().revisions;
      expect(revisions).toHaveLength(2);
      expect(revisions[0].content.audio.music_direction).not.toBe(revisions[1].content.audio.music_direction);
      for (const revision of revisions) {
        expect(revision.content.voiceover.lines).toHaveLength(2);
        expect(revision.content.voiceover.lines[0].text).toBe("Uh-oh...");
        expect(revision.content.timeline[0].end_seconds).toBe(1.6);
        expect(revision.content.audio.events).toHaveLength(8);
        expect(revision.content.audio.events[7].at_seconds).toBe(7.85);
        expect(revision.content.production_directions?.end_hold_seconds).toBe(0);
        expect(revision.validation_issues.some((issue) => issue.severity === "warning")).toBe(true);
        const approved = await app.server.inject({
          method: "POST",
          url: `${base}/${project.project_id}/approve`,
          payload: {
            revision_id: revision.revision_id,
            expected_version: project.version,
          },
        });
        expect(approved.statusCode).toBe(200);
        project = approved.json<{ project: IntroOutroScriptProject }>().project;
        const exported = await app.server.inject({
          method: "GET",
          url: `${base}/${project.project_id}/revisions/${revision.revision_id}/export`,
        });
        expect(exported.statusCode).toBe(200);
        const prompt = exported.json<{ prompt: string }>().prompt;
        expect(prompt).toContain(revision.content.timeline[2].action);
        expect(prompt).toContain(revision.content.audio.music_direction);
        expect(prompt).toContain("No mandatory final hold");
        expect(prompt).not.toContain("One mascot only");
        expect(prompt).not.toContain("briefly hush for the comedy reaction");
        expect(prompt).not.toContain("Keep the intended end-screen area readable");
        expect(prompt).not.toContain("to accommodate YouTube end-screen cards");
      }
    } finally {
      client.creativePerformance = false;
    }
  });
}
