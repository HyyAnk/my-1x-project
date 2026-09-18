export interface RawMascotActionEntry {
  action?: string;
  sprite_url?: string;
  preview_url?: string;
  frames_count?: number;
  fps?: number;
  loop?: boolean;
  frame_width?: number;
  frame_height?: number;
  offset_x?: number;
  offset_y?: number;
  motion_preset?: "breathe" | "sway" | "jump" | "shake" | "wave" | "point" | "pulse" | "float" | "none";
  motion_speed?: number;
  motion_intensity?: "subtle" | "normal" | "dynamic";
}

export interface RawMascotPackageManifest {
  id?: string;
  name?: string;
  description?: string;
  visual_style?: string;
  master_prompt?: string;
  color_theme?: string;
  master_image_url?: string | null;
  master_raw_image_url?: string | null;
  actions?: Record<string, RawMascotActionEntry | null | undefined>;
  styles?: unknown[];
  active_style_id?: string;
  render_bundle?: unknown;
  schema_version?: number;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseRawMascotActionEntry(value: unknown): RawMascotActionEntry | null {
  if (!isRecord(value)) return null;
  const entry: RawMascotActionEntry = {};
  if (typeof value.action === "string") entry.action = value.action;
  if (typeof value.sprite_url === "string") entry.sprite_url = value.sprite_url;
  if (typeof value.preview_url === "string") entry.preview_url = value.preview_url;
  if (typeof value.frames_count === "number") entry.frames_count = value.frames_count;
  if (typeof value.fps === "number") entry.fps = value.fps;
  if (typeof value.loop === "boolean") entry.loop = value.loop;
  if (typeof value.frame_width === "number") entry.frame_width = value.frame_width;
  if (typeof value.frame_height === "number") entry.frame_height = value.frame_height;
  if (typeof value.offset_x === "number") entry.offset_x = value.offset_x;
  if (typeof value.offset_y === "number") entry.offset_y = value.offset_y;
  if (
    typeof value.motion_preset === "string" &&
    ["breathe", "sway", "jump", "shake", "wave", "point", "pulse", "float", "none"].includes(value.motion_preset)
  ) {
    entry.motion_preset = value.motion_preset as RawMascotActionEntry["motion_preset"];
  }
  if (typeof value.motion_speed === "number") entry.motion_speed = value.motion_speed;
  if (typeof value.motion_intensity === "string" && ["subtle", "normal", "dynamic"].includes(value.motion_intensity)) {
    entry.motion_intensity = value.motion_intensity as RawMascotActionEntry["motion_intensity"];
  }
  return entry;
}

export function parseRawMascotManifest(data: unknown): RawMascotPackageManifest {
  if (!isRecord(data)) {
    throw new Error("Invalid Mascot ZIP package: mascot.json manifest root must be an object");
  }

  const actions: Record<string, RawMascotActionEntry | null | undefined> = {};
  if (isRecord(data.actions)) {
    for (const [key, val] of Object.entries(data.actions)) {
      if (val === null || val === undefined) {
        actions[key] = val;
      } else {
        const parsedEntry = parseRawMascotActionEntry(val);
        if (parsedEntry) {
          actions[key] = parsedEntry;
        }
      }
    }
  }

  return {
    id: typeof data.id === "string" ? data.id : undefined,
    name: typeof data.name === "string" ? data.name : undefined,
    description: typeof data.description === "string" ? data.description : undefined,
    visual_style: typeof data.visual_style === "string" ? data.visual_style : undefined,
    master_prompt: typeof data.master_prompt === "string" ? data.master_prompt : undefined,
    color_theme: typeof data.color_theme === "string" ? data.color_theme : undefined,
    master_image_url: typeof data.master_image_url === "string" ? data.master_image_url : null,
    master_raw_image_url: typeof data.master_raw_image_url === "string" ? data.master_raw_image_url : null,
    actions,
    styles: Array.isArray(data.styles) ? data.styles : undefined,
    active_style_id: typeof data.active_style_id === "string" ? data.active_style_id : undefined,
    render_bundle: data.render_bundle,
    schema_version: typeof data.schema_version === "number" ? data.schema_version : undefined,
  };
}

export function normalizeMascotPackageManifest(raw: RawMascotPackageManifest): RawMascotPackageManifest {
  return {
    ...raw,
    name: raw.name?.trim() || "Imported Mascot",
    actions: raw.actions ?? {},
    styles: Array.isArray(raw.styles) ? raw.styles : [],
  };
}
