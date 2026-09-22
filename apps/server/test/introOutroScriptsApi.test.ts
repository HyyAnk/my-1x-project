import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type {
  IntroOutroScriptContext,
  IntroOutroScriptContent,
  IntroOutroScriptJob,
  IntroOutroScriptProject,
  IntroOutroScriptRevision,
  IntroOutroStyle,
  MascotStyleIdentityProfile,
} from "@studio/shared";
import { buildApp, type StudioApp } from "../src/app.js";
import { createTestImageBuffer } from "./channelAssetsTestHelpers.js";
import { parseZipArchive } from "../src/quiz/zipHelper.js";

const execFileAsync = promisify(execFile);
type ContentOptions = {
  imageAttachments?: Array<{ path: string; role: string }>;
};

class FakeGeminiFlashClient {
  readonly attachments: Array<Array<{ path: string; role: string }>> = [];
  readonly generationPrompts: string[] = [];
  reviewCalls = 0;
  reviewFailure: "none" | "error" | "timeout" = "none";
  rejectReview = false;
  overloadFirstIntro = false;
  failOutro = false;
  delayMs = 0;

  async connect(): Promise<void> {}

  async generateContent(prompt: string, options?: ContentOptions): Promise<string> {
    this.attachments.push(options?.imageAttachments ?? []);
    if (prompt.startsWith("SCRIPT PRODUCTION QUALITY REVIEW")) {
      this.reviewCalls += 1;
      if (this.reviewFailure !== "none") {
        const error = new Error(this.reviewFailure === "timeout" ? "Forced quality-review timeout" : "Forced quality-review failure");
        if (this.reviewFailure === "timeout") error.name = "TimeoutError";
        throw error;
      }
      const overloaded = this.rejectReview || prompt.includes("Spin, jump, then bow");
      return JSON.stringify({
        findings: overloaded
          ? [
              {
                code: "ACTION_OVERLOAD",
                severity: "error",
                path: "timeline.0.action",
                message: "One principal action is possible in this beat; remove the gesture chain.",
              },
            ]
          : [],
      });
    }
    if (prompt.includes("analyzing one mascot reference image")) {
      return JSON.stringify({
        summary: "A flat asymmetric mascot with one rigid side marker and no visible limbs",
        morphology: ["Single rounded body", "No visible limbs"],
        features: [
          {
            id: "side_marker",
            description: "Rigid marker attached to the left edge",
            body_anchor: "left edge",
            material: "flat graphic",
            rigidity: "rigid",
            importance: "signature",
            visibility_rule: "Keep visible in hero framing",
          },
        ],
        capabilities: {
          locomotion: "unknown",
          grasping: "unsupported",
          pointing: "unsupported",
          waving: "unsupported",
          flight: "unsupported",
          facial_expression: "unknown",
          speech: "unknown",
          ride_vehicle: "unsupported",
          hold_props: "unsupported",
        },
        motion_constraints: ["Keep side_marker rigid and attached"],
        palette: ["#3366FF"],
        style_description: "Flat vector art with restrained motion",
        allowed_accessories: [],
      });
    }

    if (this.delayMs > 0) await new Promise((resolve) => setTimeout(resolve, this.delayMs));

    const intro = prompt.includes("structured intro script");
    this.generationPrompts.push(prompt);
    if (!intro && this.failOutro) throw new Error("Forced outro failure");
    const roles = intro ? ["entrance", "brand_interaction", "handoff"] : ["recognition", "invitation", "farewell"];
    return JSON.stringify({
      production_directions: {
        reference_mode: "character_reference",
        logo_mode: "none",
        voice_source: "none",
        logo_placement: "No logo",
        opening_state: "Centered rigid mascot",
        closing_state: "Settled mascot",
        end_hold_seconds: 0.75,
      },
      style: {
        description: "Flat vector staging that preserves the supplied mascot",
        palette: ["#3366FF"],
        staging: "Center stage with open negative space",
        motion_language: "Rigid marker remains fixed while the body translates gently",
      },
      timeline: roles.map((role, index) => ({
        beat: index + 1,
        role,
        start_seconds: [0, 2, 5][index],
        end_seconds: [2, 5, 8][index],
        action:
          intro && index === 0 && this.overloadFirstIntro && !prompt.includes("REPAIR REQUEST")
            ? "Spin, jump, then bow"
            : `One clear ${role.replaceAll("_", " ")} action`,
        capability_ids: [],
        props: [],
        visible_feature_ids: ["side_marker"],
      })),
      voiceover: { enabled: false, lines: [] },
      audio: { music_direction: "Light family quiz cue", events: [] },
      camera: [{ start_seconds: 0, end_seconds: 8, framing: "Medium wide", movement: "Static" }],
      consistency: { allowed_visible_text: [], restrictions: ["Keep side_marker rigid and attached"] },
    });
  }
}

async function waitForJob(app: StudioApp, channelId: string, jobId: string): Promise<IntroOutroScriptJob> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const response = await app.server.inject({
      method: "GET",
      url: `/api/channels/${channelId}/intro-outro-script-jobs/${jobId}`,
    });
    const job = response.json<{ job: IntroOutroScriptJob }>().job;
    if (!["queued", "running"].includes(job.status)) return job;
    await new Promise((resolve) => setTimeout(resolve, 15));
  }
  throw new Error("Script job did not reach a terminal state");
}

describe("Intro/Outro Script Studio API", () => {
  let app: StudioApp;
  let root: string;
  let channelId: string;
  let videoPath: string;
  let mascotImageBytes: Buffer;
  let firstProjectId: string;
  let firstIntroRevision: IntroOutroScriptRevision;
  const fakeGemini = new FakeGeminiFlashClient();

  beforeAll(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "intro-outro-script-api-"));
    await mkdir(path.join(root, "templates"), { recursive: true });
    await Promise.all([
      writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n"),
      writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# DNA\n"),
      writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n"),
    ]);
    app = await buildApp(root, { introOutroScriptClient: fakeGemini });
    const channel = await app.repository.createChannel({ name: "Generic Mascot Quiz", target_audience: "families" });
    let mascot = await app.repository.saveMascot({ name: "Shape Guide", description: "A generic test mascot" });
    mascotImageBytes = await createTestImageBuffer(512, 512);
    const anchorUrl = await app.repository.saveMascotAsset(mascot.id, "flat-anchor.png", mascotImageBytes);
    mascot = await app.repository.saveMascot({
      ...mascot,
      active_style_id: mascot.styles?.[0]?.id,
      styles: mascot.styles?.map((style, index) => ({
        ...style,
        is_default: index === 0,
        built_in_preset_id: index === 0 ? "preset_arcade_classic" : style.built_in_preset_id,
        anchor_image_url: index === 0 ? anchorUrl : style.anchor_image_url,
        style_revision: 1,
      })),
    });
    await app.repository.assignMascotToChannel(channel.channel_id, mascot.id);
    channelId = channel.channel_id;

    videoPath = path.join(root, "linked-1080p.mp4");
    await execFileAsync("ffmpeg", [
      "-y",
      "-f",
      "lavfi",
      "-i",
      "color=c=blue:s=1920x1080:d=0.5",
      "-t",
      "0.5",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      videoPath,
    ]);
  }, 40_000);

  afterAll(async () => {
    await app.close();
    await rm(root, { recursive: true, force: true });
  });

  it("analyzes the actual mascot image, generates, reviews, exports, and links uploaded videos", async () => {
    const contextUrl = `/api/channels/${channelId}/intro-outro-context?style_preset_id=preset_arcade_classic`;
    const initialContextResponse = await app.server.inject({ method: "GET", url: contextUrl });
    expect(initialContextResponse.statusCode).toBe(200);
    const initialContext = initialContextResponse.json<{ context: IntroOutroScriptContext }>().context;
    expect(initialContext.mascot_reference_url).toContain("flat-anchor.png");
    expect(initialContext.identity_status).toBe("missing");

    const analysisResponse = await app.server.inject({
      method: "POST",
      url: `/api/channels/${channelId}/intro-outro-context/analyze`,
      payload: {
        style_preset_id: "preset_arcade_classic",
        idempotency_key: "analyze-flat-mascot-v1",
      },
    });
    expect(analysisResponse.statusCode).toBe(202);
    const analysisJob = await waitForJob(app, channelId, analysisResponse.json<{ job: IntroOutroScriptJob }>().job.job_id);
    expect(analysisJob.status).toBe("succeeded");
    expect(fakeGemini.attachments[0]?.map((item) => item.role)).toEqual(["mascot_subject"]);
    expect(fakeGemini.attachments[0]?.[0]?.path).toContain("flat-anchor.png");

    const analyzedResponse = await app.server.inject({ method: "GET", url: contextUrl });
    const analyzed = analyzedResponse.json<{
      context: IntroOutroScriptContext;
      identity: MascotStyleIdentityProfile;
    }>();
    expect(analyzed.context.identity_status).toBe("needs_review");
    const reviewResponse = await app.server.inject({
      method: "PUT",
      url: `/api/channels/${channelId}/intro-outro-context/review`,
      payload: {
        style_preset_id: "preset_arcade_classic",
        expected_updated_at: analyzed.identity.updated_at,
        profile: analyzed.identity,
      },
    });
    expect(reviewResponse.statusCode).toBe(200);
    expect(reviewResponse.json<{ identity: MascotStyleIdentityProfile }>().identity.status).toBe("reviewed");

    const createResponse = await app.server.inject({
      method: "POST",
      url: `/api/channels/${channelId}/intro-outro-scripts`,
      payload: { style_preset_id: "preset_arcade_classic", name: "Arcade Scripts" },
    });
    expect(createResponse.statusCode).toBe(201);
    let project = createResponse.json<{ project: IntroOutroScriptProject }>().project;

    const generationPayload = {
      expected_version: project.version,
      idempotency_key: "generate-arcade-pair-v1",
      clips: [
        { clip_kind: "intro", duration_seconds: 8, randomization_seed: "pair-seed" },
        { clip_kind: "outro", duration_seconds: 8, randomization_seed: "pair-seed" },
      ],
    };
    const generateResponse = await app.server.inject({
      method: "POST",
      url: `/api/channels/${channelId}/intro-outro-scripts/${project.project_id}/generate`,
      payload: generationPayload,
    });
    expect(generateResponse.statusCode).toBe(202);
    const generationJob = await waitForJob(app, channelId, generateResponse.json<{ job: IntroOutroScriptJob }>().job.job_id);
    expect(generationJob.status).toBe("succeeded");
    expect(generationJob.result_revision_ids).toHaveLength(2);
    expect(fakeGemini.attachments.slice(1).every((items) => items.some((item) => item.role === "mascot_subject"))).toBe(true);

    const projectResponse = await app.server.inject({
      method: "GET",
      url: `/api/channels/${channelId}/intro-outro-scripts/${project.project_id}`,
    });
    project = projectResponse.json<{ project: IntroOutroScriptProject }>().project;
    expect(project.drafts.intro.content?.timeline.map((beat) => beat.end_seconds)).toEqual([2, 5, 8]);
    expect(project.drafts.outro.content?.identity.mascot_style_id).toBe(analyzed.context.mascot_style_id);

    const idempotentResponse = await app.server.inject({
      method: "POST",
      url: `/api/channels/${channelId}/intro-outro-scripts/${project.project_id}/generate`,
      payload: generationPayload,
    });
    expect(idempotentResponse.statusCode).toBe(202);
    expect(idempotentResponse.json<{ job: IntroOutroScriptJob }>().job.job_id).toBe(generationJob.job_id);
    const conflictingResponse = await app.server.inject({
      method: "POST",
      url: `/api/channels/${channelId}/intro-outro-scripts/${project.project_id}/generate`,
      payload: {
        ...generationPayload,
        clips: [{ clip_kind: "intro", duration_seconds: 9, randomization_seed: "pair-seed" }],
      },
    });
    expect(conflictingResponse.statusCode).toBe(409);

    const revisionsResponse = await app.server.inject({
      method: "GET",
      url: `/api/channels/${channelId}/intro-outro-scripts/${project.project_id}/revisions`,
    });
    const revisions = revisionsResponse.json<{ revisions: IntroOutroScriptRevision[] }>().revisions;
    expect(revisions).toHaveLength(2);

    for (const revision of revisions) {
      const approvalResponse = await app.server.inject({
        method: "POST",
        url: `/api/channels/${channelId}/intro-outro-scripts/${project.project_id}/approve`,
        payload: { revision_id: revision.revision_id, expected_version: project.version },
      });
      expect(approvalResponse.statusCode).toBe(200);
      project = approvalResponse.json<{ project: IntroOutroScriptProject }>().project;
    }

    const introRevision = revisions.find((revision) => revision.clip_kind === "intro")!;
    const outroRevision = revisions.find((revision) => revision.clip_kind === "outro")!;
    firstProjectId = project.project_id;
    firstIntroRevision = introRevision;
    const exportResponse = await app.server.inject({
      method: "GET",
      url: `/api/channels/${channelId}/intro-outro-scripts/${project.project_id}/revisions/${introRevision.revision_id}/export`,
    });
    expect(exportResponse.statusCode).toBe(200);
    expect(exportResponse.json<{ prompt: string }>().prompt).toContain("REFERENCE ASSETS");
    expect(exportResponse.json<{ prompt: string }>().prompt).toContain("Rigid marker attached to the left edge");
    expect(introRevision.identity_snapshot?.profile_id).toBe(analyzed.identity.profile_id);
    expect(introRevision.quality_review?.findings).toEqual([]);
    const packageResponse = await app.server.inject({
      method: "GET",
      url: `/api/channels/${channelId}/intro-outro-scripts/${project.project_id}/revisions/${introRevision.revision_id}/package`,
    });
    expect(packageResponse.statusCode).toBe(200);
    const entries = parseZipArchive(packageResponse.rawPayload);
    expect(entries.map((entry) => entry.filename)).toEqual(["prompt.txt", "revision.json", "README.md", "mascot_subject.png"]);
    const mascotAsset = entries.find((entry) => entry.filename === "mascot_subject.png")!;
    expect(Buffer.from(mascotAsset.data)).toEqual(mascotImageBytes);
    expect(createHash("sha256").update(mascotAsset.data).digest("hex")).toBe(introRevision.references[0].sha256);
    const packagedRevision = JSON.parse(
      Buffer.from(entries.find((entry) => entry.filename === "revision.json")!.data).toString("utf8"),
    ) as IntroOutroScriptRevision;
    expect(packagedRevision.identity_snapshot?.profile_id).toBe(analyzed.identity.profile_id);
    expect(packagedRevision.quality_review?.content_fingerprint).toBe(introRevision.quality_review?.content_fingerprint);
    expect(Buffer.from(entries.find((entry) => entry.filename === "prompt.txt")!.data).toString("utf8")).toContain(
      "Rigid marker attached to the left edge",
    );

    const uploadResponse = await app.server.inject({
      method: "POST",
      url: `/api/channels/${channelId}/intro-outro-styles`,
      payload: {
        name: "Linked Pair",
        style_preset_id: "preset_arcade_classic",
        intro_data: videoPath,
        outro_data: videoPath,
        intro_script_provenance: { project_id: project.project_id, revision_id: introRevision.revision_id },
        outro_script_provenance: { project_id: project.project_id, revision_id: outroRevision.revision_id },
      },
    });
    expect(uploadResponse.statusCode).toBe(201);
    const pair = uploadResponse.json<{ style: IntroOutroStyle }>().style;
    expect(pair.intro.script_provenance?.revision_id).toBe(introRevision.revision_id);
    expect(pair.outro.script_provenance?.revision_id).toBe(outroRevision.revision_id);
  }, 40_000);

  it("retains a successful clip and detailed failure when paired generation is partial", async () => {
    fakeGemini.failOutro = true;
    try {
      const createResponse = await app.server.inject({
        method: "POST",
        url: `/api/channels/${channelId}/intro-outro-scripts`,
        payload: { style_preset_id: "preset_arcade_classic", name: "Partial Pair" },
      });
      const project = createResponse.json<{ project: IntroOutroScriptProject }>().project;
      const generateResponse = await app.server.inject({
        method: "POST",
        url: `/api/channels/${channelId}/intro-outro-scripts/${project.project_id}/generate`,
        payload: {
          expected_version: project.version,
          idempotency_key: "partial-pair-v1",
          clips: [
            { clip_kind: "intro", duration_seconds: 8, randomization_seed: "partial-seed" },
            { clip_kind: "outro", duration_seconds: 8, randomization_seed: "partial-seed" },
          ],
        },
      });
      const job = await waitForJob(app, channelId, generateResponse.json<{ job: IntroOutroScriptJob }>().job.job_id);
      expect(job.status).toBe("partial");
      expect(job.result_revision_ids).toHaveLength(1);
      expect(job.failed_clip_kinds).toEqual(["outro"]);
      expect(job.clip_errors[0]).toMatchObject({ clip_kind: "outro", message: "Forced outro failure" });
    } finally {
      fakeGemini.failOutro = false;
    }
  });

  it("cancels a queued generation without creating a revision", async () => {
    fakeGemini.delayMs = 100;
    try {
      const createResponse = await app.server.inject({
        method: "POST",
        url: `/api/channels/${channelId}/intro-outro-scripts`,
        payload: { style_preset_id: "preset_arcade_classic", name: "Cancelled Pair" },
      });
      const project = createResponse.json<{ project: IntroOutroScriptProject }>().project;
      const generateResponse = await app.server.inject({
        method: "POST",
        url: `/api/channels/${channelId}/intro-outro-scripts/${project.project_id}/generate`,
        payload: {
          expected_version: project.version,
          idempotency_key: "cancel-pair-v1",
          clips: [{ clip_kind: "intro", duration_seconds: 8, randomization_seed: "cancel-seed" }],
        },
      });
      const jobId = generateResponse.json<{ job: IntroOutroScriptJob }>().job.job_id;
      const cancelResponse = await app.server.inject({
        method: "POST",
        url: `/api/channels/${channelId}/intro-outro-script-jobs/${jobId}/cancel`,
      });
      expect(cancelResponse.json<{ job: IntroOutroScriptJob }>().job.status).toBe("cancelled");
      await new Promise((resolve) => setTimeout(resolve, 30));
      const finalJob = await waitForJob(app, channelId, jobId);
      expect(finalJob.status).toBe("cancelled");
      const revisionsResponse = await app.server.inject({
        method: "GET",
        url: `/api/channels/${channelId}/intro-outro-scripts/${project.project_id}/revisions`,
      });
      expect(revisionsResponse.json<{ revisions: IntroOutroScriptRevision[] }>().revisions).toEqual([]);
    } finally {
      fakeGemini.delayMs = 0;
    }
  });

  it("repairs a script after the independent reviewer finds overloaded action", async () => {
    fakeGemini.overloadFirstIntro = true;
    const firstPromptIndex = fakeGemini.generationPrompts.length;
    const firstReviewCount = fakeGemini.reviewCalls;
    try {
      const created = await app.server.inject({
        method: "POST",
        url: `/api/channels/${channelId}/intro-outro-scripts`,
        payload: { style_preset_id: "preset_arcade_classic", name: "Reviewed Repair" },
      });
      const project = created.json<{ project: IntroOutroScriptProject }>().project;
      const response = await app.server.inject({
        method: "POST",
        url: `/api/channels/${channelId}/intro-outro-scripts/${project.project_id}/generate`,
        payload: {
          expected_version: project.version,
          idempotency_key: "review-repair-v1",
          clips: [{ clip_kind: "intro", duration_seconds: 8, randomization_seed: "repair-seed" }],
        },
      });
      const job = await waitForJob(app, channelId, response.json<{ job: IntroOutroScriptJob }>().job.job_id);
      expect(job.status).toBe("succeeded");
      expect(fakeGemini.reviewCalls - firstReviewCount).toBe(2);
      expect(fakeGemini.generationPrompts.slice(firstPromptIndex)).toHaveLength(2);
      expect(fakeGemini.generationPrompts.at(-1)).toContain("REPAIR REQUEST");
      const revisions = await app.server.inject({
        method: "GET",
        url: `/api/channels/${channelId}/intro-outro-scripts/${project.project_id}/revisions`,
      });
      const revision = revisions.json<{ revisions: IntroOutroScriptRevision[] }>().revisions[0];
      expect(revision.content.timeline[0].action).toBe("One clear entrance action");
      expect(revision.quality_review?.findings).toEqual([]);
    } finally {
      fakeGemini.overloadFirstIntro = false;
    }
  });

  it("stops after bounded quality-review failures without persisting a revision", async () => {
    fakeGemini.rejectReview = true;
    const reviewCount = fakeGemini.reviewCalls;
    try {
      const created = await app.server.inject({
        method: "POST",
        url: `/api/channels/${channelId}/intro-outro-scripts`,
        payload: { style_preset_id: "preset_arcade_classic", name: "Review Rejection" },
      });
      const project = created.json<{ project: IntroOutroScriptProject }>().project;
      const response = await app.server.inject({
        method: "POST",
        url: `/api/channels/${channelId}/intro-outro-scripts/${project.project_id}/generate`,
        payload: {
          expected_version: project.version,
          idempotency_key: "review-rejection-v1",
          clips: [{ clip_kind: "intro", duration_seconds: 8, randomization_seed: "rejection-seed" }],
        },
      });
      const job = await waitForJob(app, channelId, response.json<{ job: IntroOutroScriptJob }>().job.job_id);
      expect(job.status).toBe("failed");
      expect(job.result_revision_ids).toEqual([]);
      expect(fakeGemini.reviewCalls - reviewCount).toBe(3);
      expect(job.clip_errors[0].message).toContain("One principal action");
      const revisions = await app.server.inject({
        method: "GET",
        url: `/api/channels/${channelId}/intro-outro-scripts/${project.project_id}/revisions`,
      });
      expect(revisions.json<{ revisions: IntroOutroScriptRevision[] }>().revisions).toEqual([]);
    } finally {
      fakeGemini.rejectReview = false;
    }
  });

  it("preserves valid unreviewed revisions after review errors or timeouts and blocks approval", async () => {
    try {
      for (const reviewFailure of ["error", "timeout"] as const) {
        fakeGemini.reviewFailure = reviewFailure;
        const created = await app.server.inject({
          method: "POST",
          url: `/api/channels/${channelId}/intro-outro-scripts`,
          payload: { style_preset_id: "preset_arcade_classic", name: `Unavailable Review ${reviewFailure}` },
        });
        const project = created.json<{ project: IntroOutroScriptProject }>().project;
        const base = `/api/channels/${channelId}/intro-outro-scripts/${project.project_id}`;
        const response = await app.server.inject({
          method: "POST",
          url: `${base}/generate`,
          payload: {
            expected_version: project.version,
            idempotency_key: `review-unavailable-${reviewFailure}-v1`,
            clips: [{ clip_kind: "intro", duration_seconds: 8, randomization_seed: `unavailable-${reviewFailure}` }],
          },
        });
        const job = await waitForJob(app, channelId, response.json<{ job: IntroOutroScriptJob }>().job.job_id);
        expect(job.status).toBe("succeeded");
        expect(job.result_revision_ids).toHaveLength(1);

        const revisionsResponse = await app.server.inject({ method: "GET", url: `${base}/revisions` });
        const revision = revisionsResponse.json<{ revisions: IntroOutroScriptRevision[] }>().revisions[0];
        expect(revision.quality_review).toBeUndefined();
        expect(revision.validation_issues).toContainEqual({
          code: "QUALITY_REVIEW_UNAVAILABLE",
          severity: "warning",
          path: "quality_review",
          message: "AI production review did not complete. Save a new revision to retry the review before approval.",
        });
        expect(revision.validation_issues.some((issue) => issue.severity === "error")).toBe(false);

        const refreshedProject = (await app.server.inject({ method: "GET", url: base })).json<{
          project: IntroOutroScriptProject;
        }>().project;
        const approval = await app.server.inject({
          method: "POST",
          url: `${base}/approve`,
          payload: { revision_id: revision.revision_id, expected_version: refreshedProject.version },
        });
        expect(approval.statusCode).toBe(422);
        expect(approval.json<{ code: string; error: string }>()).toMatchObject({
          code: "SCRIPT_VALIDATION_FAILED",
          error: "This revision needs a current production quality review",
        });
      }
    } finally {
      fakeGemini.reviewFailure = "none";
    }
  });

  it("requires production directions and companion continuity when checkpointing edited drafts", async () => {
    const created = await app.server.inject({
      method: "POST",
      url: `/api/channels/${channelId}/intro-outro-scripts`,
      payload: { style_preset_id: "preset_arcade_classic", name: "Edited Pair" },
    });
    let project = created.json<{ project: IntroOutroScriptProject }>().project;
    const base = `/api/channels/${channelId}/intro-outro-scripts/${project.project_id}`;
    const started = await app.server.inject({
      method: "POST",
      url: `${base}/generate`,
      payload: {
        expected_version: project.version,
        idempotency_key: "edited-pair-v1",
        clips: [
          { clip_kind: "intro", duration_seconds: 8, randomization_seed: "edited-seed" },
          { clip_kind: "outro", duration_seconds: 8, randomization_seed: "edited-seed" },
        ],
      },
    });
    expect((await waitForJob(app, channelId, started.json<{ job: IntroOutroScriptJob }>().job.job_id)).status).toBe("succeeded");
    project = (await app.server.inject({ method: "GET", url: base })).json<{ project: IntroOutroScriptProject }>().project;
    const intro = structuredClone(project.drafts.intro.content)!;
    const outro = structuredClone(project.drafts.outro.content)!;
    const missingDirections: IntroOutroScriptContent = { ...intro };
    delete missingDirections.production_directions;
    let updated = await app.server.inject({
      method: "PATCH",
      url: base,
      payload: {
        expected_version: project.version,
        drafts: { intro: { content: missingDirections } },
      },
    });
    expect(updated.statusCode).toBe(200);
    project = updated.json<{ project: IntroOutroScriptProject }>().project;
    const validation = await app.server.inject({ method: "POST", url: `${base}/validate`, payload: { clip_kind: "intro" } });
    expect(validation.statusCode).toBe(200);
    expect(validation.json<{ valid: boolean; issues: Array<{ code: string }> }>()).toMatchObject({
      valid: false,
      issues: expect.arrayContaining([expect.objectContaining({ code: "PRODUCTION_DIRECTIONS_MISSING" })]),
    });
    let checkpoint = await app.server.inject({
      method: "POST",
      url: `${base}/revisions`,
      payload: {
        clip_kind: "intro",
        expected_version: project.version,
      },
    });
    expect(checkpoint.statusCode).toBe(422);
    expect(checkpoint.json<{ error: string }>().error).toContain("Production directions");

    const driftedOutro: IntroOutroScriptContent = { ...outro, style: { ...outro.style, staging: "An unrelated stage" } };
    updated = await app.server.inject({
      method: "PATCH",
      url: base,
      payload: {
        expected_version: project.version,
        drafts: { intro: { content: intro }, outro: { content: driftedOutro } },
      },
    });
    expect(updated.statusCode).toBe(200);
    project = updated.json<{ project: IntroOutroScriptProject }>().project;
    checkpoint = await app.server.inject({
      method: "POST",
      url: `${base}/revisions`,
      payload: {
        clip_kind: "outro",
        expected_version: project.version,
      },
    });
    expect(checkpoint.statusCode).toBe(422);
    expect(checkpoint.json<{ error: string }>().error).toContain("share their stage");

    updated = await app.server.inject({
      method: "PATCH",
      url: base,
      payload: {
        expected_version: project.version,
        drafts: { outro: { content: outro } },
      },
    });
    expect(updated.statusCode).toBe(200);
    project = updated.json<{ project: IntroOutroScriptProject }>().project;
    checkpoint = await app.server.inject({
      method: "POST",
      url: `${base}/revisions`,
      payload: {
        clip_kind: "outro",
        expected_version: project.version,
      },
    });
    expect(checkpoint.statusCode).toBe(201);
    const saved = checkpoint.json<{ revision: IntroOutroScriptRevision }>().revision;
    expect(saved.origin).toBe("edited");
    expect(saved.identity_snapshot?.profile_id).toBe(outro.identity.profile_id);
    expect(saved.quality_review?.findings).toEqual([]);
  });

  it("does not approve a revision whose saved quality review has a blocking finding", async () => {
    const channel = await app.repository.getChannel(channelId);
    const revisionPath = app.repository.resolvePath(
      "channels",
      channel.slug,
      "intro_outro_scripts",
      "projects",
      firstProjectId,
      "revisions",
      `${firstIntroRevision.revision_id}.json`,
    );
    const saved = await readFile(revisionPath, "utf8");
    try {
      const revision = JSON.parse(saved) as IntroOutroScriptRevision;
      revision.quality_review!.findings = [
        {
          code: "IDENTITY_DRIFT",
          severity: "error",
          path: "timeline.1.action",
          message: "The action changes a signature feature.",
        },
      ];
      await writeFile(revisionPath, JSON.stringify(revision));
      const project = (
        await app.server.inject({ method: "GET", url: `/api/channels/${channelId}/intro-outro-scripts/${firstProjectId}` })
      ).json<{ project: IntroOutroScriptProject }>().project;
      const response = await app.server.inject({
        method: "POST",
        url: `/api/channels/${channelId}/intro-outro-scripts/${firstProjectId}/approve`,
        payload: { revision_id: firstIntroRevision.revision_id, expected_version: project.version },
      });
      expect(response.statusCode).toBe(422);
      expect(response.json<{ code: string }>().code).toBe("SCRIPT_VALIDATION_FAILED");
    } finally {
      await writeFile(revisionPath, saved);
    }
  });

  it("rejects a damaged reference snapshot instead of silently exporting a current asset", async () => {
    const channel = await app.repository.getChannel(channelId);
    const reference = firstIntroRevision.references[0];
    const referencePath = app.repository.resolvePath(
      "channels",
      channel.slug,
      "intro_outro_scripts",
      "projects",
      firstProjectId,
      "references",
      `${reference.role}-${reference.sha256}.png`,
    );
    const saved = await readFile(referencePath);
    try {
      await writeFile(referencePath, "changed snapshot bytes");
      const response = await app.server.inject({
        method: "GET",
        url: `/api/channels/${channelId}/intro-outro-scripts/${firstProjectId}/revisions/${firstIntroRevision.revision_id}/package`,
      });
      expect(response.statusCode).toBe(422);
      expect(response.json<{ code: string }>().code).toBe("SCRIPT_REFERENCE_INVALID");
    } finally {
      await writeFile(referencePath, saved);
    }
  });
});
