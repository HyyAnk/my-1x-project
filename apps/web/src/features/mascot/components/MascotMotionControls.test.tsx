import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MascotMotionControls } from "./MascotMotionControls";
import { LanguageProvider } from "../../../i18n";
import { adaptMascotConfigV1ToV2, type MascotProfile } from "@studio/shared";
import { DEFAULT_ACTION_INTENSITIES, DEFAULT_ACTION_MOTIONS, DEFAULT_ACTION_SPEEDS } from "../constants";

afterEach(() => {
  cleanup();
});

const wrapper = ({ children }: { children: React.ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;

const baseMascot: MascotProfile = {
  id: "m1",
  name: "Milo",
  description: "Owl mascot",
  visual_style: "pixar_3d",
  master_prompt: "owl",
  color_theme: "#06b6d4",
  actions: {},
  assigned_channel_ids: [],
  created_at: "2026-08-30T00:00:00.000Z",
  updated_at: "2026-08-30T00:00:00.000Z",
};

describe("MascotMotionControls", () => {
  it("reflects readiness from legacy actions map when render_bundle is absent", () => {
    const legacyMascot: MascotProfile = {
      ...baseMascot,
      actions: {
        thinking: {
          action: "thinking",
          sprite_url: "https://example.com/legacy_thinking.png",
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
    };

    render(
      <MascotMotionControls
        editingMascot={legacyMascot}
        activePreviewAction="thinking"
        actionMotions={{ ...DEFAULT_ACTION_MOTIONS }}
        actionSpeeds={{ ...DEFAULT_ACTION_SPEEDS }}
        actionIntensities={{ ...DEFAULT_ACTION_INTENSITIES }}
        onChangeMotionPreset={vi.fn()}
        onChangeMotionSpeed={vi.fn()}
        onChangeMotionIntensity={vi.fn()}
        onResetDefaultMotions={vi.fn()}
        onSaveMotion={vi.fn()}
        onFinishMascot={vi.fn()}
        onBackStep={vi.fn()}
        calibrating={false}
        busyAction={null}
      />,
      { wrapper },
    );

    expect(screen.getByText(/1\/2 poses ready/i)).toBeTruthy();
  });

  it("reflects readiness and hasSprite from render_bundle when actions map is empty", () => {
    const bundleMascot: MascotProfile = {
      ...baseMascot,
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
              motion: { preset: "sway", speed: 1.2, intensity: "dynamic" },
            },
            celebrate: {
              version: 2,
              action: "celebrate",
              image_url: "https://example.com/v2_celebrate.png",
              registration: {
                source_width: 512,
                source_height: 512,
                content_bounds: { x: 0, y: 0, width: 512, height: 512 },
                pivot: { x: 256, y: 512 },
                offset_x: 0,
                offset_y: 0,
              },
              motion: { preset: "jump", speed: 1.0, intensity: "normal" },
            },
          },
          master: null,
        },
      },
    };

    render(
      <MascotMotionControls
        editingMascot={bundleMascot}
        activePreviewAction="thinking"
        actionMotions={{ ...DEFAULT_ACTION_MOTIONS }}
        actionSpeeds={{ ...DEFAULT_ACTION_SPEEDS }}
        actionIntensities={{ ...DEFAULT_ACTION_INTENSITIES }}
        onChangeMotionPreset={vi.fn()}
        onChangeMotionSpeed={vi.fn()}
        onChangeMotionIntensity={vi.fn()}
        onResetDefaultMotions={vi.fn()}
        onSaveMotion={vi.fn()}
        onFinishMascot={vi.fn()}
        onBackStep={vi.fn()}
        calibrating={false}
        busyAction={null}
      />,
      { wrapper },
    );

    expect(screen.getByText(/2\/2 poses ready/i)).toBeTruthy();
  });

  it("calls onChangeMotionPreset and onSaveMotion when buttons are clicked", () => {
    const onChangeMotionPreset = vi.fn();
    const onSaveMotion = vi.fn();

    render(
      <MascotMotionControls
        editingMascot={baseMascot}
        activePreviewAction="thinking"
        actionMotions={{ ...DEFAULT_ACTION_MOTIONS }}
        actionSpeeds={{ ...DEFAULT_ACTION_SPEEDS }}
        actionIntensities={{ ...DEFAULT_ACTION_INTENSITIES }}
        onChangeMotionPreset={onChangeMotionPreset}
        onChangeMotionSpeed={vi.fn()}
        onChangeMotionIntensity={vi.fn()}
        onResetDefaultMotions={vi.fn()}
        onSaveMotion={onSaveMotion}
        onFinishMascot={vi.fn()}
        onBackStep={vi.fn()}
        calibrating={false}
        busyAction={null}
      />,
      { wrapper },
    );

    const presetButtons = screen.getAllByRole("button");
    const swayButton = presetButtons.find((btn) => btn.textContent?.includes("Sway"));
    expect(swayButton).toBeTruthy();
    fireEvent.click(swayButton!);
    expect(onChangeMotionPreset).toHaveBeenCalledWith("thinking", "sway");

    const saveButton = presetButtons.find((btn) => btn.textContent?.includes("Save Motion (Thinking)"));
    expect(saveButton).toBeTruthy();
    fireEvent.click(saveButton!);
    expect(onSaveMotion).toHaveBeenCalledWith("thinking");
  });
});
