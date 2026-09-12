import type { BgmTrack } from "./bgmRegistry.js";

export const FALLBACK_BGM_TRACKS: BgmTrack[] = [
  {
    id: "Games_in_the_Garden",
    filename: "Games_in_the_Garden.mp3",
    path: "tracks/Games_in_the_Garden.mp3",
    bpm: 117.5,
    duration_seconds: 182.6,
    key: "C",
    rms_energy: 0.1702,
    category: "120_bpm_upbeat",
    recommended_use: "Question countdown and game rounds",
  },
  {
    id: "Morning_in_the_Garden",
    filename: "Morning_in_the_Garden.mp3",
    path: "tracks/Morning_in_the_Garden.mp3",
    bpm: 99.4,
    duration_seconds: 180.1,
    key: "D",
    rms_energy: 0.1497,
    category: "100_bpm_gentle",
    recommended_use: "Intro, storytelling, and fact explanations",
  },
];
