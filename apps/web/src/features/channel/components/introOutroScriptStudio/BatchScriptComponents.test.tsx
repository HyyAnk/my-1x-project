import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { IntroOutroScriptJob, IntroOutroScriptProject } from "@studio/shared";
import { ActiveJobsBanner } from "./ActiveJobsBanner";
import { BatchGenerateModal } from "./BatchGenerateModal";
import { BatchReviewMatrix } from "./BatchReviewMatrix";

afterEach(() => {
  cleanup();
});

const sampleProject: IntroOutroScriptProject = {
  schema_version: 1,
  project_id: "proj_1",
  channel_id: "chan_1",
  style_preset_id: "preset_arcade_classic",
  name: "Batch Concept #1",
  version: 1,
  archived: false,
  drafts: {
    intro: {
      clip_kind: "intro",
      target_duration_seconds: 8,
      seed_selection: null,
      content: {
        production: { clip_kind: "intro", language: "English", aspect_ratio: "16:9", target_duration_seconds: 8 },
        identity: { profile_id: "id_1", mascot_id: "m_1", mascot_style_id: "ms_1", required_feature_ids: [] },
        style: { description: "arcade", palette: [], staging: "center", motion_language: "bouncy" },
        timeline: [
          { beat: 1, role: "hook", start_seconds: 0, end_seconds: 3, action: "Wave excitedly at the screen", capability_ids: [], props: [], visible_feature_ids: [] },
          { beat: 2, role: "build", start_seconds: 3, end_seconds: 6, action: "Point to game countdown", capability_ids: [], props: [], visible_feature_ids: [] },
          { beat: 3, role: "payoff", start_seconds: 6, end_seconds: 8, action: "Final victory pose", capability_ids: [], props: [], visible_feature_ids: [] },
        ],
        voiceover: { enabled: true, lines: [] },
        audio: { music_direction: "upbeat", events: [] },
        camera: [{ start_seconds: 0, end_seconds: 8, framing: "medium", movement: "static" }],
        consistency: { preserve_feature_ids: [], allowed_visible_text: [], restrictions: [] },
      },
      validation_issues: [],
      source_revision_id: "rev_intro_1",
      updated_at: "2026-09-25T00:00:00.000Z",
    },
    outro: {
      clip_kind: "outro",
      target_duration_seconds: 8,
      seed_selection: null,
      content: null,
      validation_issues: [],
      source_revision_id: null,
      updated_at: "2026-09-25T00:00:00.000Z",
    },
  },
  revision_ids: ["rev_intro_1"],
  approved_revision_ids: { intro: null, outro: null },
  created_at: "2026-09-25T00:00:00.000Z",
  updated_at: "2026-09-25T00:00:00.000Z",
};

describe("BatchGenerateModal", () => {
  it("submits the batch configuration with selected count and options", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(<BatchGenerateModal isOpen={true} onClose={onClose} onSubmit={onSubmit} busy={false} />);

    expect(screen.getByText("Batch Script Generation")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "10 pairs" }));
    fireEvent.change(screen.getByLabelText("Project naming prefix (optional)"), {
      target: { value: "Special Series" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Generate 10 Pairs" }));
    expect(onSubmit).toHaveBeenCalledWith({
      count: 10,
      strategy: "random_seeds",
      locked_seed_ids: [],
      durations: { intro: 8, outro: 8 },
      included_clips: ["intro", "outro"],
      logo_mode: "supplied_reference",
      naming_prefix: "Special Series",
    });
  });
});

describe("BatchReviewMatrix", () => {
  it("renders projects and triggers approve action", async () => {
    const onSelect = vi.fn();
    const onApprove = vi.fn().mockResolvedValue(undefined);
    const onOpenBatch = vi.fn();

    render(
      <BatchReviewMatrix
        projects={[sampleProject]}
        activeJobs={[]}
        currentProjectId="proj_1"
        onSelectProject={onSelect}
        onOpenBatchModal={onOpenBatch}
        onApproveProject={onApprove}
        busy={null}
      />,
    );

    expect(screen.getByText("Batch Concept #1")).toBeDefined();
    expect(screen.getByText(/Wave excitedly at the screen/)).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /Approve All Ready/ }));
    expect(onApprove).toHaveBeenCalledWith("proj_1");
  });
});

describe("ActiveJobsBanner", () => {
  it("renders multi-job banner when multiple jobs are active", () => {
    const jobs: IntroOutroScriptJob[] = [
      {
        schema_version: 1,
        job_id: "job_1",
        channel_id: "chan_1",
        project_id: "proj_1",
        type: "script_generation",
        requested_clip_kinds: ["intro"],
        status: "running",
        step: "Writing intro script (1/3)",
        error_code: null,
        error_message: null,
        result_revision_ids: [],
        failed_clip_kinds: [],
        clip_errors: [],
        submitted_project_version: 1,
        idempotency_key: "k1",
        request_fingerprint: null,
        created_at: "2026-09-25T00:00:00.000Z",
        started_at: "2026-09-25T00:00:01.000Z",
        completed_at: null,
      },
      {
        schema_version: 1,
        job_id: "job_2",
        channel_id: "chan_1",
        project_id: "proj_2",
        type: "script_generation",
        requested_clip_kinds: ["intro"],
        status: "queued",
        step: "Queued",
        error_code: null,
        error_message: null,
        result_revision_ids: [],
        failed_clip_kinds: [],
        clip_errors: [],
        submitted_project_version: 1,
        idempotency_key: "k2",
        request_fingerprint: null,
        created_at: "2026-09-25T00:00:00.000Z",
        started_at: null,
        completed_at: null,
      },
    ];

    render(
      <ActiveJobsBanner
        currentJob={jobs[0]}
        activeJobs={jobs}
        onCancelJob={vi.fn()}
      />,
    );

    expect(screen.getByText(/2 jobs in progress/)).toBeDefined();
  });
});
