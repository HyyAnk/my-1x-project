import type { Page } from "@playwright/test";
import { IntroOutroScriptProjectSchema, IntroOutroScriptJobSchema, IntroOutroStyleSchema } from "@studio/shared";
import type { PairGenerationRequest } from "../../src/features/channel/pairWorkspace/pairWorkspace.types";

const now = "2026-09-25T00:00:00.000Z";
export async function mockPairWorkspace(page: Page) {
  let project = IntroOutroScriptProjectSchema.parse({
    schema_version: 1,
    project_id: "workspace",
    channel_id: "channel",
    style_preset_id: "preset_arcade_classic",
    name: "New Pair",
    version: 1,
    purpose: "pair_workspace",
    drafts: { intro: { clip_kind: "intro", updated_at: now }, outro: { clip_kind: "outro", updated_at: now } },
    revision_ids: [],
    approved_revision_ids: { intro: null, outro: null },
    created_at: now,
    updated_at: now,
  });
  let job: ReturnType<typeof IntroOutroScriptJobSchema.parse> | null = null;
  const state = {
    requests: [] as PairGenerationRequest[],
    failed: false,
    pollFailures: 0,
    saveFailures: 0,
    uploadFailures: 0,
    hold: false,
    partialReady: false,
    uploads: [] as Record<string, unknown>[],
  };
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith("/api/")) return route.continue();
    const payload = route.request().postDataJSON() as Record<string, unknown> | null;
    const send = (body: unknown) => route.fulfill({ json: body });
    if (path.endsWith("intro-outro-resources"))
      return send({
        resources: [
          { kind: "mascot", preview_url: null, transparent_url: null },
          { kind: "logo", preview_url: null, transparent_url: null },
        ],
      });
    if (path.endsWith("intro-outro-pair-workspace")) return send({ project, job });
    if (path.endsWith("/generate")) {
      const request = payload as unknown as PairGenerationRequest;
      state.requests.push(request);
      job = IntroOutroScriptJobSchema.parse({
        schema_version: 1,
        job_id: `job-${state.requests.length}`,
        channel_id: "channel",
        project_id: project.project_id,
        type: "script_generation",
        requested_clip_kinds: request.clips.map((clip) => clip.clip_kind),
        status: "running",
        step: request.auto_identity ? "Generating scripts" : "Analyzing identity",
        submitted_project_version: project.version,
        idempotency_key: request.idempotency_key,
        error_code: null,
        error_message: null,
        created_at: now,
        started_at: now,
        completed_at: null,
      });
      return send({ job });
    }
    if (path.includes("intro-outro-script-jobs")) {
      if (job?.status === "running" && state.partialReady && job.result_revision_ids.length === 0) {
        project = {
          ...project,
          version: project.version + 1,
          drafts: {
            ...project.drafts,
            intro: { ...project.drafts.intro, prompt_text: "Intro ready while outro runs", source_revision_id: "intro-revision" },
          },
        };
        job = { ...job, result_revision_ids: ["intro-revision"], step: "1/2 scripts processed" };
      }
      if (state.pollFailures > 0) {
        state.pollFailures--;
        return route.abort();
      }
      if (job?.status === "running" && !state.hold) {
        if (state.failed)
          job = {
            ...job,
            status: "failed",
            step: "Generation failed",
            error_message: "Provider unavailable",
            failed_clip_kinds: ["intro", "outro"],
          };
        else {
          project = {
            ...project,
            version: project.version + 1,
            drafts: {
              intro: {
                ...project.drafts.intro,
                prompt_text: `Generated intro ${state.requests.length}`,
                source_revision_id: "intro-revision",
              },
              outro: {
                ...project.drafts.outro,
                prompt_text: `Generated outro ${state.requests.length}`,
                source_revision_id: "outro-revision",
              },
            },
          };
          job = { ...job, status: "succeeded", step: "Scripts ready" };
        }
      }
      return send({ job });
    }
    if (path.endsWith("intro-outro-styles") && route.request().method() === "POST") {
      state.uploads.push(payload!);
      if (state.uploadFailures > 0) {
        state.uploadFailures--;
        return route.abort();
      }
      return send({ style: { name: "001" } });
    }
    if (path.endsWith("intro-outro-styles")) {
      const clip = { filename: "clip.mp4", duration_seconds: 8, width: 1920, height: 1080, fps: 30, has_audio: false };
      return send({
        styles: [
          IntroOutroStyleSchema.parse({
            style_id: "pair",
            channel_id: "channel",
            style_preset_id: "preset_arcade_classic",
            name: "001",
            intro: clip,
            outro: clip,
            created_at: now,
            updated_at: now,
          }),
        ],
      });
    }
    if (route.request().method() === "PATCH") {
      if (state.saveFailures > 0) {
        state.saveFailures--;
        return route.fulfill({ status: 503, json: { error: "Save unavailable" } });
      }
      const drafts = payload?.drafts as { intro: { prompt_text: string }; outro: { prompt_text: string } };
      project = {
        ...project,
        version: project.version + 1,
        drafts: {
          intro: { ...project.drafts.intro, prompt_text: drafts.intro.prompt_text, source_revision_id: null },
          outro: { ...project.drafts.outro, prompt_text: drafts.outro.prompt_text, source_revision_id: null },
        },
      };
      return send({ project });
    }
    return send({ project });
  });
  return state;
}
