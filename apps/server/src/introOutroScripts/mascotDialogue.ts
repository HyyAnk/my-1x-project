import type { IntroOutroClipKind, IntroOutroScriptContent } from "@studio/shared";

// Speech is an authored performance direction, not a fact inferred from a still image.
export function mascotDialogue(kind: IntroOutroClipKind, durationSeconds = 8): IntroOutroScriptContent["voiceover"] {
  return {
    enabled: true,
    lines: [
      {
        start_seconds: durationSeconds * 0.375,
        end_seconds: durationSeconds * 0.6875,
        text: kind === "intro" ? "Quiz time!" : "See you next quiz!",
        delivery:
          kind === "intro"
            ? "The mascot speaks directly to the viewer, joyfully and enthusiastically, with clear synchronized lip-sync"
            : "The same mascot voice speaks warmly and playfully to the viewer, with clear synchronized lip-sync",
      },
    ],
  };
}

export const MASCOT_SPEECH_DIRECTION =
  "The visible mascot is the speaker, addressing the viewer with synchronized mouth movement matching every spoken word. Use the same cheerful character voice for intro and outro. Preserve the reference mouth design and facial identity; no off-screen narrator. Stop speaking and settle the mouth before the final hold.";
