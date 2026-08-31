import type { AppConfig } from "@studio/shared";

export const DEFAULT_CONFIG: AppConfig = {
  active_engine: "codex",
  mascot_stage: {
    default_placement: {
      position: "bottom_left",
      scale: 1.84,
      offset_x: 67,
      offset_y: 90,
      flip_x: false,
    },
  },
  video_generation: {
    provider: "hyperframes",
    model: "",
    hyperframes_command: "npx hyperframes",
    render_quality: "draft",
    fps: 30,
    max_scene_duration_seconds: 8,
    default_scene_duration_seconds: 6,
    narration_words_per_second: 2.3,
    aspect_ratio: "16:9",
    max_concurrent_tasks: 2,
    fast_render_mode: false,
  },
  image_generation: {
    enabled: true,
    images_per_bundle: 1,
    provider: "gpti2",
    base_url: "",
    model: "gpt-image-2",
    api_key: "",
    quality: "low",
    max_concurrent_tasks: 3,
  },
  codex: {
    max_concurrent_tasks: 3,
    transport: "app_server",
    app_server_endpoint: "stdio://",
    command: "codex",
    model: "",
    experimental_api: false,
    api_base_url: "",
    api_key: "",
  },
  antigravity: {
    max_concurrent_tasks: 3,
    command: "agy",
    model: "pro",
    api_base_url: "",
    api_key: "",
  },
  audio_generation: {
    provider: "chatterbox",
    service_url: "http://127.0.0.1:8890",
    exaggeration: 0.5,
    cfg_weight: 0.5,
    max_concurrent_tasks: 3,
    merge_gap_ms: 300,
    match_target_duration: true,
  },
  question_history: {
    enabled: true,
    pass_threshold: 2,
    ttl_days: 30,
    auto_remix: false,
  },
};

export type StorageSettings = {
  storage_path: string;
};

export const storageSettingsFilename = "storage.local.json";
export const codexSettingsFilename = "codex.local.json";
export const antigravitySettingsFilename = "antigravity.local.json";
export const audioSettingsFilename = "audio.local.json";
export const imageSettingsFilename = "image.local.json";
