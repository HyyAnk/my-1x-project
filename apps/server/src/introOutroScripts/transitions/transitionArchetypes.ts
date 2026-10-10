import type { IntroOutroTransitionStyle } from "@studio/shared";

export interface TransitionArchetypeDefinition {
  style: Exclude<IntroOutroTransitionStyle, "auto">;
  label: string;
  part1Title: string;
  part2Title: string;
  part1Guidance: (duration: number) => string;
  part2Guidance: (duration: number) => string;
  part1Continuity: string;
  part2StartingState: string;
  part2Continuity: string;
  technicalContract: (duration: number) => string;
}

export const TRANSITION_ARCHETYPES: Record<Exclude<IntroOutroTransitionStyle, "auto">, TransitionArchetypeDefinition> = {
  flash_stunt: {
    style: "flash_stunt",
    label: "Whiteout Flash Stunt (Classic)",
    part1Title: "PART 1: THE RUN-UP & KINEMATIC TRANSITION",
    part2Title: "PART 2: MOMENTUM RECOVERY, CTA & FAREWELL",
    part1Guidance: (duration) =>
      `Part 1 (0s to ${(duration / 2).toFixed(1)}s): Mascot is already in dynamic kinetic motion at 0.0s powered by its entrance seed (e.g. riding a dinosaur/creature mount, pedaling a bike or kart, piloting an airplane, carving on a surfboard, flying on a broom, driving a cruiser, or parkour sprinting), accelerating enthusiastically along its motion path while speaking naturally in motion. At the midpoint, the mascot launches into a decisive kinematic stunt (e.g. diving into a golden energy ring, slapping the camera for a high-five, or an acrobatic vault), detonating a 100% whiteout/contact flash that washes out the entire frame.`,
    part2Guidance: (duration) =>
      `Part 2 (${(duration / 2).toFixed(1)}s to ${duration}s): Opens saturated in whiteout glare; the white flash dissipates as the mascot bursts forward along a 30-degree diagonal, landing, rolling, and popping upright into a sliding stop. The mascot immediately delivers the second clause of the sentence without filler words, gestures proudly to the intact in-scene 3D channel logo, and finishes with an affectionate farewell wave and a friendly sign-off line (e.g. 'See ya!' or 'Bye!').`,
    part1Continuity:
      "Vector: High-velocity kinetic motion along the entrance trajectory toward the transition stunt.\nThe final 0.4s MUST culminate in a solid 100% whiteout/contact flash covering the entire frame. No subtitles or watermark.",
    part2StartingState:
      "Starting state: Opens saturated in a solid 100% whiteout lens flare. Within 0.3s, the white glare rapidly dissipates, revealing the mascot bursting forward on a 30-degree diagonal trajectory into the foreground, executing a clean landing roll and popping upright into a sliding stop at stage center.",
    part2Continuity:
      "Kinetic continuity: Forward velocity carries through cleanly into the upright sliding stop.\nMascot emerges with hands free to gesture and wave; do not catch, retrieve, or stow any prop from earlier.",
    technicalContract: (duration) =>
      `- For two-part kinematic outro (${duration}s): Midpoint must culminate in a solid whiteout/contact flash covering the entire frame. Part 2 opens in whiteout flash and bursts forward on a matching 30-degree diagonal roll and slide stop. Speech must be continuous and finish before the final 2.5s living hold. In Part 2, mascot emerges with hands free without catching, retrieving, or stowing any prop thrown in earlier scenes.`,
  },

  occlusion_wipe: {
    style: "occlusion_wipe",
    label: "Foreground Occlusion Wipe",
    part1Title: "PART 1: CELEBRATION & FOREGROUND OCCLUSION WIPE",
    part2Title: "PART 2: STAGE REVEAL, CTA & FAREWELL",
    part1Guidance: (duration) =>
      `Part 1 (0s to ${(duration / 2).toFixed(1)}s): Mascot is already in active kinetic motion at 0.0s powered by its entrance seed (riding a mount/vehicle, carving, flying, or acrobatic locomotion), celebrating enthusiastically and introducing the closing while sweeping a large foreground element (such as a large channel quiz placard, a prize box, or mascot's own paw/wing) across the lens. At the midpoint, this element sweeps completely across the camera, creating a 100% solid foreground occlusion wipe that covers the entire lens.`,
    part2Guidance: (duration) =>
      `Part 2 (${(duration / 2).toFixed(1)}s to ${duration}s): Opens fully occluded by the sweeping foreground element; within 0.3s the element sweeps away to the opposite side, instantly revealing the mascot already standing proudly in the main stage area, delivering the second clause with high charisma, gesturing to the intact in-scene 3D channel logo, and giving a warm farewell wave with a friendly goodbye (e.g. 'See ya!' or 'Bye!').`,
    part1Continuity:
      "Vector: High-velocity kinetic motion with foreground element or limb sweeping across the lens.\nThe final 0.4s MUST culminate in a 100% frame occlusion wipe covering the entire lens. No subtitles or watermark.",
    part2StartingState:
      "Starting state: Opens 100% occluded by a large foreground element (quiz placard/prize box/hand/wing) sweeping laterally across the lens. Within 0.3s, the foreground occluding element clears the frame to the opposite edge, revealing the mascot already standing at stage center in medium hero framing.",
    part2Continuity:
      "Kinetic continuity: Lateral sweep exits frame cleanly.\nMascot is clear in frame with hands free to gesture to the official logo and wave.",
    technicalContract: (duration) =>
      `- For two-part occlusion outro (${duration}s): The sweeping foreground element wipes past the lens in the final 0.4s of Part 1, creating a solid full-frame wipe. Part 2 opens in full occlusion and the element exits frame in the opening 0.3s. Mascot appears seamlessly repositioned at stage center.`,
  },

  kinetic_match_cut: {
    style: "kinetic_match_cut",
    label: "Kinetic Match Cut (Spin / Apex)",
    part1Title: "PART 1: MOMENTUM BUILD & KINETIC APEX MATCH CUT",
    part2Title: "PART 2: HERO LANDING, CTA & FAREWELL",
    part1Guidance: (duration) =>
      `Part 1 (0s to ${(duration / 2).toFixed(1)}s): Mascot is already in dynamic motion at 0.0s, celebrating and building momentum into an energetic spin (such as a 360-degree whirlwind spin) or leaping gracefully into the air. At the exact midpoint boundary, the mascot reaches the peak apex of the jump or the maximum centrifugal rotation with clear directional motion blur.`,
    part2Guidance: (duration) =>
      `Part 2 (${(duration / 2).toFixed(1)}s to ${duration}s): Opens caught at the exact apex silhouette; the mascot instantly unfurls smoothly from the motion, landing cleanly into an iconic hero pose. Mascot immediately delivers the second clause smoothly, points proudly to the intact in-scene 3D logo, and gives a cheerful farewell wave with a warm sign-off (e.g. 'See ya!' or 'Bye!').`,
    part1Continuity:
      "Vector: Launching into acrobatic spin or apex leap.\nThe final 0.4s MUST peak at the kinetic apex with clear directional momentum blur. No subtitles or watermark.",
    part2StartingState:
      "Starting state: Opens at the exact kinetic apex silhouette (mascot caught mid-air at the highest point of an acrobatic leap, or mid-spin at maximum rotational blur). Within 0.3s, the mascot instantly unfurls from the apex, descending smoothly to land on both feet with athletic balance, absorbing impact into an iconic hero stance at stage center.",
    part2Continuity:
      "Kinetic continuity: Downward landing momentum resolves cleanly into a stable, upright hero posture.\nMascot emerges with hands free to deliver speech and gesture toward the official in-scene 3D logo.",
    technicalContract: (duration) =>
      `- For two-part kinetic match cut (${duration}s): Part 1 ends at peak apex velocity/silhouette. Part 2 opens directly at that apex silhouette and continues the downward/unfurling momentum into a hero landing and speech delivery.`,
  },

  elemental_burst: {
    style: "elemental_burst",
    label: "Elemental / Particle Burst",
    part1Title: "PART 1: CELEBRATORY ACTION & THEMATIC BURST",
    part2Title: "PART 2: EMERGENCE, CTA & FAREWELL",
    part1Guidance: (duration) =>
      `Part 1 (0s to ${(duration / 2).toFixed(1)}s): Mascot is already in celebratory motion at 0.0s, triggering a celebratory themed effect (e.g. magical smoke poof, festive confetti burst, water splash, or digital cyber-glitch wave) directed toward the camera that completely engulfs the frame in a dense particle cloud at the midpoint.`,
    part2Guidance: (duration) =>
      `Part 2 (${(duration / 2).toFixed(1)}s to ${duration}s): Opens inside the dense particle haze; within 0.3s the particles or glitch dissipate rapidly as the mascot emerges freshly positioned in the foreground with high charm, delivering the second clause without hesitation, presenting the intact in-scene 3D logo, and offering a friendly farewell wave with a cheerful sign-off (e.g. 'See ya!' or 'Bye!').`,
    part1Continuity:
      "Vector: Themed particle/effect burst toward the lens.\nThe final 0.4s MUST culminate in a 100% full-frame particle/glitch/smoke saturation. No subtitles or watermark.",
    part2StartingState:
      "Starting state: Opens completely enveloped inside a dense, opaque thematic particle/smoke/glitch cloud. Within 0.3s, the dense cloud rapidly billows outward and dissipates into the air, revealing the mascot emerging through the clearing haze into crisp focus in the foreground at stage center.",
    part2Continuity:
      "Kinetic continuity: Particles disperse cleanly into the background, leaving the mascot fully visible.\nMascot emerges with hands free to gesture and wave.",
    technicalContract: (duration) =>
      `- For two-part elemental outro (${duration}s): The final 0.4s of Part 1 saturates the camera frame with thematic particles or glitch. Part 2 begins enveloped in that clearing cloud with immediate recovery.`,
  },

  whip_orbit: {
    style: "whip_orbit",
    label: "Camera Whip Orbit (180-Degree Blur)",
    part1Title: "PART 1: GREETING & HIGH-SPEED WHIP ORBIT",
    part2Title: "PART 2: STABILIZATION, CTA & FAREWELL",
    part1Guidance: (duration) =>
      `Part 1 (0s to ${(duration / 2).toFixed(1)}s): Mascot is already in active motion at 0.0s with warm charisma, building up an energetic point or hop as the camera suddenly initiates a high-speed 180-degree circular orbit around the mascot, wrapping heavy horizontal motion blur around the scene at the midpoint.`,
    part2Guidance: (duration) =>
      `Part 2 (${(duration / 2).toFixed(1)}s to ${duration}s): Opens in horizontal orbit motion blur; within 0.3s the camera smoothly decelerates into a stable, flattering front/three-quarter hero angle. The mascot catches the camera's eye immediately, delivers the second clause with effortless charm, showcases the intact in-scene 3D channel logo, and finishes with a heartfelt farewell wave and sign-off (e.g. 'See ya!' or 'Bye!').`,
    part1Continuity:
      "Vector: Camera initiates rapid 180-degree orbit.\nThe final 0.4s MUST feature intense horizontal motion blur along the orbit trajectory. No subtitles or watermark.",
    part2StartingState:
      "Starting state: Opens with high-velocity horizontal rotational motion blur from a circular camera orbit. Within 0.3s, the camera rapidly decelerates and stabilizes into a crisp medium-close hero shot from the front angle, catching the mascot facing forward.",
    part2Continuity:
      "Kinetic continuity: Camera motion comes to a rock-solid, vibration-free rest.\nMascot faces forward with full visual clarity and hands free to showcase the official logo.",
    technicalContract: (duration) =>
      `- For two-part whip orbit outro (${duration}s): Part 1 ends in rapid circular camera orbit with horizontal blur. Part 2 opens in that orbit blur and decelerates into stable hero framing.`,
  },

  comic_freeze: {
    style: "comic_freeze",
    label: "Comic Springboard & Starburst Wipe",
    part1Title: "PART 1: COMEDIC ACCELERATION & SPRINGBOARD LAUNCH",
    part2Title: "PART 2: CARTOON RECOVERY, CTA & FAREWELL",
    part1Guidance: (duration) =>
      `Part 1 (0s to ${(duration / 2).toFixed(1)}s): Mascot is already in lively kinetic motion at 0.0s powered by its entrance seed (speeding in a kart/cruiser, riding a bouncy creature, flying, or comic sprint), accelerating across the stage and bouncing off a comic springboard or bouncy floor directly toward the lens. At the exact midpoint, the mascot's high-speed celebratory launch impacts the lens with an explosive comic starburst contact flash that completely washes out the frame. NEVER freeze in a static shock pose.`,
    part2Guidance: (duration) =>
      `Part 2 (${(duration / 2).toFixed(1)}s to ${duration}s): The starburst contact flash clears instantly as the mascot rebounds with bouncy cartoon physics, tumbling cleanly into an upright slide-stop. Mascot immediately delivers the second clause with witty warmth, gestures towards the intact in-scene 3D channel logo, and gives a cheerful goodbye wave with a playful sign-off (e.g. 'See ya!' or 'Bye!').`,
    part1Continuity:
      "Vector: High-speed comic trajectory along the entrance path into the starburst wipe.\nThe final 0.4s MUST impact the lens with a 100% full-frame comic starburst contact flash wipe. No static freezing or shock poses.",
    part2StartingState:
      "Starting state: Seamless continuation rebounding out of the starburst contact flash with bouncy cartoon physics into an upright slide-stop.",
    part2Continuity:
      "Kinetic continuity: Bouncy cartoon rebound into living motion.\nMascot smiles warmly with hands free to showcase the official logo and wave.",
    technicalContract: (duration) =>
      `- For two-part comic launch outro (${duration}s): Mascot launches forward with high velocity. The midpoint MUST culminate in a solid starburst contact flash wipe. Part 2 rebounds cleanly into speech delivery. No static shock freezes.`,
  },
};

export function resolveTransitionArchetype(style?: string): TransitionArchetypeDefinition {
  if (style && style in TRANSITION_ARCHETYPES) {
    return TRANSITION_ARCHETYPES[style as keyof typeof TRANSITION_ARCHETYPES];
  }
  return TRANSITION_ARCHETYPES.flash_stunt;
}

export function buildTwoPartGuidance(style: IntroOutroTransitionStyle | undefined, duration: number): {
  creativeBrief: string;
  technicalContract: string;
} {
  if (style && style !== "auto" && style in TRANSITION_ARCHETYPES) {
    const archetype = TRANSITION_ARCHETYPES[style];
    return {
      creativeBrief: `Structure the performance across two linked segments with a seamless ${archetype.label} transition:
1. ${archetype.part1Guidance(duration)}
2. ${archetype.part2Guidance(duration)}
3. Dialogue Enjambment: Part 1 and Part 2 form ONE grammatically continuous compound sentence. Part 1 ends with an ellipsis ('...') and Part 2 continues directly with an ellipsis ('...'). Do not use filler interjections like 'Boom!', 'Wait!', or 'Hey!'.
4. Environment Anchoring: Both parts are rendered independently. Author a rich, physical scene environment (concrete floor materials, lighting fixtures, background cyclorama) without relying on bare color hex codes or cross-referencing phrases like 'same as Part 1'. All fixed environment elements must be self-contained and identical across both parts.
5. No Prop Catching or Stowing in Part 2: In Part 2, the mascot emerges with hands free, delivering speech immediately and gesturing directly to the in-scene 3D channel logo.`,
      technicalContract: archetype.technicalContract(duration),
    };
  }

  // "auto" mode: provide options and let LLM choose the best fit
  return {
    creativeBrief: `Structure the performance across two linked segments (${duration}s total). Choose the ONE transition archetype that best fits the mascot's anatomy, temperament, and creative seeds:
- [flash_stunt]: High-energy kinetic transport (riding a creature/vehicle, soaring, carving, or athletic sprint) into an athletic stunt (diving ring/high-five/vault), detonating a 100% whiteout flash at midpoint before sliding recovery. (Best for athletic/sporty mascots)
- [occlusion_wipe]: Mascot sweeps a prop (quiz card/prize box/hand/wing) completely across the camera to occlude 100% of the lens, then sweeps away. (Best for naturalistic/item/mystery)
- [kinetic_match_cut]: Mascot spins like a whirlwind or leaps to an apex silhouette; Part 2 lands cleanly from the matching apex. (Best for acrobatic/dance/action)
- [elemental_burst]: Thematic smoke poof, confetti pop, water splash, or cyber-glitch wave engulfs the lens and disperses. (Best for magic/celebration/sci-fi)
- [whip_orbit]: Fast 180-degree camera whip orbit with intense horizontal blur, resolving into the opposite hero angle. (Best for cinematic/gameshow)
- [comic_freeze]: Springboard comic bounce toward lens detonating an explosive starburst contact flash wipe, then bouncy cartoon landing. (Best for cute/playful/slapstick)

CRITICAL TRANSITION MANDATE:
- ENTRANCE SEED FIDELITY: Part 1 MUST visibly choreograph the mascot using the specific transport or motion mode defined by the selected entrance seed (dinosaur mount, bicycle/kart, airplane, surfboard, broom flight, racecar, jetpack, etc.). NEVER flatten diverse entrance seeds into generic running on foot!
- The transition at midpoint MUST be a physical kinetic event that fully washes out or occludes the frame (contact flash, full lens wipe, 360 spin blur, particle burst).
- STRICTLY FORBIDDEN: Static shock faces, double-take freezes, or stationary poses at the seam. Every transition must carry high-velocity kinetic momentum across the cut!

Record your chosen style in production_directions.transition_style.

Requirements across both parts:
1. Part 1 (0s to ${(duration / 2).toFixed(1)}s): Mascot begins ALREADY in full kinetic motion at 0.0s (in-media-res) dynamically adopting the selected entrance seed (e.g. riding a dinosaur/creature mount, pedaling a bike or kart, piloting an airplane, carving on a surfboard, flying on a broom, driving a cruiser, or an athletic parkour sprint); carry this transport mode and velocity smoothly across the stage while delivering the first clause of speech into the transition setup.
2. Part 2 (${(duration / 2).toFixed(1)}s to ${duration}s): Recover seamlessly from the transition, immediately deliver the second clause, gesture proudly to the intact in-scene 3D channel logo, and give an affectionate farewell wave with a natural sign-off line (e.g. 'See ya!' or 'Bye!').
3. Dialogue Enjambment: Part 1 and Part 2 form ONE grammatically continuous compound sentence. Part 1 ends with an ellipsis ('...') and Part 2 continues directly with an ellipsis ('...').
4. Environment Anchoring: Both parts are rendered independently. Author a rich, physical scene environment (concrete floor materials, lighting fixtures, background cyclorama) without relying on bare color hex codes or cross-referencing phrases like 'same as Part 1'. All fixed environment elements must be self-contained and identical across both parts.
5. Hands Free in Part 2: Mascot emerges with hands free without having to catch or stow props thrown in Part 1.`,
    technicalContract: `- For two-part outro (${duration}s): Execute the chosen transition archetype cleanly at the midpoint boundary (${(duration / 2).toFixed(1)}s). Speech must be continuous and finish before the final 2.5s living hold. Declare transition_style in production_directions.`,
  };
}
