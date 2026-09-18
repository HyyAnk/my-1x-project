import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MascotAnimationCanvas } from "./MascotAnimationCanvas";
import { LanguageProvider } from "../../../i18n";
import { adaptMascotConfigV1ToV2, type MascotAnimationAssetV1, type MascotProfile } from "@studio/shared";

afterEach(() => {
  cleanup();
});

const wrapper = ({ children }: { children: React.ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;

const mockMascot: MascotProfile = {
  id: "m1",
  name: "Milo",
  description: "Owl",
  visual_style: "pixar_3d",
  master_prompt: "owl",
  color_theme: "#06b6d4",
  actions: {
    thinking: {
      action: "thinking",
      sprite_url: "https://example.com/static_thinking.png",
      frames_count: 1,
      fps: 8,
      loop: true,
      frame_width: 512,
      frame_height: 512,
      offset_x: 0,
      offset_y: 0,
      motion_preset: "breathe",
      motion_speed: 1.0,
      motion_intensity: "normal",
    },
  },
  assigned_channel_ids: [],
  created_at: "2026-08-30T00:00:00.000Z",
  updated_at: "2026-08-30T00:00:00.000Z",
};

const mockAnimation: MascotAnimationAssetV1 = {
  version: 1,
  state: "thinking",
  atlas_url: "https://example.com/atlas.png",
  manifest_url: "https://example.com/manifest.json",
  frame_count: 12,
  fps: 8,
  loop: true,
  loop_policy: "loop",
  frames: Array.from({ length: 12 }, (_, i) => ({
    index: i,
    x: (i % 4) * 200,
    y: Math.floor(i / 4) * 150,
    width: 200,
    height: 150,
    duration_ms: 125,
  })),
  registration: {
    source_width: 800,
    source_height: 450,
    content_bounds: { x: 50, y: 50, width: 700, height: 350 },
    pivot: { x: 400, y: 450 },
    offset_x: 0,
    offset_y: 0,
  },
  content_fingerprint: "cfp",
  source_fingerprint: "sfp",
  slot_index: 1,
  recipe_id: "recipe-1",
};

describe("MascotAnimationCanvas", () => {
  it("renders manifest-driven sprite frame when animation is passed", () => {
    render(
      <MascotAnimationCanvas
        editingMascot={mockMascot}
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
        motionPreset="none"
        motionSpeed={1.0}
        motionIntensity="normal"
        genColor="#06b6d4"
        animation={mockAnimation}
        timeSeconds={0.125}
      />,
      { wrapper },
    );

    const sprite = screen.getByTestId("motion-mascot-sprite");
    expect(sprite).toBeTruthy();
    expect(sprite.getAttribute("data-frame-index")).toBe("1");
    expect(sprite.style.backgroundPosition).toBe("-200px 0px");
  });

  it("renders static image fallback when animation is not provided", () => {
    render(
      <MascotAnimationCanvas
        editingMascot={mockMascot}
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
        motionPreset="none"
        motionSpeed={1.0}
        motionIntensity="normal"
        genColor="#06b6d4"
      />,
      { wrapper },
    );

    const img = screen.getByRole("img");
    expect(img).toBeTruthy();
    expect(img.getAttribute("src")).toBe("https://example.com/static_thinking.png");
  });

  it("renders native transparent WebM video element when animation has transparent_video_url", () => {
    const videoAnimation: MascotAnimationAssetV1 = {
      ...mockAnimation,
      transparent_video_url: "/api/mascots/mascot_123/styles/core/animations/thinking/2/artifacts/video_transparent.webm",
    };

    render(
      <MascotAnimationCanvas
        editingMascot={mockMascot}
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
        motionPreset="none"
        motionSpeed={1.0}
        motionIntensity="normal"
        genColor="#06b6d4"
        animation={videoAnimation}
      />,
      { wrapper },
    );

    const video = screen.getByTestId("motion-mascot-video") as HTMLVideoElement;
    expect(video).toBeTruthy();
    expect(video.tagName).toBe("VIDEO");
    expect(video.getAttribute("src")).toBe("/api/mascots/mascot_123/styles/core/animations/thinking/2/artifacts/video_transparent.webm");
    expect(video.autoplay).toBe(true);
    expect(video.loop).toBe(true);
    expect(video.muted).toBe(true);
  });

  it("filters mock fixture identifiers and renders empty placeholder instead of broken image", () => {
    const mockMascotWithFixture: MascotProfile = {
      ...mockMascot,
      actions: {
        ...mockMascot.actions,
        thinking: {
          ...mockMascot.actions.thinking!,
          sprite_url: "/fixtures/character.png",
        },
      },
    };

    render(
      <MascotAnimationCanvas
        editingMascot={mockMascotWithFixture}
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
        motionPreset="none"
        motionSpeed={1.0}
        motionIntensity="normal"
        genColor="#06b6d4"
      />,
      { wrapper },
    );

    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.queryByTestId("motion-mascot-video")).toBeNull();
  });

  it("resolves action image_url directly from render_bundle when actions map is empty", () => {
    const bundleMascot: MascotProfile = {
      ...mockMascot,
      actions: {},
      render_bundle: {
        config: adaptMascotConfigV1ToV2(),
        assets: {
          actions: {
            thinking: {
              version: 2,
              action: "thinking",
              image_url: "https://example.com/v2_thinking.png",
              registration: {
                source_width: 512,
                source_height: 512,
                content_bounds: { x: 0, y: 0, width: 512, height: 512 },
                pivot: { x: 256, y: 512 },
                offset_x: 0,
                offset_y: 0,
              },
              motion: { preset: "pulse", speed: 1.5, intensity: "dynamic" },
            },
          },
          master: null,
        },
      },
    };

    render(
      <MascotAnimationCanvas
        editingMascot={bundleMascot}
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
        genColor="#06b6d4"
      />,
      { wrapper },
    );

    const img = screen.getByRole("img");
    expect(img).toBeTruthy();
    expect(img.getAttribute("src")).toBe("https://example.com/v2_thinking.png");
  });

  it("marks action as ready in quick pose switcher when only present in render_bundle", () => {
    const bundleMascot: MascotProfile = {
      ...mockMascot,
      actions: {},
      render_bundle: {
        config: adaptMascotConfigV1ToV2(),
        assets: {
          actions: {
            thinking: {
              version: 2,
              action: "thinking",
              image_url: "https://example.com/v2_thinking.png",
              registration: {
                source_width: 512,
                source_height: 512,
                content_bounds: { x: 0, y: 0, width: 512, height: 512 },
                pivot: { x: 256, y: 512 },
                offset_x: 0,
                offset_y: 0,
              },
              motion: { preset: "breathe", speed: 1.0, intensity: "normal" },
            },
          },
          master: null,
        },
      },
    };

    const { container } = render(
      <MascotAnimationCanvas
        editingMascot={bundleMascot}
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
        genColor="#06b6d4"
      />,
      { wrapper },
    );

    const readyDots = container.querySelectorAll(".pose-status-dot.ready");
    expect(readyDots.length).toBe(1);
  });
});
