import { z } from "zod";

export const IntroOutroTransitionStyleSchema = z.enum([
  "auto",
  "flash_stunt",
  "occlusion_wipe",
  "kinetic_match_cut",
  "elemental_burst",
  "whip_orbit",
  "comic_freeze",
]);

export type IntroOutroTransitionStyle = z.infer<typeof IntroOutroTransitionStyleSchema>;

export interface TransitionStyleOption {
  value: IntroOutroTransitionStyle;
  label: string;
  description: string;
  cameraVector: string;
  recommendedFor: string;
}

export const INTRO_OUTRO_TRANSITION_OPTIONS: readonly TransitionStyleOption[] = [
  {
    value: "auto",
    label: "Auto (Smart Matching)",
    description: "AI evaluates mascot persona, anatomy, and creative seeds to dynamically pick the most harmonious transition.",
    cameraVector: "Dynamically chosen based on character movement and set geometry",
    recommendedFor: "General use, spontaneous variety",
  },
  {
    value: "flash_stunt",
    label: "Whiteout Flash Stunt (Classic)",
    description: "Athletic sprint into an acrobatic stunt or high-five, detonating a 100% whiteout flash at midpoint before sliding recovery.",
    cameraVector: "Forward diagonal sprint into solid whiteout flash; burst out landing roll",
    recommendedFor: "High-energy athletic mascots, hype gaming, sports",
  },
  {
    value: "occlusion_wipe",
    label: "Foreground Occlusion Wipe",
    description: "Mascot sweeps a large prop, placard, or hand across the lens, completely occluding the frame to conceal the seam organically.",
    cameraVector: "Lateral sweep occluding 100% frame; sweeps away to reveal next stance",
    recommendedFor: "Naturalistic cuts, props, items, quiz cards, mystery channels",
  },
  {
    value: "kinetic_match_cut",
    label: "Kinetic Match Cut (Spin / Apex)",
    description: "A continuous motion vector across clips (such as a 360 whirlwind spin or mid-air jump apex) carrying momentum seamlessly across the cut.",
    cameraVector: "Apex silhouette freeze/blur matching exactly across clip boundaries",
    recommendedFor: "Acrobatic characters, martial arts, dance, dynamic action",
  },
  {
    value: "elemental_burst",
    label: "Elemental / Particle Burst",
    description: "Theme-specific smoke poof, confetti explosion, water bubbles, or digital glitch wave momentarily washes over the entire frame.",
    cameraVector: "Burst originates from center, filling frame completely then dispersing",
    recommendedFor: "Magic, ninja smoke, party celebration, sci-fi/cyber glitch",
  },
  {
    value: "whip_orbit",
    label: "Camera Whip Orbit (180-Degree Blur)",
    description: "Camera rapidly whips 180 degrees around the mascot with heavy horizontal motion blur, resolving onto the complementary hero angle.",
    cameraVector: "High-speed horizontal whip blur pivoting around the mascot",
    recommendedFor: "Cinematic, TV game show aesthetic, stylish presentations",
  },
  {
    value: "comic_freeze",
    label: "Comic Springboard & Starburst Wipe",
    description: "Mascot accelerates and launches into an explosive starburst contact flash wipe on the lens, followed by a bouncy cartoon physics rebound.",
    cameraVector: "High-speed comic forward launch into contact flash wipe, cartoon rebound",
    recommendedFor: "Cute, playful, slapstick, bouncy cartoon mascots",
  },
] as const;
