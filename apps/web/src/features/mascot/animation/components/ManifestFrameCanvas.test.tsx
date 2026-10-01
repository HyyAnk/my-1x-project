import { describe, expect, it, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ManifestFrameCanvas } from "./ManifestFrameCanvas";
import type { MascotPublishedAnimationAsset } from "@studio/shared";

afterEach(() => {
  cleanup();
});

describe("ManifestFrameCanvas", () => {
  const mockVideoAnimation: MascotPublishedAnimationAsset = {
    version: 1,
    manifest_url: "https://example.com/manifest.json",
    state: "thinking",
    fps: 24,
    frame_count: 48,
    duration_ms: 2000,
    loop: true,
    transparent_video_url: "https://example.com/mascot_alpha.webm",
  } as unknown as MascotPublishedAnimationAsset;

  const mockAtlasAnimation: MascotPublishedAnimationAsset = {
    version: 1,
    manifest_url: "https://example.com/manifest.json",
    state: "celebrate",
    fps: 12,
    frame_count: 12,
    duration_ms: 1000,
    loop: false,
    atlas_url: "https://example.com/mascot_atlas.png",
    frames: Array.from({ length: 12 }, (_, i) => ({
      index: i,
      x: i * 512,
      y: 0,
      width: 512,
      height: 512,
      duration_ms: 83.33,
    })),
  } as unknown as MascotPublishedAnimationAsset;

  it("renders transparent video when transparent_video_url is provided", () => {
    render(
      <ManifestFrameCanvas
        animation={mockVideoAnimation}
        timeSeconds={0.5}
        canvasBackground="dark"
      />,
    );

    expect(screen.getByTestId("manifest-frame-canvas")).toBeTruthy();
    const video = screen.getByTestId("manifest-video-element") as HTMLVideoElement;
    expect(video).toBeTruthy();
    expect(video.src).toContain("mascot_alpha.webm");
    expect(screen.getByText(/24 FPS/i)).toBeTruthy();
  });

  it("renders canvas element when atlas_url is provided and video is absent", () => {
    render(
      <ManifestFrameCanvas
        animation={mockAtlasAnimation}
        timeSeconds={0.25}
        canvasBackground="grid"
      />,
    );

    const canvas = screen.getByTestId("manifest-canvas-element");
    expect(canvas).toBeTruthy();
    expect(screen.getByText(/12 FPS/i)).toBeTruthy();
    expect(screen.getByText(/Frame/i)).toBeTruthy();
  });

  it("renders fallback image when animation is null but fallbackImageUrl is provided", () => {
    render(
      <ManifestFrameCanvas
        animation={null}
        fallbackImageUrl="https://example.com/static_mascot.png"
        timeSeconds={0}
        canvasBackground="light"
      />,
    );

    const img = screen.getByAltText("Mascot preview") as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.src).toContain("static_mascot.png");
  });

  it("renders empty state placeholder when neither animation nor fallback image is provided", () => {
    render(
      <ManifestFrameCanvas
        animation={null}
        fallbackImageUrl={undefined}
        timeSeconds={0}
        canvasBackground="clean"
      />,
    );

    expect(screen.getByText("No variant generated")).toBeTruthy();
  });

  it("applies zoom and horizontal flip transformation", () => {
    const { container } = render(
      <ManifestFrameCanvas
        animation={mockVideoAnimation}
        timeSeconds={0}
        canvasBackground="dark"
        canvasZoom={1.5}
        flipHorizontal={true}
      />,
    );

    const wrapper = container.querySelector(".canvas-content-wrapper") as HTMLElement;
    expect(wrapper).toBeTruthy();
    expect(wrapper.style.transform).toContain("scale(1.5)");
    expect(wrapper.style.transform).toContain("scaleX(-1)");
  });
});
