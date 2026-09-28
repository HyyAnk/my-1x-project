import type { IntroOutroScriptContent } from "@studio/shared";

export const INTRO_SOUND_CUE_LIMIT = 6;

// Plain-language score direction travels with the video prompt, not a separate audio pipeline.
export const INTRO_MUSIC_ARC =
  "Start a catchy, bouncy children's game-show instrumental immediately at 0s, with bright melodic notes and playful percussion. " +
  "Carry the fun through the entrance and action; briefly hush for the comedy reaction, then spring back for the reveal. " +
  "Build into one big, joyful musical hit at the scheduled payoff. Let its short tail resolve into the hard cut; no long fade, restart or extra ending hit. " +
  "Keep dialogue clear above the music and SFX.";

export function introAudioDesign(duration: number): string {
  return [
    "Generate music, SFX and any scheduled dialogue together with the picture as one synchronized audiovisual clip.",
    `BGM [0-${duration}s]: ${INTRO_MUSIC_ARC}`,
    "SFX: playful cartoon sounds exactly on the visible actions; the timed cues below describe those same events, not additional sounds. No spoken sound-effect names.",
    `Finish all sound naturally within ${duration}s, ready for the immediate cut into the quiz.`,
  ].join("\n");
}

export function soundCueLimit(content: IntroOutroScriptContent): number {
  return content.production.clip_kind === "intro" && content.production_policy === "dynamic-micro-narrative-v2" ? INTRO_SOUND_CUE_LIMIT : 3;
}

export function introPerformanceDirection(content: IntroOutroScriptContent): string {
  const line = content.voiceover.enabled ? content.voiceover.lines[0] : undefined;
  const logo = content.production_directions?.logo_mode;
  const accent =
    logo === "supplied_reference"
      ? "Accent the intact logo with one rigid-body bounce, never deform its lettering."
      : logo === "post_overlay"
        ? "Accent the mascot silhouette; keep the editor-only logo area clear."
        : "Accent the mascot silhouette; do not invent a logo.";
  return [
    "One mascot only. Fast hook, readable reaction, brief anticipation, reveal, then one payoff; not constant maximum speed.",
    line
      ? `The only speech event is the AUDIO line at ${line.start_seconds}-${line.end_seconds}s. Sync the single musical payoff accent to its final stressed word; this is not a second utterance. Keep music and effects below speech.`
      : "No speech. Sync the musical payoff accent to the final visible gesture.",
    accent,
    "Finish with living follow-through into the hard cut, not another action or repeated celebration.",
  ].join(" ");
}
