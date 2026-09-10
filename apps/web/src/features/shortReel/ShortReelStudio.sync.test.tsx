import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { api } from "../../api";
import * as clientModule from "../../api/client";
import { ShortReelStudio } from "./ShortReelStudio";
import {
  createMockChannel,
  createMockReadyUnits,
  createMockScript,
  createMockShortReel,
} from "../../../test/helpers/shortReelStudioTestUtils";
import type { ShortReelRecord, Task, TaskEvent } from "@studio/shared";

describe("ShortReelStudio Synchronization & Resilience (U03–U07)", () => {
  let eventCallback: ((event: TaskEvent) => void) | null = null;

  beforeEach(() => {
    window.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    window.URL.revokeObjectURL = vi.fn();
    eventCallback = null;
    vi.spyOn(clientModule, "subscribeEvents").mockImplementation((cb) => {
      eventCallback = cb;
      return () => {
        eventCallback = null;
      };
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // Scenario 1 (U04): GET A starts, GET B returns newer revision, then A returns older revision: B remains displayed
  it("discards out-of-order older revision responses when a newer revision has already resolved (U04)", async () => {
    const channel = createMockChannel();
    const rev1Reel = createMockShortReel({ revision: 1, topic: { ...createMockShortReel().topic, title: "Revision 1 Title" } });
    const rev2Reel = createMockShortReel({ revision: 2, topic: { ...createMockShortReel().topic, title: "Revision 2 Title" } });

    let resolveRev1: ((val: { short_reel: ShortReelRecord }) => void) | null = null;
    let resolveRev2: ((val: { short_reel: ShortReelRecord }) => void) | null = null;

    let callCount = 0;
    vi.spyOn(api, "getShortReel").mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return new Promise((resolve) => {
          resolveRev1 = resolve;
        });
      }
      return new Promise((resolve) => {
        resolveRev2 = resolve;
      });
    });

    render(<ShortReelStudio channel={channel} reelId="sreel_test_999" onBack={vi.fn()} onNotice={vi.fn()} />);

    // Trigger second read via online event
    fireEvent(window, new Event("online"));

    // Resolve rev 2 first
    act(() => {
      resolveRev2?.({ short_reel: rev2Reel });
    });

    await waitFor(() => {
      expect(screen.getByText("Revision 2 Title")).toBeDefined();
    });

    // Now resolve rev 1 (stale/older)
    act(() => {
      resolveRev1?.({ short_reel: rev1Reel });
    });

    // Revision 2 must remain displayed; Revision 1 is ignored
    expect(screen.getByText("Revision 2 Title")).toBeDefined();
    expect(screen.queryByText("Revision 1 Title")).toBeNull();
  });

  // Scenario 2 (U04): Switching reel IDs discards late resolution of previous reel
  it("discards late responses for a previous reel after target reel switch (U04)", async () => {
    const channel = createMockChannel();
    const reelA = createMockShortReel({ reel_id: "sreel_A", topic: { ...createMockShortReel().topic, title: "Topic Reel A" } });
    const reelB = createMockShortReel({ reel_id: "sreel_B", topic: { ...createMockShortReel().topic, title: "Topic Reel B" } });

    let resolveReelA: ((val: { short_reel: ShortReelRecord }) => void) | null = null;
    vi.spyOn(api, "getShortReel").mockImplementation((_channelId, rId) => {
      if (rId === "sreel_A") {
        return new Promise((resolve) => {
          resolveReelA = resolve;
        });
      }
      return Promise.resolve({ short_reel: reelB });
    });

    const { rerender } = render(<ShortReelStudio channel={channel} reelId="sreel_A" onBack={vi.fn()} onNotice={vi.fn()} />);

    // Switch target to reel B
    rerender(<ShortReelStudio channel={channel} reelId="sreel_B" onBack={vi.fn()} onNotice={vi.fn()} />);

    // Reel B loads
    await waitFor(() => {
      expect(screen.getByText("Topic Reel B")).toBeDefined();
    });

    // Now resolve late response for reel A
    act(() => {
      resolveReelA?.({ short_reel: reelA });
    });

    // Reel B remains displayed; Reel A never leaks into view
    expect(screen.getByText("Topic Reel B")).toBeDefined();
    expect(screen.queryByText("Topic Reel A")).toBeNull();
  });

  // Scenario 3 (U03): Style accepted event arrives while cover is pending: style preview appears without F5
  it("updates and renders intermediate accepted style result while cover stage continues running without F5 (U03)", async () => {
    const channel = createMockChannel();
    const readyUnits = createMockReadyUnits();

    // Initial state: script ready, references running, cover pending
    const initialReel = createMockShortReel({
      revision: 1,
      units: {
        ...readyUnits,
        references: {
          state: "pending",
          last_accepted_payload: null,
          current_attempt: {
            operation_id: "op-style-running",
            dependency_fingerprint: "fp-style-running",
            started_at: new Date().toISOString(),
            completed_at: null,
            error: null,
          },
          accepted_dependency_fingerprint: null,
        },
        cover: {
          state: "pending",
          last_accepted_payload: null,
          current_attempt: null,
          accepted_dependency_fingerprint: null,
        },
      },
    });

    // Updated state with accepted style
    const updatedReel = {
      ...initialReel,
      revision: 2,
      units: {
        ...initialReel.units,
        references: {
          state: "ready" as const,
          last_accepted_payload: {
            references: [
              {
                asset_id: "ref-accepted-style-1",
                role: "style" as const,
                path: "refs/style.png",
                mime_type: "image/png",
                width: 1080,
                height: 1920,
                checksum: "checksum-style-ready",
              },
            ],
          },
          current_attempt: null,
          accepted_dependency_fingerprint: "style-fp-ready",
        },
      },
    };

    let getShortReelCalls = 0;
    vi.spyOn(api, "getShortReel").mockImplementation(() => {
      getShortReelCalls++;
      return Promise.resolve({
        short_reel: getShortReelCalls === 1 ? initialReel : updatedReel,
      });
    });

    render(<ShortReelStudio channel={channel} reelId="sreel_test_999" onBack={vi.fn()} onNotice={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("Cheetah vs Greyhound Speed")).toBeDefined());

    // Switch to Assets tab
    await waitFor(() => expect(screen.getByRole("tab", { name: /Assets/i })).toBeDefined());
    fireEvent.click(screen.getByRole("tab", { name: /Assets/i }));

    // Dispatch realtime task update event indicating style stage ready and record_revision advanced
    act(() => {
      eventCallback?.({
        type: "task.updated",
        task: {
          task_id: "task-001",
          task_type: "GENERATE_SHORT_REEL_PACKAGE",
          status: "RUNNING",
          channel_id: channel.channel_id,
          episode_id: null,
          reel_id: "sreel_test_999",
          progress_message: "Style reference accepted. Generating cover...",
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
          short_reel_progress: {
            stages: [
              { stage: "script", state: "completed", message: "Script ready" },
              { stage: "style", state: "completed", message: "Style accepted" },
              { stage: "cover", state: "running", message: "Generating cover" },
              { stage: "publishing", state: "pending", message: "Publishing pending" },
            ],
            record_revision: 2,
          },
        },
      });
    });

    // Verify style preview appears without manual refresh
    await waitFor(() => {
      const styleImg = screen.getByAltText("Short-Reel 9:16 portrait style reference");
      expect(styleImg.getAttribute("src")).toContain("ref-accepted-style-1");
    });
  });

  // Scenario 4 (U05): Fallback polling reconciles missed task event and stops at terminal state
  it("executes bounded fallback polling while task is active and stops at terminal state (U05)", async () => {
    vi.useFakeTimers();
    const channel = createMockChannel();
    const mockReel = createMockShortReel({ units: createMockReadyUnits() });

    const activeTask: Task = {
      task_id: "task-active-poll",
      task_type: "GENERATE_SHORT_REEL_PACKAGE",
      status: "RUNNING",
      channel_id: channel.channel_id,
      episode_id: null,
      reel_id: "sreel_test_999",
      progress_message: "Processing...",
      progress_percent: 30,
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
    };

    const terminalTask: Task = {
      ...activeTask,
      status: "COMPLETED",
      progress_message: "Complete",
      progress_percent: 100,
      completed_at: new Date().toISOString(),
    };

    let pollCount = 0;
    vi.spyOn(api, "getShortReel").mockImplementation(() => {
      pollCount++;
      return Promise.resolve({
        short_reel: mockReel,
        task: pollCount <= 2 ? activeTask : terminalTask,
      });
    });

    render(<ShortReelStudio channel={channel} reelId="sreel_test_999" onBack={vi.fn()} onNotice={vi.fn()} />);

    // Fast-forward initial mount
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(pollCount).toBe(1);

    // Advance 3000ms: poll 2 fires
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(pollCount).toBe(2);

    // Advance another 3000ms: poll 3 fires (returns terminalTask)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(pollCount).toBe(3);

    // Advance another 6000ms: polling has stopped because task is COMPLETED
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    expect(pollCount).toBe(3);

    vi.useRealTimers();
  });

  // Scenario 5 (U06): User types description while a style event arrives: text remains and image updates
  it("preserves dirty description draft when background asset update arrives (U06)", async () => {
    const channel = createMockChannel();
    const readyUnits = createMockReadyUnits();
    const initialReel = createMockShortReel({ revision: 1, units: readyUnits });

    const updatedReel = {
      ...initialReel,
      revision: 2,
      units: {
        ...initialReel.units,
        references: {
          ...initialReel.units.references,
          accepted_dependency_fingerprint: "new-style-fp",
        },
      },
    };

    let callCount = 0;
    vi.spyOn(api, "getShortReel").mockImplementation(() => {
      callCount++;
      return Promise.resolve({
        short_reel: callCount === 1 ? initialReel : updatedReel,
      });
    });

    render(<ShortReelStudio channel={channel} reelId="sreel_test_999" onBack={vi.fn()} onNotice={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("Cheetah vs Greyhound Speed")).toBeDefined());

    // Switch to Publishing tab
    await waitFor(() => expect(screen.getByRole("tab", { name: /Publishing/i })).toBeDefined());
    fireEvent.click(screen.getByRole("tab", { name: /Publishing/i }));

    const descInput = await screen.findByRole<HTMLTextAreaElement>("textbox", { name: "Description" });
    fireEvent.change(descInput, { target: { value: "User in-progress draft description that must not be lost." } });
    expect(descInput.value).toBe("User in-progress draft description that must not be lost.");

    // Remote task progress event arrives
    act(() => {
      eventCallback?.({
        type: "task.updated",
        task: {
          task_id: "task-002",
          task_type: "GENERATE_SHORT_REEL_PACKAGE",
          status: "RUNNING",
          channel_id: channel.channel_id,
          episode_id: null,
          reel_id: "sreel_test_999",
          progress_message: "Style accepted",
          progress_percent: 60,
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
    });

    // Verification: user draft text is completely preserved
    await waitFor(() => {
      expect(descInput.value).toBe("User in-progress draft description that must not be lost.");
    });
  });

  // Scenario 8 (U07): Rapid double click submits once
  it("prevents duplicate submissions on rapid double click of Generate button (U07)", async () => {
    const channel = createMockChannel();
    const mockReel = createMockShortReel({ script: createMockScript(), units: createMockReadyUnits() });
    vi.spyOn(api, "getShortReel").mockResolvedValue({ short_reel: mockReel });

    const generateSpy = vi.spyOn(api, "generateShortReel").mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                task: {
                  task_id: "task-double-click",
                  task_type: "GENERATE_SHORT_REEL_PACKAGE",
                  status: "RUNNING",
                  channel_id: channel.channel_id,
                  episode_id: null,
                  reel_id: "sreel_test_999",
                  progress_message: "Starting...",
                  progress_percent: 5,
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
              }),
            100,
          );
        }),
    );

    render(<ShortReelStudio channel={channel} reelId="sreel_test_999" onBack={vi.fn()} onNotice={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("Cheetah vs Greyhound Speed")).toBeDefined());

    const generateBtn = screen.getByRole("button", { name: /generate full package/i });

    // Rapid double click
    fireEvent.click(generateBtn);
    fireEvent.click(generateBtn);

    // Verify it was only invoked once
    expect(generateSpy).toHaveBeenCalledTimes(1);
  });
});
