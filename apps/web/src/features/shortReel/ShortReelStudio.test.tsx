import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { api } from "../../api";
import { ApiError } from "../../api/client";
import * as clientModule from "../../api/client";
import { ShortReelStudio } from "./ShortReelStudio";
import { createMockChannel, createMockShortReel } from "../../../test/helpers/shortReelFixture";
import type { ReelScript, ShortReelRecord, TaskEvent } from "@studio/shared";
import type { Notice } from "../../components/types";

const createNoticeSpy = () => vi.fn<(notice: NonNullable<Notice>) => void>();

function createMockScript(): ReelScript {
  return {
    segments: [
      {
        index: 1,
        mode: "generate",
        duration_seconds: 8,
        narrative: "Two animals line up at the starting mark, ready for a sprint duel.",
        text_cues: [
          {
            role: "question",
            text: "Which animal has the fastest recorded land sprint speed?",
            start_seconds: 0.5,
            end_seconds: 5.5,
          },
        ],
        audio_direction: "Upbeat electronic countdown tension.",
        start_state: {
          character_identity: "Novy",
          position: "center",
          action: "announcing",
          camera: "wide",
          environment: "savannah track",
          props: [],
          visible_text: [],
          revealed_facts: [],
        },
        end_state: {
          character_identity: "Novy",
          position: "center",
          action: "dropping flag",
          camera: "wide",
          environment: "savannah track",
          props: [],
          visible_text: [],
          revealed_facts: [],
        },
      },
      {
        index: 2,
        mode: "extend",
        duration_seconds: 9,
        narrative: "The cheetah explodes out of the gate, reaching peak acceleration in seconds.",
        text_cues: [
          {
            role: "supporting",
            text: "Cheetahs can hit 60 mph in under 3 seconds!",
            start_seconds: 1,
            end_seconds: 6,
          },
        ],
        audio_direction: "Dramatic whoosh sound effect.",
        start_state: {
          character_identity: "Novy",
          position: "left",
          action: "pointing right",
          camera: "side tracking",
          environment: "savannah track",
          props: [],
          visible_text: [],
          revealed_facts: [],
        },
        end_state: {
          character_identity: "Novy",
          position: "left",
          action: "cheering",
          camera: "side tracking",
          environment: "savannah track",
          props: [],
          visible_text: [],
          revealed_facts: [],
        },
      },
      {
        index: 3,
        mode: "extend",
        duration_seconds: 8.5,
        narrative: "Cheetah crosses the finish line ahead, confirming top sprint speed.",
        text_cues: [
          {
            role: "answer",
            text: "Answer: Cheetah sprints up to 70 mph!",
            start_seconds: 1,
            end_seconds: 6,
          },
        ],
        audio_direction: "Triumphant victory chords.",
        start_state: {
          character_identity: "Novy",
          position: "finish line",
          action: "waving flag",
          camera: "close-up",
          environment: "savannah track",
          props: [],
          visible_text: [],
          revealed_facts: [],
        },
        end_state: {
          character_identity: "Novy",
          position: "finish line",
          action: "celebrating",
          camera: "close-up",
          environment: "savannah track",
          props: [],
          visible_text: [],
          revealed_facts: [],
        },
      },
    ],
  };
}

function createMockReadyUnits() {
  const script = createMockScript();
  return {
    references: {
      state: "ready" as const,
      last_accepted_payload: {
        references: [
          {
            asset_id: "ref-1",
            role: "mascot" as const,
            path: "refs/mascot.png",
            mime_type: "image/png",
            width: 1024,
            height: 1024,
            checksum: "abcdef123456",
          },
        ],
      },
      current_attempt: null,
    },
    script: {
      state: "ready" as const,
      last_accepted_payload: {
        script,
        compiled_prompts: ["Prompt 1 text", "Prompt 2 text", "Prompt 3 text"] as [string, string, string],
      },
      current_attempt: null,
    },
    cover: {
      state: "ready" as const,
      last_accepted_payload: {
        asset_id: "cover-1",
        path: "covers/cover.png",
        mime_type: "image/png",
        width: 1080 as const,
        height: 1920 as const,
        checksum: "fedcba654321",
      },
      current_attempt: null,
    },
    publishing: {
      state: "ready" as const,
      last_accepted_payload: {
        hook: "Who hits 60 mph fastest?",
        description: "Cheetah vs Greyhound speed comparison.",
        cta: "Subscribe for more nature facts!",
        hashtags: ["#animals", "#speed"],
      },
      current_attempt: null,
    },
  };
}

describe("ShortReelStudio Component", () => {
  beforeEach(() => {
    window.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    window.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // UI-01: Initial Load & Loading State
  it("displays loading state while draft is being fetched", () => {
    vi.spyOn(api, "getShortReel").mockReturnValue(new Promise(() => {}));
    const channel = createMockChannel();

    const { container } = render(<ShortReelStudio channel={channel} reelId="sreel_test_999" onBack={vi.fn()} onNotice={vi.fn()} />);

    expect(container.querySelector(".loading-state")).not.toBeNull();
  });

  it("recovers a failed draft request automatically when connectivity returns", async () => {
    vi.spyOn(api, "getShortReel")
      .mockRejectedValueOnce(new TypeError("Network unavailable"))
      .mockResolvedValueOnce({ short_reel: createMockShortReel() });
    const view = render(<ShortReelStudio channel={createMockChannel()} reelId="sreel_test_999" onBack={vi.fn()} onNotice={vi.fn()} />);
    await waitFor(() => expect(view.getByText("Failed to Load Short-Reel")).toBeDefined());
    fireEvent(window, new Event("online"));
    await waitFor(() => expect(view.getByText("Cheetah vs Greyhound Speed")).toBeDefined());
    expect(view.container.querySelector(".loading-state")).toBeNull();
  });

  it("renders draft details with trailing period stripped from title", async () => {
    const mockReel = createMockShortReel();
    vi.spyOn(api, "getShortReel").mockResolvedValue({ short_reel: mockReel });
    const channel = createMockChannel();

    const { getByText, queryByText, getByTestId } = render(
      <ShortReelStudio channel={channel} reelId="sreel_test_999" onBack={vi.fn()} onNotice={vi.fn()} />,
    );

    await waitFor(() => {
      // Clean title without trailing period
      expect(getByText("Cheetah vs Greyhound Speed")).toBeDefined();
      expect(queryByText("Cheetah vs Greyhound Speed.")).toBeNull();
    });

    // Verify badges
    expect(getByText("9:16 Short-Reel")).toBeDefined();
    expect(getByText("Rev v1")).toBeDefined();
    expect(getByText("Draft")).toBeDefined();

    // Verify Source question
    const questionEl = getByTestId("short-reel-source-question");
    expect(questionEl.textContent).toContain("Which animal has the fastest recorded land sprint speed?");

    // Verify choices
    const choiceA = getByTestId("choice-A");
    expect(choiceA.textContent).toContain("Cheetah");
    expect(choiceA.textContent).toContain("Correct Answer");

    const choiceB = getByTestId("choice-B");
    expect(choiceB.textContent).toContain("Greyhound");
    expect(choiceB.textContent).not.toContain("Correct Answer");
  });

  it("ignores an older response after the requested reel changes", async () => {
    let resolveOld!: (value: { short_reel: ReturnType<typeof createMockShortReel> }) => void;
    const oldRequest = new Promise<{ short_reel: ReturnType<typeof createMockShortReel> }>((resolve) => {
      resolveOld = resolve;
    });
    const newest = { ...createMockShortReel(), reel_id: "sreel_new", topic: { ...createMockShortReel().topic, title: "Newest Reel" } };
    vi.spyOn(api, "getShortReel").mockReturnValueOnce(oldRequest).mockResolvedValueOnce({ short_reel: newest });
    const channel = createMockChannel();
    const view = render(<ShortReelStudio channel={channel} reelId="sreel_old" onBack={vi.fn()} onNotice={vi.fn()} />);

    view.rerender(<ShortReelStudio channel={channel} reelId="sreel_new" onBack={vi.fn()} onNotice={vi.fn()} />);
    await waitFor(() => expect(view.getByText("Newest Reel")).toBeDefined());

    resolveOld({ short_reel: { ...createMockShortReel(), topic: { ...createMockShortReel().topic, title: "Stale Reel" } } });
    await Promise.resolve();
    expect(view.queryByText("Stale Reel")).toBeNull();
  });

  it("handles not-found error state and supports retry", async () => {
    const getShortReelSpy = vi
      .spyOn(api, "getShortReel")
      .mockRejectedValueOnce(new ApiError("Short-Reel not found", 404, "SHORT_REEL_NOT_FOUND"))
      .mockResolvedValueOnce({ short_reel: createMockShortReel() });

    const channel = createMockChannel();
    const onNoticeMock = vi.fn();

    const { getByText, getByRole } = render(
      <ShortReelStudio channel={channel} reelId="sreel_test_999" onBack={vi.fn()} onNotice={onNoticeMock} />,
    );

    await waitFor(() => {
      expect(getByText("Short-Reel Not Found")).toBeDefined();
    });

    expect(onNoticeMock).toHaveBeenCalledWith(expect.objectContaining({ tone: "bad", message: "Short-Reel not found" }));

    const retryBtn = getByRole("button", { name: /retry/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(getByText("Cheetah vs Greyhound Speed")).toBeDefined();
    });

    expect(getShortReelSpy).toHaveBeenCalledTimes(2);
  });

  it("uses the HTTP status instead of error-message text to classify not found", async () => {
    vi.spyOn(api, "getShortReel").mockRejectedValue(new ApiError("Draft is unavailable", 404, "SHORT_REEL_NOT_FOUND"));
    const channel = createMockChannel();
    const view = render(<ShortReelStudio channel={channel} reelId="missing" onBack={vi.fn()} onNotice={vi.fn()} />);
    await waitFor(() => expect(view.getByText("Short-Reel Not Found")).toBeDefined());
    expect(view.getByText("Draft is unavailable")).toBeDefined();
  });

  it("invokes onBack callback when clicking Back button", async () => {
    vi.spyOn(api, "getShortReel").mockResolvedValue({ short_reel: createMockShortReel() });
    const onBackMock = vi.fn();
    const channel = createMockChannel();

    const { getByRole } = render(<ShortReelStudio channel={channel} reelId="sreel_test_999" onBack={onBackMock} onNotice={vi.fn()} />);

    await waitFor(() => {
      expect(getByRole("button", { name: /back to channel/i })).toBeDefined();
    });

    fireEvent.click(getByRole("button", { name: /back to channel/i }));
    expect(onBackMock).toHaveBeenCalledTimes(1);
  });

  // UI-02: Local Draft Preservation
  it("preserves unsaved local draft edits during silent background refresh", async () => {
    const mockReel = createMockShortReel({ script: createMockScript() });
    vi.spyOn(api, "getShortReel").mockResolvedValue({ short_reel: mockReel });
    const channel = createMockChannel();

    const { getByLabelText, getByText } = render(
      <ShortReelStudio channel={channel} reelId="sreel_test_999" onBack={vi.fn()} onNotice={vi.fn()} />,
    );

    await waitFor(() => expect(getByText("Cheetah vs Greyhound Speed")).toBeDefined());

    // Edit visual narrative
    const narrativeInput = getByLabelText("Visual Narrative") as HTMLTextAreaElement;
    fireEvent.change(narrativeInput, { target: { value: "Custom user draft narrative for test." } });

    // Expect unsaved draft badge
    expect(getByText("Unsaved Draft")).toBeDefined();
    expect(narrativeInput.value).toBe("Custom user draft narrative for test.");

    // Trigger silent background refresh via online event
    fireEvent(window, new Event("online"));

    // Verify local draft is NOT overwritten by remote data
    await waitFor(() => {
      expect(narrativeInput.value).toBe("Custom user draft narrative for test.");
      expect(getByText("Unsaved Draft")).toBeDefined();
    });
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

  // UI-04: Clipboard Fallback (Permission Rejection)
  it("renders manual copy dialog when clipboard writeText is denied", async () => {
    const mockReel = createMockShortReel({
      script: createMockScript(),
      units: {
        ...createMockShortReel().units,
        publishing: {
          state: "ready",
          last_accepted_payload: {
            hook: "Who hits 60 mph fastest?",
            description: "Cheetah vs Greyhound speed comparison.",
            cta: "Subscribe for more nature facts!",
            hashtags: ["#animals", "#speed"],
          },
          current_attempt: null,
        },
      },
    });
    vi.spyOn(api, "getShortReel").mockResolvedValue({ short_reel: mockReel });
    const channel = createMockChannel();
    const onNotice = vi.fn();

    // Mock clipboard writeText rejection
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error("NotAllowedError: Clipboard access denied")),
      },
    });

    const { getByRole, getByText } = render(
      <ShortReelStudio channel={channel} reelId="sreel_test_999" onBack={vi.fn()} onNotice={onNotice} />,
    );

    await waitFor(() => expect(getByText("Cheetah vs Greyhound Speed")).toBeDefined());

    // Switch to Publishing tab
    fireEvent.click(getByRole("tab", { name: /publishing metadata/i }));

    // Click Copy Publishing Text
    await waitFor(() => expect(getByRole("button", { name: /copy publishing text/i })).toBeDefined());
    fireEvent.click(getByRole("button", { name: /copy publishing text/i }));

    // Verify manual copy dialog appears with textarea
    await waitFor(() => {
      expect(getByRole("dialog", { name: /manual copy fallback/i })).toBeDefined();
      expect(getByText("Manual Copy Fallback")).toBeDefined();
    });

    // Dismiss dialog
    fireEvent.click(getByRole("button", { name: /done/i }));
    await waitFor(() => {
      expect(document.querySelector(".short-reel-modal-overlay")).toBeNull();
    });
  });

  // UI-05: Conflict Resolution Banner
  it("preserves the original CAS revision when keeping a local draft after a remote update", async () => {
    const initialReel = createMockShortReel({ revision: 1, script: createMockScript() });
    const advancedReel: ShortReelRecord = {
      ...createMockShortReel({ revision: 2, script: createMockScript() }),
      topic: {
        ...createMockShortReel().topic,
        title: "Server Updated Title",
      },
    };

    let callCount = 0;
    vi.spyOn(api, "getShortReel").mockImplementation(() => {
      callCount++;
      return Promise.resolve({ short_reel: callCount === 1 ? initialReel : advancedReel });
    });

    const updateSpy = vi.spyOn(api, "updateShortReel").mockRejectedValue(new ApiError("Stale revision", 409, "STALE_REVISION"));

    const channel = createMockChannel();
    const onNotice = createNoticeSpy();
    const { getByLabelText, getByText, getByRole } = render(
      <ShortReelStudio channel={channel} reelId="sreel_test_999" onBack={vi.fn()} onNotice={onNotice} />,
    );

    await waitFor(() => expect(getByText("Cheetah vs Greyhound Speed")).toBeDefined());

    // Edit visual narrative to dirty draft
    const narrativeInput = getByLabelText("Visual Narrative") as HTMLTextAreaElement;
    fireEvent.change(narrativeInput, { target: { value: "My edited draft" } });
    expect(getByText("Unsaved Draft")).toBeDefined();

    // Trigger online refresh which fetches rev 2
    fireEvent(window, new Event("online"));

    // Verify Conflict Alert appears
    await waitFor(() => {
      expect(getByRole("alert")).toBeDefined();
      expect(getByText("Revision Conflict Detected")).toBeDefined();
      expect(getByText(/This Short-Reel was updated to Revision v2/i)).toBeDefined();
    });

    // Click "Keep My Draft"
    fireEvent.click(getByRole("button", { name: /keep my draft/i }));

    // Verify conflict banner dismissed and draft preserved
    await waitFor(() => {
      expect(document.querySelector(".short-reel-alert-conflict")).toBeNull();
      expect(narrativeInput.value).toBe("My edited draft");
    });

    // Saving still uses the original base revision, so the server remains the authority for conflict resolution.
    const saveBtn = getByRole("button", { name: /save segment 1/i });
    fireEvent.click(saveBtn);

    await waitFor(() => expect(updateSpy).toHaveBeenCalled());
    const updateRequest = updateSpy.mock.calls.at(-1)?.[2];
    expect(updateRequest?.expected_revision).toBe(1);
    expect(updateRequest?.command.kind).toBe("update_segment");
    if (updateRequest?.command.kind !== "update_segment") throw new Error("Expected an update_segment command");
    expect(updateRequest.command.segment_index).toBe(1);
    expect(updateRequest.command.segment.narrative).toBe("My edited draft");

    expect(onNotice).toHaveBeenCalled();
    const conflictNotice = onNotice.mock.calls.at(-1)?.[0];
    expect(conflictNotice?.tone).toBe("bad");
    expect(conflictNotice?.message).toContain("Conflict");
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

  // UI-07: Export Package Action
  it("renders accepted reference and cover bytes through scoped asset URLs with download actions", async () => {
    const reel = createMockShortReel({ script: createMockScript(), units: createMockReadyUnits() });
    vi.spyOn(api, "getShortReel").mockResolvedValue({ short_reel: reel });
    const channel = createMockChannel();
    const view = render(<ShortReelStudio channel={channel} reelId={reel.reel_id} onBack={vi.fn()} onNotice={vi.fn()} />);

    await waitFor(() => expect(view.getByRole("tab", { name: /assets/i })).toBeDefined());
    fireEvent.click(view.getByRole("tab", { name: /assets/i }));

    const referenceImage = view.getByRole("img", { name: "Mascot reference" }) as HTMLImageElement;
    const coverImage = view.getByRole("img", { name: "Short-Reel cover" }) as HTMLImageElement;
    expect(referenceImage.src).toContain(`/api/channels/${channel.channel_id}/short-reels/${reel.reel_id}/assets/ref-1`);
    expect(coverImage.src).toContain(`/api/channels/${channel.channel_id}/short-reels/${reel.reel_id}/assets/cover-1`);
    expect(view.getByRole("link", { name: "Download cover" }).getAttribute("download")).toBe("short-reel-cover.png");
  });

  it("enables export package button only when all units are ready and triggers download", async () => {
    const readyReel: ShortReelRecord = {
      ...createMockShortReel({ revision: 3, script: createMockScript() }),
      stale_segments: [],
      units: createMockReadyUnits(),
    };

    vi.spyOn(api, "getShortReel").mockResolvedValue({ short_reel: readyReel });
    const exportSpy = vi.spyOn(api, "exportPackage").mockResolvedValue(new Blob(["mock-pkzip-bytes"]));
    const channel = createMockChannel();
    const onNotice = vi.fn();

    const { getByRole, getByText } = render(
      <ShortReelStudio channel={channel} reelId="sreel_test_999" onBack={vi.fn()} onNotice={onNotice} />,
    );

    await waitFor(() => expect(getByText("Cheetah vs Greyhound Speed")).toBeDefined());

    const exportBtn = getByRole("button", { name: /export pkzip package/i });
    expect(exportBtn.hasAttribute("disabled")).toBe(false);

    // Click Export Package
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(exportSpy).toHaveBeenCalledWith(channel.channel_id, "sreel_test_999", 3);
      expect(onNotice).toHaveBeenCalledWith(expect.objectContaining({ tone: "good", message: "Package exported successfully." }));
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
