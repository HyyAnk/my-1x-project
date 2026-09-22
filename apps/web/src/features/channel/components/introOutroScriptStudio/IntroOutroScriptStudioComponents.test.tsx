import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  CreativeSeed,
  IntroOutroScriptContent,
  IntroOutroScriptJob,
  IntroOutroScriptProject,
  IntroOutroScriptRevision,
  MascotStyleIdentityProfile,
} from "@studio/shared";
import { ScriptConfigureStep } from "./ScriptConfigureStep";
import { ScriptReviewStep } from "./ScriptReviewStep";
import { ScriptUploadStep } from "./ScriptUploadStep";

const now = "2026-09-22T00:00:00.000Z";
const identity: MascotStyleIdentityProfile = {
  schema_version: 1,
  profile_id: "identity_1",
  mascot_id: "mascot_1",
  mascot_style_id: "style_1",
  style_preset_id: "preset_arcade_classic",
  style_revision: 1,
  reference_asset_url: "/mascot.png",
  reference_sha256: "a".repeat(64),
  reference_mime_type: "image/png",
  summary: "A flat asymmetric mascot without visible limbs",
  morphology: ["No visible limbs"],
  features: [
    {
      id: "side_marker",
      description: "Rigid side marker",
      body_anchor: "left edge",
      material: "flat graphic",
      rigidity: "rigid",
      importance: "signature",
      visibility_rule: "Preserve in hero framing",
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
  motion_constraints: ["Keep side_marker rigid"],
  palette: ["#3366FF"],
  style_description: "Flat vector",
  allowed_accessories: [],
  status: "reviewed",
  source: "manual",
  analysis_model: null,
  analysis_version: "manual-v1",
  created_at: now,
  updated_at: now,
  reviewed_at: now,
};

function creativeSeed(id: string, dimension: CreativeSeed["dimension"], clipKind: CreativeSeed["clip_kind"], name: string): CreativeSeed {
  return {
    id,
    revision: 2,
    dimension,
    clip_kind: clipKind,
    name,
    narrative_intent: `${name} direction`,
    required_capabilities: [],
    style_tags: [],
    allowed_props: [],
    allowed_text: [],
    forbidden_seed_ids: [],
    complexity: "low",
    selection_weight: 1,
    origin: "built_in",
    status: "active",
  };
}

const seeds: CreativeSeed[] = [
  creativeSeed("A01", "intro_entrance", "intro", "Edge Reveal"),
  creativeSeed("A07", "intro_entrance", "intro", "Attention Shift"),
  creativeSeed("B01", "intro_brand_interaction", "intro", "Mechanism Reveal"),
  creativeSeed("B02", "intro_brand_interaction", "intro", "Light Activation"),
  creativeSeed("C01", "intro_performance_tone", "intro", "Energetic"),
  creativeSeed("C03", "intro_performance_tone", "intro", "Thoughtful"),
  creativeSeed("D01", "intro_verbal_hook", "intro", "Friendly Challenge"),
  creativeSeed("D07", "intro_verbal_hook", "intro", "Shared Play"),
  creativeSeed("E01", "outro_recognition", "outro", "Delighted Response"),
  creativeSeed("E07", "outro_recognition", "outro", "Victory Motion"),
  creativeSeed("F02", "outro_invitation", "outro", "Return Invitation"),
  creativeSeed("F01", "outro_invitation", "outro", "Subscribe Invitation"),
  creativeSeed("G01", "outro_farewell", "outro", "Supported Farewell"),
  creativeSeed("G05", "outro_farewell", "outro", "Horizon Departure"),
];

const content: IntroOutroScriptContent = {
  production: { clip_kind: "intro", language: "English", aspect_ratio: "16:9", target_duration_seconds: 8 },
  identity: {
    profile_id: identity.profile_id,
    mascot_id: identity.mascot_id,
    mascot_style_id: identity.mascot_style_id,
    required_feature_ids: ["side_marker"],
  },
  style: { description: "Flat vector scene", palette: ["#3366FF"], staging: "Center", motion_language: "Restrained" },
  timeline: [
    {
      beat: 1,
      role: "entrance",
      start_seconds: 0,
      end_seconds: 2.4,
      action: "Enter",
      capability_ids: [],
      props: [],
      visible_feature_ids: ["side_marker"],
    },
    {
      beat: 2,
      role: "brand_interaction",
      start_seconds: 2.4,
      end_seconds: 6,
      action: "Reveal",
      capability_ids: [],
      props: [],
      visible_feature_ids: ["side_marker"],
    },
    {
      beat: 3,
      role: "handoff",
      start_seconds: 6,
      end_seconds: 8,
      action: "Settle",
      capability_ids: [],
      props: [],
      visible_feature_ids: ["side_marker"],
    },
  ],
  voiceover: { enabled: false, lines: [] },
  audio: { music_direction: "Light cue", events: [] },
  camera: [{ start_seconds: 0, end_seconds: 8, framing: "Wide", movement: "Static" }],
  consistency: { preserve_feature_ids: ["side_marker"], allowed_visible_text: [], restrictions: ["Keep marker rigid"] },
};

const project: IntroOutroScriptProject = {
  schema_version: 1,
  project_id: "project_1",
  channel_id: "channel_1",
  style_preset_id: "preset_arcade_classic",
  name: "Arcade Scripts",
  version: 3,
  archived: false,
  drafts: {
    intro: {
      clip_kind: "intro",
      target_duration_seconds: 8,
      seed_selection: {
        randomization_seed: "seed",
        selected_seed_ids: ["A01", "B01"],
        locked_dimensions: [],
        algorithm_version: "1",
      },
      content,
      validation_issues: [],
      source_revision_id: "revision_intro",
      updated_at: now,
    },
    outro: {
      clip_kind: "outro",
      target_duration_seconds: 8,
      seed_selection: null,
      content: null,
      validation_issues: [],
      source_revision_id: null,
      updated_at: now,
    },
  },
  revision_ids: ["revision_intro"],
  approved_revision_ids: { intro: "revision_intro", outro: null },
  created_at: now,
  updated_at: now,
};

const revision: IntroOutroScriptRevision = {
  schema_version: 1,
  revision_id: "revision_intro",
  project_id: project.project_id,
  channel_id: project.channel_id,
  style_preset_id: project.style_preset_id,
  clip_kind: "intro",
  revision_number: 1,
  origin: "generated",
  content,
  seed_selection: project.drafts.intro.seed_selection!,
  seed_snapshot: seeds,
  references: [
    {
      role: "mascot_subject",
      asset_id: "mascot_1:style_1:anchor.png",
      url: "/mascot.png",
      sha256: "a".repeat(64),
      mime_type: "image/png",
    },
  ],
  context_fingerprint: "b".repeat(64),
  template_version: "intro-outro-script-v2",
  requested_model: "gemini-3.7-flash-high",
  effective_model: null,
  validation_issues: [],
  warning_acknowledgements: [],
  created_at: now,
};

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Intro/Outro Script Studio components", () => {
  it("shows the exact style reference and generic reviewed identity before generation", () => {
    render(
      <ScriptConfigureStep
        channelId="channel_1"
        stylePresetId="preset_arcade_classic"
        contextBundle={{
          context: {
            channel_id: "channel_1",
            style_preset_id: "preset_arcade_classic",
            mascot_id: "mascot_1",
            mascot_name: "Shape Guide",
            mascot_style_id: "style_1",
            mascot_style_name: "Flat Style",
            mascot_style_revision: 1,
            mascot_reference_url: "/mascot.png",
            logo_reference_url: null,
            identity_profile_id: identity.profile_id,
            identity_status: "reviewed",
            issues: [],
          },
          identity,
          seeds,
        }}
        project={project}
        job={null}
        busy={null}
        onCreateProject={vi.fn()}
        onAnalyzeIdentity={vi.fn()}
        onReviewIdentity={vi.fn()}
        onGenerate={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByRole("img", { name: "Flat Style" }).getAttribute("src")).toBe("/mascot.png");
    expect(screen.getByText("Identity reviewed")).toBeDefined();
    expect(screen.getByRole("button", { name: "Generate scripts" })).toBeDefined();
    expect(screen.getByLabelText("Lock intro_entrance")).toBeDefined();
  });

  it("rehydrates saved creative settings instead of catalog defaults", async () => {
    const onGenerate = vi.fn().mockResolvedValue(undefined);
    const savedProject: IntroOutroScriptProject = {
      ...project,
      version: 4,
      drafts: {
        intro: {
          ...project.drafts.intro,
          target_duration_seconds: 10,
          seed_selection: {
            randomization_seed: "persisted-randomization-seed",
            selected_seed_ids: ["A07", "B02", "C03", "D07"],
            locked_dimensions: ["intro_entrance", "intro_performance_tone"],
            algorithm_version: "1",
          },
        },
        outro: {
          ...project.drafts.outro,
          target_duration_seconds: 9,
          seed_selection: {
            randomization_seed: "persisted-randomization-seed",
            selected_seed_ids: ["E07", "F01", "G05"],
            locked_dimensions: ["outro_farewell"],
            algorithm_version: "1",
          },
        },
      },
    };

    render(
      <ScriptConfigureStep
        channelId="channel_1"
        stylePresetId="preset_arcade_classic"
        contextBundle={{
          context: {
            channel_id: "channel_1",
            style_preset_id: "preset_arcade_classic",
            mascot_id: "mascot_1",
            mascot_name: "Shape Guide",
            mascot_style_id: "style_1",
            mascot_style_name: "Flat Style",
            mascot_style_revision: 1,
            mascot_reference_url: "/mascot.png",
            logo_reference_url: null,
            identity_profile_id: identity.profile_id,
            identity_status: "reviewed",
            issues: [],
          },
          identity,
          seeds,
        }}
        project={savedProject}
        job={null}
        busy={null}
        onCreateProject={vi.fn()}
        onAnalyzeIdentity={vi.fn()}
        onReviewIdentity={vi.fn()}
        onGenerate={onGenerate}
        onRefresh={vi.fn()}
      />,
    );

    const durations = screen.getAllByLabelText("Duration") as HTMLSelectElement[];
    expect(durations.map((select) => select.value)).toEqual(["10", "9"]);
    expect((screen.getByLabelText("intro entrance") as HTMLSelectElement).value).toBe("A07");
    expect((screen.getByLabelText("intro brand interaction") as HTMLSelectElement).value).toBe("B02");
    expect((screen.getByLabelText("intro performance tone") as HTMLSelectElement).value).toBe("C03");
    expect((screen.getByLabelText("intro verbal hook") as HTMLSelectElement).value).toBe("D07");
    expect((screen.getByLabelText("outro recognition") as HTMLSelectElement).value).toBe("E07");
    expect((screen.getByLabelText("outro invitation") as HTMLSelectElement).value).toBe("F01");
    expect((screen.getByLabelText("outro farewell") as HTMLSelectElement).value).toBe("G05");
    expect(screen.getByRole("button", { name: "Unlock intro_entrance" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Unlock intro_performance_tone" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Unlock outro_farewell" })).toBeDefined();

    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Generate scripts" })));

    expect(onGenerate).toHaveBeenCalledWith([
      {
        clip_kind: "intro",
        duration_seconds: 10,
        randomization_seed: "persisted-randomization-seed",
        selected_seed_ids: ["A07", "B02", "C03", "D07"],
        locked_dimensions: ["intro_entrance", "intro_performance_tone"],
      },
      {
        clip_kind: "outro",
        duration_seconds: 9,
        randomization_seed: "persisted-randomization-seed",
        selected_seed_ids: ["E07", "F01", "G05"],
        locked_dimensions: ["outro_farewell"],
      },
    ]);
  });

  it("shows live identity analysis state and prevents generation while review is pending", () => {
    const job: IntroOutroScriptJob = {
      schema_version: 1,
      job_id: "job_1",
      channel_id: "channel_1",
      project_id: null,
      type: "identity_analysis",
      requested_clip_kinds: [],
      status: "running",
      step: "Inspecting mascot style reference",
      error_code: null,
      error_message: null,
      result_revision_ids: [],
      failed_clip_kinds: [],
      clip_errors: [],
      submitted_project_version: null,
      idempotency_key: "identity-key",
      request_fingerprint: "c".repeat(64),
      created_at: now,
      started_at: now,
      completed_at: null,
    };
    render(
      <ScriptConfigureStep
        channelId="channel_1"
        stylePresetId="preset_arcade_classic"
        contextBundle={{
          context: {
            channel_id: "channel_1",
            style_preset_id: "preset_arcade_classic",
            mascot_id: "mascot_1",
            mascot_name: "Shape Guide",
            mascot_style_id: "style_1",
            mascot_style_name: "Flat Style",
            mascot_style_revision: 1,
            mascot_reference_url: "/mascot.png",
            logo_reference_url: null,
            identity_profile_id: identity.profile_id,
            identity_status: "needs_review",
            issues: [{ code: "IDENTITY_REVIEW_REQUIRED", message: "Review identity first.", blocking: true }],
          },
          identity: { ...identity, status: "needs_review", reviewed_at: null },
          seeds,
        }}
        project={project}
        job={job}
        busy={null}
        onCreateProject={vi.fn()}
        onAnalyzeIdentity={vi.fn()}
        onReviewIdentity={vi.fn()}
        onGenerate={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByText("Inspecting mascot style reference")).toBeDefined();
    expect((screen.getByText("Inspecting mascot style reference").closest("button") as HTMLButtonElement).disabled).toBe(true);
  });

  it("autosaves structured edits and exposes revision approval and prompt export", async () => {
    vi.useFakeTimers();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <ScriptReviewStep
        project={project}
        revisions={[revision]}
        job={null}
        busy={null}
        onSave={onSave}
        onCheckpoint={vi.fn()}
        onValidate={vi.fn().mockResolvedValue([])}
        onApprove={vi.fn()}
        onCopyPrompt={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByDisplayValue("Enter"), { target: { value: "Slide into frame" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900);
    });
    expect(onSave).toHaveBeenCalledWith(
      "intro",
      expect.objectContaining({
        timeline: expect.arrayContaining([expect.objectContaining({ action: "Slide into frame" })]),
      }),
    );
    expect(screen.getByRole("button", { name: /Copy prompt/i })).toBeDefined();
    expect(screen.getByText("Approved")).toBeDefined();
  });

  it("keeps validation and navigation on the saved draft and supports retry after a save failure", async () => {
    vi.useFakeTimers();
    const onSave = vi.fn().mockRejectedValueOnce(new Error("Temporary error")).mockResolvedValue(undefined);
    const onValidate = vi.fn().mockResolvedValue([]);
    const onDraftPendingChange = vi.fn();
    const props = {
      project,
      revisions: [revision],
      job: null,
      busy: null,
      onSave,
      onCheckpoint: vi.fn(),
      onValidate,
      onApprove: vi.fn(),
      onCopyPrompt: vi.fn(),
      onDraftPendingChange,
    };
    const view = render(<ScriptReviewStep {...props} />);

    fireEvent.change(screen.getByDisplayValue("Enter"), { target: { value: "Hold in frame" } });
    expect((screen.getByRole("button", { name: "Validate" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("tab", { name: "Outro" }) as HTMLButtonElement).disabled).toBe(true);
    expect(onDraftPendingChange).toHaveBeenLastCalledWith(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(900);
    });
    expect(screen.getByRole("button", { name: "Retry save" })).toBeDefined();
    expect(screen.getByDisplayValue("Hold in frame")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Retry save" }));
    await act(async () => {
      await Promise.resolve();
    });
    const savedContent = onSave.mock.calls[1][1] as IntroOutroScriptContent;
    view.rerender(
      <ScriptReviewStep
        {...props}
        project={{ ...project, drafts: { ...project.drafts, intro: { ...project.drafts.intro, content: savedContent } } }}
      />,
    );
    expect((screen.getByRole("button", { name: "Validate" }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Validate" }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(onValidate).toHaveBeenCalledWith("intro");
    expect(onSave).toHaveBeenCalledTimes(2);
  });

  it("shows AI review findings and blocks approval when a finding is an error", () => {
    const reviewedRevision: IntroOutroScriptRevision = {
      ...revision,
      template_version: "intro-outro-script-v3",
      quality_review: {
        version: "script-quality-v1",
        requested_model: "gemini-flash",
        reviewed_at: now,
        content_fingerprint: "f".repeat(64),
        findings: [{ code: "ACTION_OVERLOAD", severity: "error", path: "timeline.2", message: "Simplify the closing action." }],
      },
    };
    render(
      <ScriptReviewStep
        project={{ ...project, approved_revision_ids: { intro: null, outro: null } }}
        revisions={[reviewedRevision]}
        job={null}
        busy={null}
        onSave={vi.fn()}
        onCheckpoint={vi.fn()}
        onValidate={vi.fn()}
        onApprove={vi.fn()}
        onCopyPrompt={vi.fn()}
      />,
    );
    expect(screen.getByText("Simplify the closing action.")).toBeDefined();
    expect((screen.getByRole("button", { name: "Approve" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("list", { name: "AI review findings" })).toBeDefined();
  });

  it("shows a saved revision issue only once when the draft already displays it", () => {
    const issue = {
      code: "QUALITY_REVIEW_UNAVAILABLE",
      severity: "warning" as const,
      path: "quality_review",
      message: "AI production review did not complete.",
    };
    const unreviewedRevision: IntroOutroScriptRevision = {
      ...revision,
      template_version: "intro-outro-script-v3",
      validation_issues: [issue],
    };
    const unreviewedProject: IntroOutroScriptProject = {
      ...project,
      approved_revision_ids: { intro: null, outro: null },
      drafts: {
        ...project.drafts,
        intro: { ...project.drafts.intro, validation_issues: [issue] },
      },
    };

    render(
      <ScriptReviewStep
        project={unreviewedProject}
        revisions={[unreviewedRevision]}
        job={null}
        busy={null}
        onSave={vi.fn()}
        onCheckpoint={vi.fn()}
        onValidate={vi.fn()}
        onApprove={vi.fn()}
        onCopyPrompt={vi.fn()}
      />,
    );

    expect(screen.getAllByText(issue.message)).toHaveLength(1);
    expect((screen.getByRole("button", { name: "Approve" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("marks approved upload links without requiring both scripts", () => {
    const onUpload = vi.fn();
    render(<ScriptUploadStep project={project} onUpload={onUpload} />);
    expect(screen.getByText("Intro approved and ready to link")).toBeDefined();
    expect(screen.getByText("Outro will be uploaded without a script link")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Select videos" }));
    expect(onUpload).toHaveBeenCalledWith({
      projectId: project.project_id,
      introRevisionId: "revision_intro",
    });
  });
});
