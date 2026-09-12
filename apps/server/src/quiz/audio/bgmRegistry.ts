import fs from "node:fs";
import path from "node:path";
import { FALLBACK_BGM_TRACKS } from "./bgmFallbackTracks.js";
import { findBgmDirectory } from "./bgmDirectoryFinder.js";
import { hashStringToSeed, selectCandidateTrack } from "./bgmTrackSelector.js";
import { planBgmSchedule } from "./bgmSchedulePlanner.js";

export type BgmCategory = "100_bpm_gentle" | "120_bpm_upbeat";

export type BgmTrack = {
  id: string;
  filename: string;
  path: string;
  bpm: number;
  duration_seconds: number;
  key: string;
  rms_energy: number;
  category: BgmCategory;
  recommended_use: string;
};

export type BgmManifest = {
  version: string;
  pack_name: string;
  total_tracks: number;
  bpm_groups: Record<string, number>;
  tracks: BgmTrack[];
};

export type BgmPlacement = {
  id: string;
  trackId: string;
  filename: string;
  src: string;
  startSeconds: number;
  durationSeconds: number;
  volume: number;
  bpm: number;
};

export type ResolveBgmOptions = {
  bpmPreference?: BgmCategory | "auto";
  baseVolume?: number;
  seed?: number | string;
  trackId?: string;
  recentTrackIds?: string[];
  assets?: Record<string, string>;
  baseDirectory?: string;
};

export const DEFAULT_BGM_BASE_VOLUME = 0.09;

export { hashStringToSeed };

export class BgmRegistry {
  private manifest: BgmManifest | null = null;
  private readonly tracks = new Map<string, BgmTrack>();
  private readonly bgmDir: string;

  constructor(baseDirectory?: string) {
    this.bgmDir = baseDirectory || findBgmDirectory();
    this.loadManifest();
  }

  private loadManifest(): void {
    const manifestPath = path.join(this.bgmDir, "manifest.json");
    try {
      if (fs.existsSync(manifestPath)) {
        const raw = fs.readFileSync(manifestPath, "utf-8");
        this.manifest = JSON.parse(raw) as BgmManifest;
        for (const track of this.manifest.tracks) {
          this.tracks.set(track.id, track);
        }
      }
    } catch {
      this.manifest = null;
    }
  }

  getTracks(category?: BgmCategory): BgmTrack[] {
    const all = Array.from(this.tracks.values());
    const base = all.length > 0 ? all : FALLBACK_BGM_TRACKS;
    return category ? base.filter((t) => t.category === category) : base;
  }

  getTrack(id: string): BgmTrack | null {
    return this.tracks.get(id) ?? null;
  }

  selectCandidateTrack(candidates: BgmTrack[], options?: ResolveBgmOptions): BgmTrack | null {
    return selectCandidateTrack(candidates, options);
  }

  resolveBgmSchedule(totalDurationSeconds: number, options?: ResolveBgmOptions): BgmPlacement[] {
    const categoryPref = options?.bpmPreference ?? "120_bpm_upbeat";
    const explicitTrack = options?.trackId
      ? (this.getTrack(options.trackId) ??
        this.getTracks().find((t) => t.id === options.trackId || t.filename === options.trackId) ??
        null)
      : null;
    const pool = explicitTrack ? [explicitTrack] : this.getTracks(categoryPref === "auto" ? undefined : categoryPref);
    const available = pool.length > 0 ? pool : this.getTracks();

    return planBgmSchedule(available, totalDurationSeconds, options);
  }
}

export const defaultBgmRegistry = new BgmRegistry();
