import type { IntroOutroClipKind, IntroOutroScriptContent } from "@studio/shared";
import { INTRO_DIALOGUE_BY_SEED } from "./introDialogue.js";
import { OUTRO_DIALOGUE_BY_SEED } from "./outroDialogue.js";

export type { MascotDialogueSeedEntry } from "./dialogueTypes.js";
export { INTRO_DIALOGUE_BY_SEED } from "./introDialogue.js";
export { OUTRO_DIALOGUE_BY_SEED } from "./outroDialogue.js";

export const MASCOT_SPEECH_DIRECTION =
  "The visible mascot is the speaker, addressing the viewer with synchronized mouth movement matching every spoken word. Use the same cheerful character voice for intro and outro. Preserve the reference mouth design and facial identity; no off-screen narrator. Speak each AUDIO line exactly once, only inside its time window. No repeats, echoes, ad-libs or additional vocalizations. Keep the mouth non-speaking outside that window; visual follow-through may continue.";

export function mascotDialogue(
  kind: IntroOutroClipKind,
  durationSeconds = 8,
  seedIds: readonly string[] = [],
): IntroOutroScriptContent["voiceover"] {
  const introSeedId = seedIds.find((id) => id in INTRO_DIALOGUE_BY_SEED);
  const customIntro = introSeedId ? INTRO_DIALOGUE_BY_SEED[introSeedId] : undefined;

  const outroSeedId = seedIds.find((id) => id in OUTRO_DIALOGUE_BY_SEED);
  const customOutro = outroSeedId ? OUTRO_DIALOGUE_BY_SEED[outroSeedId] : undefined;

  const defaultLine =
    kind === "intro"
      ? (customIntro ?? {
          text: "Quiz time!",
          delivery: "The mascot speaks directly to the viewer, joyfully and enthusiastically, with clear synchronized lip-sync",
        })
      : (customOutro ?? {
          text: "See you next quiz!",
          delivery: "The same mascot voice speaks warmly and playfully to the viewer, with clear synchronized lip-sync",
        });

  if (kind === "outro" && durationSeconds >= 10 && customOutro?.secondaryText) {
    const line1Start = Number((durationSeconds * 0.34).toFixed(1));
    const line1End = Number((durationSeconds * 0.65).toFixed(1));
    const line2Start = Number((durationSeconds * 0.71).toFixed(1));
    const line2End = Number((durationSeconds * 0.92).toFixed(1));
    return {
      enabled: true,
      lines: [
        {
          start_seconds: line1Start,
          end_seconds: line1End,
          text: customOutro.text,
          delivery: customOutro.delivery,
        },
        {
          start_seconds: line2Start,
          end_seconds: line2End,
          text: customOutro.secondaryText,
          delivery: customOutro.secondaryDelivery ?? "Warm and affectionate sign-off with friendly wave",
        },
      ],
    };
  }

  const words = defaultLine.text.trim().split(/\s+/).length;
  const introEnd = durationSeconds - 1;
  const introStart = Number(Math.min(durationSeconds * 0.6875, introEnd - words / (160 / 60) - 0.3).toFixed(3));
  return {
    enabled: true,
    lines: [
      {
        start_seconds: kind === "intro" ? introStart : durationSeconds * 0.375,
        end_seconds: kind === "intro" ? introEnd : durationSeconds * 0.6875,
        text: defaultLine.text,
        delivery: defaultLine.delivery,
      },
    ],
  };
}
