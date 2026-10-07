import type { IntroOutroScriptContent } from "@studio/shared";

/** Duration-relative examples prevent fixed sample timestamps leaking into short clips. */
export function introOutputShape(duration: number, voiceover: IntroOutroScriptContent["voiceover"]): string {
  const at = (fraction: number) => Number((duration * fraction).toFixed(3));
  return JSON.stringify({
    shared: {
      style: { description: "...", palette: [], staging: "...", motion_language: "..." },
      music_direction:
        "Catchy children's game-show instrumental with bouncy melodic notes, playful percussion and sparkling accents; cheerful and energetic, with clear dialogue above the music.",
      logo_placement: "...",
    },
    clips: {
      intro: {
        production_directions: {
          reference_mode: "character_reference",
          voice_source: "mascot",
          opening_state: "Mascot is already in dynamic kinetic motion at 0.0s (e.g. mid-pedal, mid-flight, mid-surf, or mid-sprint)...",
          closing_state: "...",
        },
        timeline: ["arrival", "reveal", "celebrate"].map((primary_action) => ({
          action: "...",
          choreography: { primary_action, expression: "eager", secondary_motion: "natural_follow_through", end_pose: "front_facing" },
          capability_ids: [],
          props: [],
          visible_feature_ids: [],
        })),
        voiceover,
        audio: {
          events: [
            { at_seconds: at(0.025), direction: "WHOOSH - catalyst flies; the bouncy game-show music is already playing" },
            { at_seconds: at(0.32), direction: "POP - contact with the catalyst" },
            { at_seconds: at(0.4), direction: "Dip music and effects for 0.2s of silent anticipation, then resume" },
            {
              at_seconds: at(0.44),
              direction: "Playful reveal POP with sparkles; music springs back brightly and builds toward the payoff",
            },
            {
              at_seconds: Number((voiceover.lines[0].end_seconds - 0.3).toFixed(3)),
              direction:
                "BIG MUSICAL HIT on the final stressed word; keep speech clear, with a short cheerful tail into the cut, no second hit",
            },
          ],
        },
        camera: [
          { start_seconds: 0, end_seconds: at(0.3125), framing: "Medium wide", movement: "Track the entrance; keep the face readable" },
          {
            start_seconds: at(0.3125),
            end_seconds: duration - 1,
            framing: "Medium",
            movement: "Ease closer for the reaction, then reframe the reveal",
          },
          { start_seconds: duration - 1, end_seconds: duration, framing: "Medium", movement: "Fast subtle punch-in" },
        ],
        consistency: { allowed_visible_text: [], restrictions: [] },
      },
    },
  });
}
