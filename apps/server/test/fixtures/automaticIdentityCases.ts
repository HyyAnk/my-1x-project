import { expect, it, vi } from "vitest";
import type { StudioApp } from "../../src/app.js";
import type { IntroOutroScriptJob, IntroOutroScriptProject, MascotStyleIdentityProfile } from "@studio/shared";
import type { FakeGeminiFlashClient } from "./introOutroScriptClient.js";
import { createTestImageBuffer } from "../channelAssetsTestHelpers.js";

type Context = { app: StudioApp; client: FakeGeminiFlashClient };
type Wait = (app: StudioApp, channelId: string, jobId: string) => Promise<IntroOutroScriptJob>;
async function setup({ app }: Context) {
  const channel = await app.repository.createChannel({ name: "Automatic Identity" });
  let mascot = await app.repository.saveMascot({ name: "Auto Mascot", description: "Test mascot" });
  const image = await app.repository.saveMascotAsset(mascot.id, "auto.png", await createTestImageBuffer(512, 512));
  mascot = await app.repository.saveMascot({
    ...mascot,
    styles: mascot.styles?.map((style, index) => ({
      ...style,
      built_in_preset_id: index === 0 ? "preset_arcade_classic" : style.built_in_preset_id,
      anchor_image_url: image,
      style_revision: 1,
    })),
  });
  await app.repository.assignMascotToChannel(channel.channel_id, mascot.id);
  return { channelId: channel.channel_id, mascot };
}
async function start(app: StudioApp, channelId: string, key: string, auto = true) {
  const created = await app.server.inject({
    method: "POST",
    url: `/api/channels/${channelId}/intro-outro-scripts`,
    payload: { style_preset_id: "preset_arcade_classic", name: key },
  });
  const project = created.json<{ project: IntroOutroScriptProject }>().project;
  const response = await app.server.inject({
    method: "POST",
    url: `/api/channels/${channelId}/intro-outro-scripts/${project.project_id}/generate`,
    payload: {
      expected_version: project.version,
      auto_identity: auto,
      idempotency_key: key,
      clips: [{ clip_kind: "intro", duration_seconds: 8, randomization_seed: key }],
    },
  });
  expect(response.statusCode).toBe(202);
  return response.json<{ job: IntroOutroScriptJob }>().job;
}
export function registerAutomaticIdentityCases(getContext: () => Context, wait: Wait) {
  it("analyzes first use automatically, reuses cached identity and explicitly refreshes it", async () => {
    const context = getContext();
    const { app, client } = context;
    const { channelId, mascot } = await setup(context);
    const initial = client.identityCalls;
    for (const [key, auto, calls] of [
      ["first", true, 1],
      ["reuse", true, 1],
      ["force", false, 2],
    ] as const) {
      const job = await start(app, channelId, key, auto);
      expect((await wait(app, channelId, job.job_id)).status).toBe("succeeded");
      expect(client.identityCalls - initial).toBe(calls);
    }
    const response = await app.server.inject({
      method: "GET",
      url: `/api/channels/${channelId}/intro-outro-context?style_preset_id=preset_arcade_classic`,
    });
    const identity = response.json<{ identity: MascotStyleIdentityProfile }>().identity;
    expect(identity.status).toBe("ready");
    expect(identity.reviewed_at).toBeNull();
    await app.repository.saveMascot({ ...mascot, styles: mascot.styles?.map((style) => ({ ...style, style_revision: 2 })) });
    const stale = await start(app, channelId, "stale");
    expect((await wait(app, channelId, stale.job_id)).status).toBe("succeeded");
    expect(client.identityCalls - initial).toBe(3);
  });

  it("coalesces concurrent first-use analysis and recovers after an analysis failure", async () => {
    const context = getContext();
    const { app, client } = context;
    const { channelId } = await setup(context);
    client.identityFailure = true;
    try {
      const job = await start(app, channelId, "analysis-fail");
      expect((await wait(app, channelId, job.job_id)).status).toBe("failed");
    } finally {
      client.identityFailure = false;
    }
    const calls = client.identityCalls;
    const jobs = await Promise.all([start(app, channelId, "concurrent-one"), start(app, channelId, "concurrent-two")]);
    const results = await Promise.all(jobs.map((job) => wait(app, channelId, job.job_id)));
    expect(results.map((job) => job.status)).toEqual(["succeeded", "succeeded"]);
    expect(client.identityCalls - calls).toBe(1);
  });

  it("keeps manual prompt drafts across reopen and preserves failed-clip text", async () => {
    const context = getContext();
    const { app, client } = context;
    const { channelId } = await setup(context);
    const url = `/api/channels/${channelId}/intro-outro-pair-workspace`;
    const open = () => app.server.inject({ method: "POST", url, payload: { style_preset_id: "preset_arcade_classic" } });
    const opened = await Promise.all([open(), open()]);
    let project = opened[0].json<{ project: IntroOutroScriptProject }>().project;
    expect(opened[1].json<{ project: IntroOutroScriptProject }>().project.project_id).toBe(project.project_id);
    const base = `/api/channels/${channelId}/intro-outro-scripts/${project.project_id}`;
    const saved = await app.server.inject({
      method: "PATCH",
      url: base,
      payload: { expected_version: project.version, drafts: { intro: { prompt_text: "My intro" }, outro: { prompt_text: "My outro" } } },
    });
    project = saved.json<{ project: IntroOutroScriptProject }>().project;
    expect((await open()).json<{ project: IntroOutroScriptProject }>().project.drafts.intro.prompt_text).toBe("My intro");
    client.failOutro = true;
    try {
      const started = await app.server.inject({
        method: "POST",
        url: `${base}/generate`,
        payload: {
          expected_version: project.version,
          idempotency_key: "manual-partial",
          clips: ["intro", "outro"].map((clip_kind) => ({ clip_kind, duration_seconds: 8, randomization_seed: "manual" })),
        },
      });
      expect((await wait(app, channelId, started.json<{ job: IntroOutroScriptJob }>().job.job_id)).status).toBe("partial");
      const final = (await open()).json<{ project: IntroOutroScriptProject }>().project;
      expect(final.drafts.intro.prompt_text).toContain("REFERENCE ASSETS");
      expect(final.drafts.outro.prompt_text).toBe("My outro");
    } finally {
      client.failOutro = false;
    }
  });

  it.each(["cancel", "change"] as const)("does not cache analysis after %s during the provider call", async (operation) => {
    const context = getContext();
    const { app, client } = context;
    const { channelId, mascot } = await setup(context);
    let release: () => void = () => undefined;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const entered = vi.fn();
    client.identityGate = async () => {
      entered();
      await pending;
    };
    try {
      const job = await start(app, channelId, `analysis-${operation}`);
      await vi.waitFor(() => expect(entered).toHaveBeenCalledOnce());
      if (operation === "cancel")
        await app.server.inject({ method: "POST", url: `/api/channels/${channelId}/intro-outro-script-jobs/${job.job_id}/cancel` });
      else await app.repository.saveMascot({ ...mascot, styles: mascot.styles?.map((style) => ({ ...style, style_revision: 2 })) });
      release();
      expect((await wait(app, channelId, job.job_id)).status).toBe(operation === "cancel" ? "cancelled" : "failed");
      await new Promise((resolve) => setTimeout(resolve, 60));
      const response = await app.server.inject({
        method: "GET",
        url: `/api/channels/${channelId}/intro-outro-context?style_preset_id=preset_arcade_classic`,
      });
      expect(response.json<{ identity: MascotStyleIdentityProfile | null }>().identity).toBeNull();
    } finally {
      release();
      client.identityGate = undefined;
    }
  });
}
