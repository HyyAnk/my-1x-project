import type { IntroOutroClipKind, IntroOutroScriptContent } from "@studio/shared";

// Speech is an authored performance direction, not a fact inferred from a still image.
export const INTRO_DIALOGUE_BY_SEED: Record<string, { text: string; delivery: string }> = {
  D01: { text: "Can you beat this? Go!", delivery: "The mascot challenges the viewer with playful, confident energy and clear lip-sync" },
  D02: {
    text: "Ready for adventure? Let's go!",
    delivery: "The mascot invites the viewer eagerly with bright, adventurous energy and clear lip-sync",
  },
  D03: {
    text: "3, 2, 1... Quiz time!",
    delivery: "The mascot counts down punchily into the quiz with joyful excitement and clear lip-sync",
  },
  D04: {
    text: "Welcome friends! Let's play!",
    delivery: "The mascot greets viewers with a warm, open smile and clear synchronized lip-sync",
  },
  D05: { text: "Let's discover answers together!", delivery: "The mascot speaks with curious enthusiasm and clear synchronized lip-sync" },
  D06: { text: "Get ready! Let's play!", delivery: "The mascot pumps up the audience with high energy and clear lip-sync" },
  D07: { text: "Time for fun! Let's go!", delivery: "The mascot invites viewers playfully with upbeat cheer and clear lip-sync" },
  D08: { text: "Think fast! Let's quiz!", delivery: "The mascot delivers a punchy action call with snappy enthusiasm and clear lip-sync" },
  D09: {
    text: "Can you score full points?",
    delivery: "The mascot issues a spirited, smiling challenge directly to the camera with clear lip-sync",
  },
  D10: {
    text: "Think you know? Let's see!",
    delivery: "The mascot poses a cheeky, curious teaser with expressive eyebrow raise and clear lip-sync",
  },
};

export const OUTRO_DIALOGUE_BY_SEED: Record<string, { text: string; delivery: string }> = {
  F01: { text: "Subscribe for more fun soon!", delivery: "The mascot gives a warm, friendly invitation with synchronized lip-sync" },
  F02: { text: "Come back and play soon!", delivery: "The mascot waves invitingly while speaking cheerfully with clear lip-sync" },
  F03: { text: "You did awesome today! Bye!", delivery: "The mascot celebrates the viewer with proud delight and clear lip-sync" },
  F04: { text: "Ready for the next challenge?", delivery: "The mascot teases the next quiz excitedly with clear lip-sync" },
  F05: { text: "More fun puzzles coming soon!", delivery: "The mascot shares a playful teaser with a broad smile and clear lip-sync" },
  F06: { text: "Thanks for playing! See ya!", delivery: "The mascot gives a sincere, happy sign-off with clear synchronized lip-sync" },
  F07: { text: "Join our quiz crew soon!", delivery: "The mascot delivers a warm community farewell with clear synchronized lip-sync" },
};

export function mascotDialogue(
  kind: IntroOutroClipKind,
  durationSeconds = 8,
  seedIds: readonly string[] = [],
): IntroOutroScriptContent["voiceover"] {
  const customIntro = seedIds.includes("D09")
    ? INTRO_DIALOGUE_BY_SEED.D09
    : seedIds.includes("D10")
      ? INTRO_DIALOGUE_BY_SEED.D10
      : undefined;

  const defaultLine =
    kind === "intro"
      ? (customIntro ?? {
          text: "Quiz time!",
          delivery: "The mascot speaks directly to the viewer, joyfully and enthusiastically, with clear synchronized lip-sync",
        })
      : {
          text: "See you next quiz!",
          delivery: "The same mascot voice speaks warmly and playfully to the viewer, with clear synchronized lip-sync",
        };

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

export const MASCOT_SPEECH_DIRECTION =
  "The visible mascot is the speaker, addressing the viewer with synchronized mouth movement matching every spoken word. Use the same cheerful character voice for intro and outro. Preserve the reference mouth design and facial identity; no off-screen narrator. Speak each AUDIO line exactly once, only inside its time window. No repeats, echoes, ad-libs or additional vocalizations. Keep the mouth non-speaking outside that window; visual follow-through may continue.";
