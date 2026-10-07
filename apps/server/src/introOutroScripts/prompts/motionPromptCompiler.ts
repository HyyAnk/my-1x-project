import type { MotionPromptRequest, MotionPromptStyleMood } from "@studio/shared";

export interface MotionPromptCompilerOptions {
  topicTitle: string;
  channelName?: string;
  placement?: "intro" | "outro" | "both";
  mood?: MotionPromptStyleMood;
  targetDurationSeconds?: number;
  audienceAgeBand?: string;
  recommendedTemplateId?: string;
  accentColor?: string;
}

const MOOD_DESCRIPTORS: Record<MotionPromptStyleMood, { palette: string; tone: string; rhythm: string }> = {
  cyberpunk: {
    palette: "Deep obsidian, high-voltage cyan, and hot neon magenta (#00FFFF, #FF007F, #090312)",
    tone: "Futuristic, arcade-tech, electrifying perspective grids with scanline CRT pulses",
    rhythm: "Fast snap entry (0.2s), persistent grid glow oscillation, crisp glitch accents",
  },
  high_energy: {
    palette: "Vibrant hot pink, electric amber, and rich dark violet (#FF007F, #F59E0B, #1A0826)",
    tone: "Punchy, bold impact, oversized typography with radial shockwaves and dynamic bounce",
    rhythm: "Instant hook entry (<0.15s), heavy cubic-bezier slam with spring overshoot",
  },
  minimal_luxury: {
    palette: "Frosted glass whites, deep slate charcoal, and indigo accent (#6366F1, #FFFFFF, #0D0D14)",
    tone: "Sleek card elevation, blur backdrops, understated luxury and editorial minimalism",
    rhythm: "Smooth fluid bezier easing (cubic-bezier(0.16, 1, 0.3, 1)), gradual ambient float",
  },
  arcade_playful: {
    palette: "Candy lemon yellow, bright cyan, bubblegum pink (#FFD700, #00FFFF, #FF0055)",
    tone: "Gamified achievement badges, confetti particles, bouncy bouncy springs, retro coins",
    rhythm: "Playful triple-beat stagger with trophy zoom and festive pulse",
  },
  epic_cinematic: {
    palette: "Molten gold, deep ember orange, and dark charcoal (#E0A82E, #EF4444, #121016)",
    tone: "Dramatic spotlight beams, grand cinematic presence, monumental typography",
    rhythm: "Deliberate crescendo zoom with trailing lens flares and lingering prestige hold",
  },
  educational_clean: {
    palette: "Emerald mint, crisp sky blue, and clean navy (#10B981, #38BDF8, #0F172A)",
    tone: "Crystal-clear readability, informative badge pills, inviting modern classroom feel",
    rhythm: "Neat step-by-step staggered card slide with steady 1.2s comprehension window",
  },
};

/**
 * Compiles a structured, highly constrained Opus-style LLM prompt
 * to instruct an AI model to generate deterministic motion graphics.
 */
export function compileOpusMotionPrompt(options: MotionPromptCompilerOptions): string {
  const mood = options.mood ?? "high_energy";
  const placement = options.placement ?? "intro";
  const duration = options.targetDurationSeconds ?? (placement === "intro" ? 2.6 : 3.5);
  const moodInfo = MOOD_DESCRIPTORS[mood];
  const channel = options.channelName ? `"${options.channelName}"` : "the host channel";
  const audience = options.audienceAgeBand ? `Target audience: ${options.audienceAgeBand}.` : "Target audience: General audience.";

  return [
    `# SYSTEM DIRECTIVE: OPUS-STYLE DETERMINISTIC MOTION GRAPHICS GENERATOR`,
    ``,
    `You are an elite motion graphics engineer and creative art director specialized in programmatic animation using HTML, SVG, and CSS Keyframes.`,
    `Generate an autonomous, self-contained motion graphic clip matching the following creative brief:`,
    ``,
    `## CREATIVE BRIEF`,
    `- Scene Type: ${placement.toUpperCase()} hook scene`,
    `- Quiz Topic: "${options.topicTitle}"`,
    `- Brand / Channel: ${channel}`,
    `- Visual Mood: ${mood.toUpperCase()}`,
    `- Pacing & Palette: ${moodInfo.palette}`,
    `- Tone & Atmosphere: ${moodInfo.tone}`,
    `- Animation Rhythm: ${moodInfo.rhythm}`,
    `- Target Duration: ${duration.toFixed(2)} seconds`,
    `- ${audience}`,
    ``,
    `## CORE TECHNICAL CONSTRAINTS`,
    `1. ZERO EXTERNAL DEPENDENCIES: Never import external CDNs, Google Fonts, Tailwind, or external scripts. Use system font stack or inherit from document context.`,
    `2. DETERMINISTIC TIMING: All animations MUST use CSS keyframes or SVG attributes bounded by the duration variable (--duration: ${duration.toFixed(2)}s). No unpredictable async delays or requestAnimationFrame drifts.`,
    `3. CONTAINER CONTRACT: Wrap the output inside a single <section class="clip candy-scene motion-${placement}-scene" data-start="0" data-duration="${duration.toFixed(3)}" data-track-index="0">.`,
    `4. ACCESSIBILITY & FALLBACK: All keyframes must respect prefers-reduced-motion: reduce with static settled transforms.`,
    `5. HIGH CONTRAST HIERARCHY: Maintain WCAG AA contrast against dark backgrounds. Ensure typography elements (Kicker, Title, Subtitle/CTA) do not collide across 16:9 and 9:16 canvases.`,
    ``,
    `## CHOREOGRAPHY BREAKDOWN`,
    `- 0.00s - 0.20s [IN]: Explosive kinetic entry with staggered opacity and spring overshoot transform.`,
    `- 0.20s - ${(duration * 0.75).toFixed(2)}s [HOLD]: High-energy secondary motion (ambient glow pulse, particle drift, or floating badge).`,
    `- ${(duration * 0.75).toFixed(2)}s - ${duration.toFixed(2)}s [OUT]: Clean handoff readiness for the subsequent quiz question / recap sequence.`,
  ].join("\n");
}
