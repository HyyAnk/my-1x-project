import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { MascotMotionAnimationStep } from "./MascotMotionAnimationStep";
import { mascotAnimationApi } from "../animation/services/mascotAnimationApi";
import type { MascotProfile, MascotSlotProjection } from "@studio/shared";
import { LanguageProvider } from "../../../i18n";

const wrapper = ({ children }: { children: React.ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const mockMascot: MascotProfile = {
  id: "mascot_1",
  name: "Milo Owl",
  description: "Wise mascot",
  visual_style: "pixar_3d",
  master_prompt: "owl",
  master_image_url: "https://example.com/master.png",
  color_theme: "#06b6d4",
  actions: {
    thinking: {
      action: "thinking",
      sprite_url: "https://example.com/thinking_1.png",
      frames_count: 1,
      fps: 8,
      loop: true,
      frame_width: 512,
      frame_height: 512,
      offset_x: 0,
      offset_y: 0,
      motion_preset: "sway",
      motion_speed: 1.0,
      motion_intensity: "normal",
    },
    celebrate: {
      action: "celebrate",
      sprite_url: "https://example.com/celebrate_1.png",
      frames_count: 1,
      fps: 8,
      loop: false,
      frame_width: 512,
      frame_height: 512,
      offset_x: 0,
      offset_y: 0,
      motion_preset: "jump",
      motion_speed: 1.0,
      motion_intensity: "normal",
    },
  },
  assigned_channel_ids: [],
  created_at: "2026-08-30T00:00:00.000Z",
  updated_at: "2026-08-30T00:00:00.000Z",
};

const mockReadyRevision = {
  id: "rev_1",
  attempt: 1,
  created_at: new Date().toISOString(),
  version: 1 as const,
  style_id: "core",
  state: "thinking" as const,
  slot_index: 1,
  source_video_url: "https://example.com/video.mp4",
  atlas_url: "https://example.com/atlas.png",
  manifest_url: "https://example.com/manifest.json",
  frame_urls: Array.from({ length: 12 }, (_, i) => `https://example.com/frame_${i + 1}.png`),
  frame_count: 12 as const,
  source_fps: 24,
  playback_fps: 8 as const,
  duration_ms: 1500 as const,
  loop_mode: "loop" as const,
  canvas: { width: 1280, height: 720 },
  content_bounds: { x: 50, y: 50, width: 700, height: 350 },
  pivot: { x: 400, y: 450 },
  registration: {
    source_width: 800,
    source_height: 450,
    content_bounds: { x: 50, y: 50, width: 700, height: 350 },
    pivot: { x: 400, y: 450 },
    offset_x: 0,
    offset_y: 0,
  },
  source_fingerprint: "src_fp",
  processing_fingerprint: "proc_fp",
  status: "ready" as const,
};

const mockThinkingSlots: MascotSlotProjection[] = Array.from({ length: 10 }, (_, i) => ({
  style_id: "core",
  state: "thinking" as const,
  slot_index: i + 1,
  status: i === 0 ? ("ready" as const) : ("empty" as const),
  active_revision: i === 0 ? mockReadyRevision : null,
  updated_at: new Date().toISOString(),
}));

const mockCelebrateSlots: MascotSlotProjection[] = Array.from({ length: 10 }, (_, i) => ({
  style_id: "core",
  state: "celebrate" as const,
  slot_index: i + 1,
  status: "empty" as const,
  active_revision: null,
  updated_at: new Date().toISOString(),
}));

const mockStylesState = {
  styles: [],
  activeStyleId: "core",
  setActiveStyleId: vi.fn(),
  activeStyle: null,
  busySlotKey: null,
  batchProgress: null,
  editingMascot: mockMascot,
  handleAddStyle: vi.fn(),
  handleUpdateStyle: vi.fn(),
  handleDeleteStyle: vi.fn(),
  handleSetDefaultStyle: vi.fn(),
  handleBatchGenerateStyle: vi.fn(),
} as any;

describe("MascotMotionAnimationStep", () => {
  beforeEach(() => {
    vi.spyOn(mascotAnimationApi, "getStyleAnimationSlots").mockResolvedValue({
      ok: true,
      mascot_id: "mascot_1",
      style_id: "core",
      slots: {
        thinking: mockThinkingSlots,
        celebrate: mockCelebrateSlots,
      },
    });
  });

  it("renders Step 4 header, readiness badge, and studio controls", async () => {
    render(
      <MascotMotionAnimationStep
        effectiveMascot={mockMascot}
        genColor="#06b6d4"
        busyAction={null}
        activePreviewAction="thinking"
        setActivePreviewAction={vi.fn()}
        isPlaying={false}
        setIsPlaying={vi.fn()}
        canvasBackground="dark"
        setCanvasBackground={vi.fn()}
        canvasZoom={1.0}
        setCanvasZoom={vi.fn()}
        flipHorizontal={false}
        setFlipHorizontal={vi.fn()}
        actionMotions={{} as any}
        actionSpeeds={{} as any}
        actionIntensities={{} as any}
        calibrating={false}
        onChangeMotionPreset={vi.fn()}
        onChangeMotionSpeed={vi.fn()}
        onChangeMotionIntensity={vi.fn()}
        onResetDefaultMotions={vi.fn()}
        onSaveMotion={vi.fn()}
        onFinishMascot={vi.fn()}
        onBackStep={vi.fn()}
        activeStyle={null}
        previewStyleId={null}
        onPreviewStyleChange={vi.fn()}
        activeVariants={[]}
        selectedVariant={null}
        activeVariantIndex={0}
        onSelectVariantIndex={vi.fn()}
        stylesState={mockStylesState}
      />,
      { wrapper },
    );

    expect(screen.getByText("Step 4: Motion and Animation Preview")).toBeTruthy();
    expect(screen.getByRole("button", { name: /back to step 3/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /finish mascot/i })).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByTestId("ready-count-badge").textContent).toContain("1/20");
    });

    expect(screen.getByTestId("step4-slot-picker")).toBeTruthy();
    expect(screen.getByTestId("manifest-playback-bar")).toBeTruthy();
  });

  it("toggles between Studio Canvas and Quiz Stage (16:9 Placement) modes", async () => {
    render(
      <MascotMotionAnimationStep
        effectiveMascot={mockMascot}
        genColor="#06b6d4"
        busyAction={null}
        activePreviewAction="thinking"
        setActivePreviewAction={vi.fn()}
        isPlaying={false}
        setIsPlaying={vi.fn()}
        canvasBackground="dark"
        setCanvasBackground={vi.fn()}
        canvasZoom={1.0}
        setCanvasZoom={vi.fn()}
        flipHorizontal={false}
        setFlipHorizontal={vi.fn()}
        actionMotions={{} as any}
        actionSpeeds={{} as any}
        actionIntensities={{} as any}
        calibrating={false}
        onChangeMotionPreset={vi.fn()}
        onChangeMotionSpeed={vi.fn()}
        onChangeMotionIntensity={vi.fn()}
        onResetDefaultMotions={vi.fn()}
        onSaveMotion={vi.fn()}
        onFinishMascot={vi.fn()}
        onBackStep={vi.fn()}
        activeStyle={null}
        previewStyleId={null}
        onPreviewStyleChange={vi.fn()}
        activeVariants={[]}
        selectedVariant={null}
        activeVariantIndex={0}
        onSelectVariantIndex={vi.fn()}
        stylesState={mockStylesState}
      />,
      { wrapper },
    );

    await waitFor(() => {
      expect(screen.getByTestId("manifest-frame-canvas")).toBeTruthy();
    });

    // Switch to Quiz Stage mode
    const stageBtn = screen.getByTestId("mode-stage-btn");
    fireEvent.click(stageBtn);

    expect(screen.getByTestId("quiz-stage-preview")).toBeTruthy();
    expect(screen.getByTestId("placement-settings-controls")).toBeTruthy();

    // Switch back to Canvas mode
    const canvasBtn = screen.getByTestId("mode-canvas-btn");
    fireEvent.click(canvasBtn);

    expect(screen.getByTestId("manifest-frame-canvas")).toBeTruthy();
  });

  it("toggles play/pause on transport button click", async () => {
    render(
      <MascotMotionAnimationStep
        effectiveMascot={mockMascot}
        genColor="#06b6d4"
        busyAction={null}
        activePreviewAction="thinking"
        setActivePreviewAction={vi.fn()}
        isPlaying={false}
        setIsPlaying={vi.fn()}
        canvasBackground="dark"
        setCanvasBackground={vi.fn()}
        canvasZoom={1.0}
        setCanvasZoom={vi.fn()}
        flipHorizontal={false}
        setFlipHorizontal={vi.fn()}
        actionMotions={{} as any}
        actionSpeeds={{} as any}
        actionIntensities={{} as any}
        calibrating={false}
        onChangeMotionPreset={vi.fn()}
        onChangeMotionSpeed={vi.fn()}
        onChangeMotionIntensity={vi.fn()}
        onResetDefaultMotions={vi.fn()}
        onSaveMotion={vi.fn()}
        onFinishMascot={vi.fn()}
        onBackStep={vi.fn()}
        activeStyle={null}
        previewStyleId={null}
        onPreviewStyleChange={vi.fn()}
        activeVariants={[]}
        selectedVariant={null}
        activeVariantIndex={0}
        onSelectVariantIndex={vi.fn()}
        stylesState={mockStylesState}
      />,
      { wrapper },
    );

    const playBtn = screen.getByTestId("play-pause-btn");
    expect(playBtn.textContent).toContain("Play");

    fireEvent.click(playBtn);
    expect(playBtn.textContent).toContain("Pause");

    fireEvent.click(playBtn);
    expect(playBtn.textContent).toContain("Play");
  });

  it("toggles contact sheet inspection view", async () => {
    render(
      <MascotMotionAnimationStep
        effectiveMascot={mockMascot}
        genColor="#06b6d4"
        busyAction={null}
        activePreviewAction="thinking"
        setActivePreviewAction={vi.fn()}
        isPlaying={false}
        setIsPlaying={vi.fn()}
        canvasBackground="dark"
        setCanvasBackground={vi.fn()}
        canvasZoom={1.0}
        setCanvasZoom={vi.fn()}
        flipHorizontal={false}
        setFlipHorizontal={vi.fn()}
        actionMotions={{} as any}
        actionSpeeds={{} as any}
        actionIntensities={{} as any}
        calibrating={false}
        onChangeMotionPreset={vi.fn()}
        onChangeMotionSpeed={vi.fn()}
        onChangeMotionIntensity={vi.fn()}
        onResetDefaultMotions={vi.fn()}
        onSaveMotion={vi.fn()}
        onFinishMascot={vi.fn()}
        onBackStep={vi.fn()}
        activeStyle={null}
        previewStyleId={null}
        onPreviewStyleChange={vi.fn()}
        activeVariants={[]}
        selectedVariant={null}
        activeVariantIndex={0}
        onSelectVariantIndex={vi.fn()}
        stylesState={mockStylesState}
      />,
      { wrapper },
    );

    await waitFor(() => {
      expect(screen.getByTestId("ready-count-badge")).toBeTruthy();
    });

    const contactSheetBtn = screen.getByTestId("toggle-contact-sheet-btn");
    expect(screen.queryByTestId("step4-contact-sheet-wrap")).toBeNull();

    fireEvent.click(contactSheetBtn);
    expect(screen.getByTestId("step4-contact-sheet-wrap")).toBeTruthy();

    fireEvent.click(contactSheetBtn);
    expect(screen.queryByTestId("step4-contact-sheet-wrap")).toBeNull();
  });
});
