import type { EditorialDomainSeed } from "./seedTypes.js";

/**
 * Domain: Space, Planets & Astronomy with vibrant celestial lighting and clear blocks.
 */
export const SPACE_DOMAIN_SEED: EditorialDomainSeed = {
  id: "space_astronomy",
  domainName: "Space & Astronomy",
  pattern: /\b(space|planet|planets|solar system|astronomy|cosmos|galaxy|mars|jupiter|saturn|moon|sun|star|stars|asteroid|meteor|universe|black hole|astronaut|nebula)\b/i,
  preferredLayout: "mega_grid",
  preferredTemplate: "big_object",
  background: "navy",
  backgroundAtmosphere:
    "Majestic cosmic vista with brilliant stellar rim lights, vibrant planetary atmospheres, and sparkling starlight.",
  subjects: [
    {
      label: "Planetary Scale",
      keywords: ["jupiter", "scale", "planet", "solar system", "io", "moon", "orbit"],
      hook: "WHICH IS BIGGER?",
      background: "navy",
      backgroundAtmosphere:
        "Majestic velvet space illuminated by brilliant distant solar rays, swirling atmospheric crimson cloud bands of Jupiter, and sparkling stellar starfield reflections; epic, clear, and glowing.",
      spatialComposition:
        "PLANETARY SCALE STAGING: Mascot on the left (~35% width) gazing up in cosmic awe; massive swirling Jupiter planet and tiny moon Io on the right (~65% width); headline block top-left.",
      visualPrompt:
        "breathtaking photorealistic astronomical view of Jupiter with its swirling crimson Great Red Spot and intricate atmospheric cloud bands, side by side with the tiny fiery volcanic silhouette of its moon Io casting a crisp black eclipse shadow",
      mascotPose: {
        prop: "none",
        expression: "Pure uncontainable cosmic awe with dropped jaw",
        poseDescription: "Staring upward into the cosmos with wide sparkling eyes and open mouth in breathless wonder",
      },
    },
    {
      label: "Saturn Rings",
      keywords: ["saturn", "rings", "ice", "particles", "cosmic"],
      hook: "CAN YOU SURVIVE HERE?",
      background: "navy",
      backgroundAtmosphere:
        "Brilliant golden sunlight glancing over millions of crystalline ice particles, creating sparkling prismatic diffraction spikes across velvet space.",
      spatialComposition:
        "RING SKIMMING STAGING: Mascot on the left (~35% width) reaching out in explorer curiosity; glittering icy ring plane of Saturn stretching across the right (~65% width); headline block top-left.",
      visualPrompt:
        "hyper-detailed cinematic macro perspective skimming directly over Saturn's crystalline icy ring particles, billions of shimmering ice boulders reflecting brilliant golden sunlight against deep velvet space",
      mascotPose: {
        prop: "none",
        expression: "Thrilled explorer curiosity",
        poseDescription: "Reaching one paw gently upward as if catching a floating cosmic snowflake, eyes locked onto the rings",
      },
    },
    {
      label: "Solar Coronal Flare",
      keywords: ["sun", "solar", "flare", "corona", "heat", "star"],
      hook: "HOW HOT IS THIS?",
      background: "bright",
      backgroundAtmosphere:
        "Blinding radiant golden and amber solar light rays emanating from superheated coronal plasma loops, rich warm energy glow.",
      spatialComposition:
        "SOLAR FLARE STAGING: Mascot on the left (~35% width) shielding eyes in astonishment; towering golden solar prominence loop on the right (~65% width); headline block top-left.",
      visualPrompt:
        "high-energy astronomical telescope capture of a towering magnetic coronal loop eruption dancing on the golden surface of the Sun, superheated plasma prominences curling into velvet black void",
      mascotPose: {
        prop: "none",
        expression: "Comic shield-eyes squint with dropped jaw",
        poseDescription: "Raising one paw to shield brow from the blinding stellar brilliance, astonished dropped jaw",
      },
    },
  ],
};
