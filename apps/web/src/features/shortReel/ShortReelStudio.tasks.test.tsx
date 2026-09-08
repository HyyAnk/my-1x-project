import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { api } from "../../api";
import * as clientModule from "../../api/client";
import { ShortReelStudio } from "./ShortReelStudio";
import {
  createMockChannel,
  createMockReadyUnits,
  createMockScript,
  createMockShortReel,
} from "../../../test/helpers/shortReelStudioTestUtils";
import type { ShortReelRecord, TaskEvent } from "@studio/shared";

describe("ShortReelStudio Generation Tasks And Studio Tabs", () => {
  beforeEach(() => {
    window.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    window.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // UI-03: Asynchronous Generation & Cancellation
  it("triggers asynchronous package generation and supports cancellation", async () => {
    const channel = createMockChannel();
    const mockReel = createMockShortReel({ script: createMockScript() });
    vi.spyOn(api, "getShortReel").mockResolvedValue({ short_reel: mockReel });
    const generateSpy = vi.spyOn(api, "generateShortReel").mockResolvedValue({
      task: {
        task_id: "task-shortreel-001",
        task_type: "GENERATE_SHORT_REEL_PACKAGE",
        status: "RUNNING",
        channel_id: channel.channel_id,
        episode_id: null,
        reel_id: "sreel_test_999",
        progress_message: "Generating references and script...",
        progress_percent: 25,
        created_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
        completed_at: null,
        codex_thread_id: null,
        codex_turn_id: null,
        error: null,
        output_files: [],
        lock_key: "sreel_test_999:reel",
        queue_position: null,
        render_progress: null,
        scene_number: null,
        accumulated_duration_seconds: 0,
      },
      short_reel: mockReel,
    });
    const cancelSpy = vi.spyOn(api, "cancelShortReel").mockResolvedValue({
      acknowledged: true,
      short_reel: mockReel,
      task: {
        task_id: "task-shortreel-001",
        task_type: "GENERATE_SHORT_REEL_PACKAGE",
        status: "CANCELLED",
        channel_id: channel.channel_id,
        episode_id: null,
        reel_id: "sreel_test_999",
        progress_message: "Generation cancelled by user",
        progress_percent: 25,
        created_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        codex_thread_id: null,
        codex_turn_id: null,
        error: null,
        output_files: [],
        lock_key: "sreel_test_999:reel",
        queue_position: null,
        render_progress: null,
        scene_number: null,
        accumulated_duration_seconds: 0,
      },
    });

    const onNotice = vi.fn();

    const { getByRole, getByText } = render(
      <ShortReelStudio channel={channel} reelId="sreel_test_999" onBack={vi.fn()} onNotice={onNotice} />,
    );

    await waitFor(() => expect(getByText("Cheetah vs Greyhound Speed")).toBeDefined());

    // Click Generate Package
    const generateBtn = getByRole("button", { name: /generate full package/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(generateSpy).toHaveBeenCalledWith(
        channel.channel_id,
        "sreel_test_999",
        expect.objectContaining({ target: "package", expected_revision: 1 }),
      );
    });

    // Verify generation status banner and Cancel button appear
    await waitFor(() => {
      expect(getByText("Generation In Progress")).toBeDefined();
      expect(getByRole("button", { name: /cancel active generation/i })).toBeDefined();
    });

    // Click Cancel button
    const cancelBtn = getByRole("button", { name: /cancel active generation/i });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(cancelSpy).toHaveBeenCalledWith(
        channel.channel_id,
        "sreel_test_999",
        expect.objectContaining({ operation_id: "task-shortreel-001" }),
      );
    });
  });

  // UI-06: Studio Tab Navigation & Stale Indicators
  it("supports tab navigation and shows stale warnings for downstream segments", async () => {
    const mockReel = createMockShortReel({
      script: createMockScript(),
      stale_segments: [2],
    });
    vi.spyOn(api, "getShortReel").mockResolvedValue({ short_reel: mockReel });
    const channel = createMockChannel();

    const { getByRole, getByText } = render(
      <ShortReelStudio channel={channel} reelId="sreel_test_999" onBack={vi.fn()} onNotice={vi.fn()} />,
    );

    await waitFor(() => expect(getByText("Cheetah vs Greyhound Speed")).toBeDefined());

    // Verify Segment 2 shows Stale badge in tabs
    expect(getByText("Segment 2")).toBeDefined();
    const seg2Tab = getByRole("tab", { name: /segment 2/i });
    expect(seg2Tab.textContent).toContain("Stale");

    // Click Segment 2 tab
    fireEvent.click(seg2Tab);
    expect(getByText("Downstream Segment Stale")).toBeDefined();

    // Switch to Assets & Prompts tab
    const assetsTab = getByRole("tab", { name: /assets & prompts/i });
    fireEvent.click(assetsTab);
    await waitFor(() => {
      expect(getByText("Visual References")).toBeDefined();
      expect(getByText("Cover Image")).toBeDefined();
    });

    // Switch to Publishing Metadata tab
    const pubTab = getByRole("tab", { name: /publishing metadata/i });
    fireEvent.click(pubTab);
    await waitFor(() => {
      expect(getByText("Publishing & Distribution")).toBeDefined();
      expect(getByText("Hook Statement")).toBeDefined();
    });
  });

  // UI-08: Real-time Event Subscription Task Isolation
  it("event subscription strictly ignores tasks with different reel_id even if channel_id matches", async () => {
    let capturedCallback: ((event: TaskEvent) => void) | undefined;
    vi.spyOn(clientModule, "subscribeEvents").mockImplementation((cb) => {
      capturedCallback = cb;
      return () => {};
    });

    const mockReel = createMockShortReel({ script: createMockScript() });
    vi.spyOn(api, "getShortReel").mockResolvedValue({ short_reel: mockReel });
    const channel = createMockChannel();

    const { queryByText } = render(<ShortReelStudio channel={channel} reelId="sreel_test_999" onBack={vi.fn()} onNotice={vi.fn()} />);

    await waitFor(() => expect(queryByText("Cheetah vs Greyhound Speed")).not.toBeNull());

    // Send task event with matching channel_id but DIFFERENT reel_id
    capturedCallback?.({
      type: "task.updated",
      task: {
        task_id: "unrelated-task-1",
        task_type: "GENERATE_VIDEO",
        status: "RUNNING",
        channel_id: channel.channel_id,
        episode_id: null,
        reel_id: "different_reel_id_888",
        progress_message: "Rendering unrelated episode...",
        progress_percent: 50,
        created_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
        completed_at: null,
        codex_thread_id: null,
        codex_turn_id: null,
        error: null,
        output_files: [],
        lock_key: "different_reel_id_888:reel",
        queue_position: null,
        render_progress: null,
        scene_number: null,
        accumulated_duration_seconds: 0,
      },
    });

    // Active task state is NOT set for different reel_id
    expect(queryByText("Rendering unrelated episode...")).toBeNull();
    expect(queryByText("Generation In Progress")).toBeNull();

    // Send task event with MATCHING reel_id
    capturedCallback?.({
      type: "task.updated",
      task: {
        task_id: "matching-task-1",
        task_type: "GENERATE_SHORT_REEL_PACKAGE",
        status: "RUNNING",
        channel_id: channel.channel_id,
        episode_id: null,
        reel_id: "sreel_test_999",
        progress_message: "Generating Short-Reel assets...",
        progress_percent: 50,
        created_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
        completed_at: null,
        codex_thread_id: null,
        codex_turn_id: null,
        error: null,
        output_files: [],
        lock_key: "sreel_test_999:reel",
        queue_position: null,
        render_progress: null,
        scene_number: null,
        accumulated_duration_seconds: 0,
      },
    });

    // Matching task event updates active task
    await waitFor(() => {
      expect(queryByText("Generating Short-Reel assets...")).not.toBeNull();
      expect(queryByText("Generation In Progress")).not.toBeNull();
    });
  });

  // UI-09: Hashtag Comma Trapping Prevention
  it("hashtag input allows typing commas and multiple tags without comma trapping", async () => {
    const mockReel = createMockShortReel({
      script: createMockScript(),
      units: createMockReadyUnits(),
    });
    vi.spyOn(api, "getShortReel").mockResolvedValue({ short_reel: mockReel });
    const updateSpy = vi.spyOn(api, "updateShortReel").mockResolvedValue({
      short_reel: mockReel,
    });
    const channel = createMockChannel();

    const { getByRole, getByLabelText } = render(
      <ShortReelStudio channel={channel} reelId="sreel_test_999" onBack={vi.fn()} onNotice={vi.fn()} />,
    );

    await waitFor(() => expect(getByRole("tab", { name: /publishing metadata/i })).toBeDefined());

    // Switch to Publishing tab
    fireEvent.click(getByRole("tab", { name: /publishing metadata/i }));

    const hashtagInput = getByLabelText("Hashtags (comma-separated)") as HTMLInputElement;

    // Type with trailing comma - comma should NOT vanish
    fireEvent.change(hashtagInput, { target: { value: "shorts, " } });
    expect(hashtagInput.value).toBe("shorts, ");

    // Continue typing multiple tags
    fireEvent.change(hashtagInput, { target: { value: "shorts, trivia, #wildlife" } });
    expect(hashtagInput.value).toBe("shorts, trivia, #wildlife");

    // Trigger blur to normalize
    fireEvent.blur(hashtagInput);
    expect(hashtagInput.value).toBe("shorts, trivia, wildlife");

    // Save publishing details
    const saveBtn = getByRole("button", { name: /save publishing/i });
    fireEvent.click(saveBtn);

    await waitFor(() => expect(updateSpy).toHaveBeenCalled());
    const updateRequest = updateSpy.mock.calls.at(-1)?.[2];
    expect(updateRequest?.command.kind).toBe("update_publishing");
    if (updateRequest?.command.kind !== "update_publishing") throw new Error("Expected an update_publishing command");
    expect(updateRequest.command.publishing.hashtags).toEqual(["shorts", "trivia", "wildlife"]);
  });

  // UI-10: Script Tab Generate Script Action
  it("renders Generate Script button in Script tab and header when script is missing", async () => {
    const missingScriptReel: ShortReelRecord = {
      ...createMockShortReel(),
      script: null,
      units: {
        ...createMockShortReel().units,
        script: { state: "missing", last_accepted_payload: null, current_attempt: null },
      },
    };
    vi.spyOn(api, "getShortReel").mockResolvedValue({ short_reel: missingScriptReel });
    const generateSpy = vi.spyOn(api, "generateShortReel").mockResolvedValue({
      task: {
        task_id: "task-script-1",
        task_type: "GENERATE_SHORT_REEL",
        status: "RUNNING",
        channel_id: "ch_1",
        episode_id: null,
        reel_id: missingScriptReel.reel_id,
        progress_message: "Generating script...",
        progress_percent: 10,
        created_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
        completed_at: null,
        codex_thread_id: null,
        codex_turn_id: null,
        error: null,
        output_files: [],
        lock_key: `${missingScriptReel.reel_id}:reel`,
        queue_position: null,
        render_progress: null,
        scene_number: null,
        accumulated_duration_seconds: 0,
      },
      short_reel: missingScriptReel,
    });
    const channel = createMockChannel({ channel_id: "ch_1" });

    const { getAllByRole, getByText } = render(
      <ShortReelStudio channel={channel} reelId={missingScriptReel.reel_id} onBack={vi.fn()} onNotice={vi.fn()} />,
    );

    await waitFor(() => expect(getByText("Cheetah vs Greyhound Speed")).toBeDefined());

    // Both the header and the empty script tab have a "Generate Script" button
    const generateScriptButtons = getAllByRole("button", { name: /generate script/i });
    expect(generateScriptButtons.length).toBeGreaterThanOrEqual(1);

    // Click Generate Script in empty tab
    fireEvent.click(generateScriptButtons[generateScriptButtons.length - 1]);

    await waitFor(() => {
      expect(generateSpy).toHaveBeenCalledWith("ch_1", missingScriptReel.reel_id, expect.objectContaining({ target: "script" }));
    });
  });

  // UI-11: Duration & Cue Clamping
  it("safely handles duration changes, clamping cues and preventing NaN propagation", async () => {
    const script = createMockScript();
    script.segments[0] = {
      ...script.segments[0],
      duration_seconds: 10,
      text_cues: [{ role: "question", text: "Question text", start_seconds: 1, end_seconds: 9.5 }],
    };
    const mockReel = createMockShortReel({ script });
    vi.spyOn(api, "getShortReel").mockResolvedValue({ short_reel: mockReel });
    const channel = createMockChannel();

    const { getByLabelText } = render(<ShortReelStudio channel={channel} reelId="sreel_test_999" onBack={vi.fn()} onNotice={vi.fn()} />);

    await waitFor(() => expect(getByLabelText(/duration/i)).toBeDefined());

    const durationInput = getByLabelText(/duration/i) as HTMLInputElement;
    const cueEndInput = getByLabelText("Cue 1 end seconds") as HTMLInputElement;

    expect(durationInput.value).toBe("10");
    expect(cueEndInput.value).toBe("9.5");

    // Clearing duration input should not propagate NaN or 0
    fireEvent.change(durationInput, { target: { value: "" } });
    expect(durationInput.value).not.toBe("NaN");
    expect(durationInput.value).not.toBe("0");

    // Reduce duration to 8 seconds -> cue end_seconds (9.5) must automatically clamp to <= 8
    fireEvent.change(durationInput, { target: { value: "8" } });
    expect(durationInput.value).toBe("8");
    expect(parseFloat(cueEndInput.value)).toBeLessThanOrEqual(8);

    // Cue timing editing
    fireEvent.change(cueEndInput, { target: { value: "7.5" } });
    expect(cueEndInput.value).toBe("7.5");
  });
});
