import type { IntroOutroClipKind } from "@studio/shared";
import type { CreativePromptInput } from "./promptTypes.js";

export const COMMON_OUTPUT_EXAMPLE_STYLE = {
  description:
    "Polished mirror-gloss epoxy arena floor bordered by sleek geometric platforms, backed by a curved cobalt-to-amber cyclorama backdrop with a perimeter glowing LED ring.",
  palette: ["Mirror Gloss White", "Deep Cobalt Blue", "Warm Amber", "Neon Cyan Trim"],
  staging:
    "Multi-layered depth with an open foreground runway, center-stage hero brand anchor flanked by dual volumetric rim spotlights, and layered architectural arches in the deep background.",
  motion_language:
    "Fluid steadicam glide dynamics with soft atmospheric haze and floating golden sparkle particles catching the volumetric rim lights.",
};

export function resolvePromptClipAndContext(input: CreativePromptInput, kind: IntroOutroClipKind) {
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
  return { clip, duration, logoMode, anchor };
}

export function buildSceneEnvironmentAndAudioSection(duration: number, isTwoPartOutro = false): string {
  return `Match the reference style, not a forced 3D aesthetic. Write a small entertaining performance, not a checklist of safe gestures.
Use the selected seeds as inspiration. Vary the premise, entrance, emotional reactions, staging within the shared set, sound palette and ending. Do not always use an energy ball, chase, logo explosion or pointing pose.
Learn from this optional example: a chase creates a catch, a tiny silence lets a worried reaction register, a harmless surprise reveals the brand, and a spoken payoff lands with a musical hit. Borrow the cause-and-reaction logic, not the exact plot. Other rhythms are welcome.
The number of gestures, sound cues, characters and short speech turns should serve the idea and available time. A deliberate second identical mascot or a repeated phrase can be a creative choice; distinguish performers and schedule each intended utterance clearly. Never invent anatomy or distort rigid accessories.

SCENE ENVIRONMENT & VISUAL CONTINUITY
CINEMATIC SCENE ARCHITECTURE MANDATE:
When an environment seed (intro_environment) is present in the seed matrix, shared.style MUST faithfully embody its architectural setting, materials, lighting scheme, and environmental props. If no specific environment seed is given, author a rich, broadcast-grade physical studio environment aligned with the channel style preset. Terse, lazy 1-line scene summaries (e.g. 'A 3D stage with soft lighting') are STRICTLY PROHIBITED.
Author concrete, rich physical scene descriptions in shared.style:
- description: Describe the physical architectural stage, flooring physics and reflections (e.g. mirror-gloss epoxy floor with sharp character reflections, translucent acrylic neon-grid floor, polished hardwood trivia arena, or candy marshmallow tiles), and deep horizon background (e.g. curved cobalt cyclorama backdrop, illuminated portal arches, or floating geometric elements). Focus on tangible architectural elements and physical materials rather than generic color hex codes.
- staging: Detail spatial depth across 3 layers (open foreground runway for the kinetic entrance, center-stage hero brand anchor where mascot and 3D logo interact, and multi-layered backdrop with architectural depth), plus physical lighting fixtures (e.g. dual overhead key spotlights, volumetric warm rim lights, glowing LED trims).
- motion_language: Detail camera dynamics, volumetric light interactions, and atmospheric particle energy (e.g. floating golden sparkle dust, holographic glitch pixels, soft volumetric haze, or sugar sparkle motes catching the rim lights).
- palette: In shared.style.palette, provide 3-5 descriptive environmental lighting tones and surface colors (e.g. 'Mirror Gloss White, Deep Cobalt Blue, Warm Amber, Neon Cyan Trim') instead of bare hex codes.
${isTwoPartOutro ? "Both parts are rendered independently by AI video generators: all physical scene anchors must be rich, concrete, and self-contained. Do NOT use cross-clip shorthand like 'same as Part 1' or 'matching Part 1' anywhere in descriptions." : "All physical scene anchors must be rich, concrete, and self-contained for the AI video generator."}

AUDIO DESIGN
Generate picture, BGM, SFX and scheduled speech together as one synchronized audiovisual clip. Give the music an engaging entrance, development and a satisfying ending within ${duration}s. Start energetically when the premise calls for it; a deliberate quiet opening or pause is also valid.
Use concise action-linked directions like WHOOSH - entrance, SKID - sliding stop, POP - contact, tiny silence - anticipation, BOING - bounce, music builds - payoff. These are examples, not required effects or a fixed order.
Write the actual musical arc in audio.music_direction, with timed accents in audio.events. Choose timbres and rhythm that make this specific performance funny and inviting. Music and SFX must leave speech clear. A final hit can land on a stressed word or a visual joke; no mandatory single-hit formula.
Speech belongs in voiceover.lines. Author the wording, delivery and timing naturally; short reactions, exchanges, intentional repetition or a silent performance are valid. Descriptions elsewhere refer to these same speech events, not additional performances. Do not accidentally replay a line because it is mentioned twice.`;
}

export function buildContextAndAnchorSection(input: CreativePromptInput, kind: IntroOutroClipKind, clip: CreativePromptInput["clips"][number], anchor: unknown): string {
  return `STRUCTURE AND SEED MATRIX
${JSON.stringify([{ kind, duration: clip.durationSeconds, logo_mode: input.context.logoReference ? (clip.logoMode ?? "supplied_reference") : "none", variation_seed: clip.seedSelection?.randomization_seed ?? clip.randomizationSeed ?? "fresh", seeds: clip.seeds.map((seed) => ({ id: seed.id, name: seed.name, intent: seed.narrative_intent, required_capabilities: seed.required_capabilities, complexity: seed.complexity })) }])}

CHANNEL
${JSON.stringify({ name: input.context.channel.display_name, audience: input.context.channel.target_audience, style: input.context.style.name })}

MASCOT IDENTITY
${JSON.stringify(input.identity)}

PAIR ANCHOR
${JSON.stringify(anchor)}
Preserve the shared visual set, style and logo placement when supplied. Use its musical identity as a theme, but write this clip's own score development in audio.music_direction. An anchor is not a prescribed action sequence.`;
}

export function buildCommonTechnicalRules(duration: number, logoMode: string): string {
  return `- Aim to fit camera, speech and sound inside ${duration}s. Overlapping reactions, pauses and layered events may be intentional. A final hold is optional; use 0 when unnecessary. Do not freeze the performance solely to satisfy a default hold.
- CINEMATIC ACTION DETAIL & KINETIC DENSITY MANDATE: Every timeline beat MUST contain rich, vivid, multi-sensory action prose (2-3 evocative sentences, approximately 40-70 words per beat). Terse, lazy 1-line summaries (such as 'Mascot jumps and points' or 'Mascot smiles') are STRICTLY PROHIBITED. Each beat's action prose must explicitly choreograph:
  1) Physical Kinematics & Trajectory: specific velocity, directional momentum (e.g. sprinting diagonally across the stage, centrifugal 360-degree spin, athletic landing roll, high-flying vault), and balance recovery.
  2) Facial Performance & Expression: eyes widening in playful mischief, bright toothy grin, proud gaze locking directly onto the camera lens, animated wink, or warm cheerful nods.
  3) Interactive Props & Stage Interaction: concrete physical items (e.g. golden quiz card, glowing buzzer, futuristic hoverboard, stage podium) and how the mascot actively manipulates or reacts to them.
  4) Visual FX & Lighting Dynamic: speed lines, floor reflection flares, particle trails, or atmospheric light sweeps that give AI video renderers tangible visual hooks.
- Use voice_source mascot for scheduled speech and none for a silent performance. When multiple mascots appear, identify the speaker in each line's delivery. Keep the same character voice across the pair unless an intentional delivery change is authored.
- Choreography metadata is optional; action prose owns the performance. If useful, put freely written primary_action, expression, secondary_motion and end_pose descriptions inside choreography. These are descriptions, not a fixed action menu; omitted fields are allowed.
- Use real identity feature IDs and declare required capabilities. Do not use explicitly unsupported anatomy or skills. Unknown capabilities need cautious reference-based judgment, not invented limbs or joints. Preserve identity and rigid surfaces; natural occlusion is allowed.
- ${logoMode === "supplied_reference" ? "supplied_reference: reveal the exact attached official logo intact in-scene; never redraw, warp or respell it." : logoMode === "post_overlay" ? "post_overlay: leave the supplied logo region for the editor; do not generate logo typography or require a physical logo." : "none: no logo or invented brand text."}
- In-media-res opening: production_directions.opening_state must describe the mascot ALREADY in active kinetic motion at 0.0s (e.g. mid-pedal, mid-flight, mid-surf, mid-sprint, or mid-tumble), never standing still, in an idle stance, or waiting to move.
- ENTRANCE SEED LOCOMOTION FIDELITY: When an entrance seed specifies a vehicle, creature mount, flight, board, or acrobatic stunt (such as dinosaur mount, bicycle, airplane, surfboard, magic broom, go-kart, or parkour vault), the script's opening_state and Part 1 timeline MUST visibly choreograph the mascot actively riding, piloting, or performing that specific transport mode. NEVER flatten distinct transport seeds into generic running on foot.
- No subtitles or watermark. Include only necessary identity restrictions, not creative prohibitions. Replace example placeholders with authored content. The example timing is illustrative, not mandatory.`;
}
