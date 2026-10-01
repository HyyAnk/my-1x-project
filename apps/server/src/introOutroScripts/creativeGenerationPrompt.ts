import type { IntroOutroClipKind } from "@studio/shared";
import type { ScriptGenerationInput } from "./generation.types.js";
import { scriptBeatStructure } from "./generationStructure.js";

export type CreativePromptInput = Pick<ScriptGenerationInput, "context" | "identity" | "companionContent" | "pairAnchor"> & {
  clips: Array<
    Pick<ScriptGenerationInput["clips"][number], "clipKind" | "durationSeconds" | "logoMode"> & {
      seeds: readonly ScriptGenerationInput["clips"][number]["seeds"][number][];
      seedSelection?: ScriptGenerationInput["clips"][number]["seedSelection"];
      randomizationSeed?: string;
    }
  >;
};

function outputExample(kind: IntroOutroClipKind, duration: number) {
  return {
    shared: {
      style: { description: "...", palette: [], staging: "...", motion_language: "..." },
      music_direction: "...",
      logo_placement: "...",
    },
    clips: {
      [kind]: {
        production_directions: {
          reference_mode: "character_reference",
          voice_source: "mascot",
          opening_state: "...",
          closing_state: "...",
          end_hold_seconds: 0,
        },
        timeline: scriptBeatStructure(kind, duration).map((beat) => ({
          ...beat,
          action: "...",
          capability_ids: [],
          props: [],
          visible_feature_ids: [],
        })),
        voiceover: {
          enabled: true,
          lines: [{ start_seconds: duration * 0.65, end_seconds: duration * 0.85, text: "...", delivery: "..." }],
        },
        audio: {
          music_direction: "Describe this clip's musical entrance, development and ending",
          events: [{ at_seconds: 0, direction: "Describe a sound synchronized to the authored opening action" }],
        },
        camera: [{ start_seconds: 0, end_seconds: duration, framing: "...", movement: "..." }],
        consistency: { allowed_visible_text: [], restrictions: [] },
      },
    },
  };
}

export function buildCreativeGenerationPrompt(input: CreativePromptInput, kind: IntroOutroClipKind): string {
  const clip = input.clips.find((candidate) => candidate.clipKind === kind) ?? input.clips[0];
  const duration = clip.durationSeconds;
  const logoMode = input.context.logoReference ? (clip.logoMode ?? "supplied_reference") : "none";
  const anchor =
    input.pairAnchor ??
    (input.companionContent
      ? {
          style: input.companionContent.style,
          music_direction: input.companionContent.audio.music_direction,
          logo_placement: input.companionContent.production_directions?.logo_placement,
        }
      : null);
  return `Write only the requested ${kind.toUpperCase()} script for channel ${input.context.channel.display_name}. Return JSON only, no markdown wrapping, no commentary.

CREATIVE BRIEF
${
  kind === "intro"
    ? "Create an immediately engaging, playful quiz opening with personality and a satisfying handoff, hard-cutting into Question 1."
    : duration >= 12
      ? `Create a warm, playful, high-energy two-part outro sequence (${duration}s total). Structure the performance across two linked segments with a seamless kinematic match cut:
1. Part 1 (0s to ${(duration / 2).toFixed(1)}s): Mascot celebrates enthusiastically and accelerates into an athletic run/sprint, speaking naturally on the run. At the midpoint, the mascot launches into a decisive kinematic stunt (e.g. diving into a golden energy ring, slapping the camera for a high-five, or an acrobatic vault), detonating a 100% whiteout/contact flash that washes out the entire frame.
2. Part 2 (${(duration / 2).toFixed(1)}s to ${duration}s): The white flash dissipates as the mascot bursts out with matching momentum, landing, rolling, and popping upright into a sliding stop. The mascot immediately delivers the second clause of the sentence without filler words, gestures proudly to the intact in-scene 3D channel logo, and finishes with an affectionate farewell wave.
3. Dialogue Enjambment: Part 1 and Part 2 form ONE grammatically continuous compound sentence. Part 1 ends with an ellipsis ('...') and Part 2 continues directly with an ellipsis ('...'). Do not use filler interjections like 'Boom!', 'Wait!', or 'Hey!'.
4. Environment Anchoring: Maintain strict consistency across stage geometry, porcelain-white floor, glowing cyan perimeter LED ring, and cobalt-to-amber gradient horizon backdrop to prevent environmental drift.
5. No Prop Catching or Stowing in Part 2: If an item or prop (badge, trophy, coin, ring, or high-five) was launched toward the camera in Part 1 to cause the flash wipe, do NOT have the mascot catch, retrieve, or stow the item in Part 2. The item has already detonated into light or passed beyond the camera. In Part 2, the mascot emerges with hands free, rolls and slides upright, immediately delivering speech and gesturing directly to the in-scene 3D channel logo.`
      : "Create a warm, playful farewell with a natural invitation to subscribe to the channel. Make subscribing the only call to action, expressed through a playful gesture or gag and, when speech is used, a short friendly spoken reminder. Use the full frame for the performance. Do not reserve space, move the mascot aside, point toward recommended videos, create video-card placeholders or lock the camera for end-screen overlays. Choose the action, rhythm and ending freely."
}
Match the reference style, not a forced 3D aesthetic. Write a small entertaining performance, not a checklist of safe gestures.
Use the selected seeds as inspiration. Vary the premise, entrance, emotional reactions, staging within the shared set, sound palette and ending. Do not always use an energy ball, chase, logo explosion or pointing pose.
Learn from this optional example: a chase creates a catch, a tiny silence lets a worried reaction register, a harmless surprise reveals the brand, and a spoken payoff lands with a musical hit. Borrow the cause-and-reaction logic, not the exact plot. Other rhythms are welcome.
The number of gestures, sound cues, characters and short speech turns should serve the idea and available time. A deliberate second identical mascot or a repeated phrase can be a creative choice; distinguish performers and schedule each intended utterance clearly. Never invent anatomy or distort rigid accessories.

AUDIO DESIGN
Generate picture, BGM, SFX and scheduled speech together as one synchronized audiovisual clip. Give the music an engaging entrance, development and a satisfying ending within ${duration}s. Start energetically when the premise calls for it; a deliberate quiet opening or pause is also valid.
Use concise action-linked directions like WHOOSH - entrance, SKID - sliding stop, POP - contact, tiny silence - anticipation, BOING - bounce, music builds - payoff. These are examples, not required effects or a fixed order.
Write the actual musical arc in audio.music_direction, with timed accents in audio.events. Choose timbres and rhythm that make this specific performance funny and inviting. Music and SFX must leave speech clear. A final hit can land on a stressed word or a visual joke; no mandatory single-hit formula.
Speech belongs in voiceover.lines. Author the wording, delivery and timing naturally; short reactions, exchanges, intentional repetition or a silent performance are valid. Descriptions elsewhere refer to these same speech events, not additional performances. Do not accidentally replay a line because it is mentioned twice.

STRUCTURE AND SEED MATRIX
${JSON.stringify([{ kind, duration, logo_mode: logoMode, variation_seed: clip.seedSelection?.randomization_seed ?? clip.randomizationSeed ?? "fresh", seeds: clip.seeds.map((seed) => ({ id: seed.id, intent: seed.narrative_intent, required_capabilities: seed.required_capabilities, complexity: seed.complexity })) }])}

CHANNEL
${JSON.stringify({ name: input.context.channel.display_name, audience: input.context.channel.target_audience, style: input.context.style.name })}

MASCOT IDENTITY
${JSON.stringify(input.identity)}

PAIR ANCHOR
${JSON.stringify(anchor)}
Preserve the shared visual set, style and logo placement when supplied. Use its musical identity as a theme, but write this clip's own score development in audio.music_direction. An anchor is not a prescribed action sequence.
${kind === "outro" ? "If seeds or a previous script suggest video recommendations or reserved end-screen space, replace that suggestion with a natural channel-subscription invitation. Retain the visual identity, not the old reserved-space layout." : ""}

TECHNICAL CONTRACT
- Choose any useful number of timeline groups with your own role names, timings and micro-beats. The three groups in the example are illustrative, not required.
- Aim to fit camera, speech and sound inside ${duration}s. Overlapping reactions, pauses and layered events may be intentional. A final hold is optional; use 0 when unnecessary. Do not freeze the performance solely to satisfy a default hold.
- Choose scene, speech, sound and camera counts to serve the idea. There are no creative count or word quotas. Prefer readable, concise directions without sacrificing the performance.
- Use voice_source mascot for scheduled speech and none for a silent performance. When multiple mascots appear, identify the speaker in each line's delivery. Keep the same character voice across the pair unless an intentional delivery change is authored.
- Choreography metadata is optional; action prose owns the performance. If useful, put freely written primary_action, expression, secondary_motion and end_pose descriptions inside choreography. These are descriptions, not a fixed action menu; omitted fields are allowed.
- Use real identity feature IDs and declare required capabilities. Do not use explicitly unsupported anatomy or skills. Unknown capabilities need cautious reference-based judgment, not invented limbs or joints. Preserve identity and rigid surfaces; natural occlusion is allowed.
- ${logoMode === "supplied_reference" ? "supplied_reference: reveal the exact attached official logo intact in-scene; never redraw, warp or respell it." : logoMode === "post_overlay" ? "post_overlay: leave the supplied logo region for the editor; do not generate logo typography or require a physical logo." : "none: no logo or invented brand text."}
- No subtitles or watermark. Include only necessary identity restrictions, not creative prohibitions. Replace example placeholders with authored content. The example timing is illustrative, not mandatory.
${
  kind === "outro" && duration >= 12
    ? `- For two-part kinematic outro (${duration}s): Align the exit vector of Part 1 (e.g., 30-degree diagonal sprint) with the entry vector of Part 2 (landing roll and pop-up). Midpoint must culminate in a solid whiteout/contact flash covering the entire frame. Speech must be continuous and finish before the final 2.5s living hold. In Part 2, mascot emerges with hands free without catching, retrieving, or stowing any prop thrown in Part 1.`
    : ""
}

OUTPUT SHAPE
${JSON.stringify(outputExample(kind, duration))}`;
}
