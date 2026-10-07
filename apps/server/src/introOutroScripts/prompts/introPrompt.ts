import { INTRO_DIALOGUE_BY_SEED } from "../dialogue/index.js";
import { scriptBeatStructure } from "../generationStructure.js";
import {
  COMMON_OUTPUT_EXAMPLE_STYLE,
  buildCommonTechnicalRules,
  buildContextAndAnchorSection,
  buildSceneEnvironmentAndAudioSection,
  resolvePromptClipAndContext,
} from "./promptCommons.js";
import type { CreativePromptInput } from "./promptTypes.js";

export function buildIntroOutputExample(duration: number, seeds: readonly { id: string }[] = []) {
  const introSeedId = seeds.find((s) => s.id in INTRO_DIALOGUE_BY_SEED)?.id;
  const introEntry = introSeedId ? INTRO_DIALOGUE_BY_SEED[introSeedId] : undefined;
  const introLine = introEntry?.text ?? "Can you score full points today? Step up and prove it!";
  const introDelivery = introEntry?.delivery ?? "High energy, enthusiastic and welcoming with confident smile and clear lip-sync";

  return {
    shared: {
      style: COMMON_OUTPUT_EXAMPLE_STYLE,
      music_direction: "...",
      logo_placement: "...",
    },
    clips: {
      intro: {
        production_directions: {
          reference_mode: "character_reference",
          voice_source: "mascot",
          opening_state:
            "Mascot is already in dynamic kinetic motion at 0.0s adopting the designated entrance seed with pre-existing velocity...",
          closing_state: "...",
          end_hold_seconds: 0,
        },
        timeline: scriptBeatStructure("intro", duration).map((beat) => ({
          ...beat,
          action: "Detailed 2-3 sentence cinematic action prose (kinematics, trajectory, expression, props, visual FX)...",
          capability_ids: [],
          props: [],
          visible_feature_ids: [],
        })),
        voiceover: {
          enabled: true,
          lines: [
            {
              start_seconds: Number((duration * 0.35).toFixed(1)),
              end_seconds: Number((duration * 0.68).toFixed(1)),
              text: introLine,
              delivery: introDelivery,
            },
          ],
        },
        audio: {
          music_direction: "Describe this clip's musical entrance, development and ending",
          events: [{ at_seconds: 0, direction: "Describe a sound synchronized to the authored opening action" }],
        },
        camera: [
          {
            start_seconds: 0,
            end_seconds: duration,
            framing: "Single continuous shot, zero cuts (Wide-to-Medium Steadicam Glide)",
            movement:
              "One unbroken continuous take: Camera smoothly tracks alongside the mascot's kinetic entrance into center stage, fluidly glides alongside the 3D channel logo, and pushes gently closer for the enthusiastic quiz handoff without any cuts.",
          },
        ],
        consistency: { allowed_visible_text: [], restrictions: [] },
      },
    },
  };
}

export function buildIntroGenerationPrompt(input: CreativePromptInput): string {
  const { clip, duration, logoMode, anchor } = resolvePromptClipAndContext(input, "intro");
  const channelName = input.context.channel.display_name;

  return `Write only the requested INTRO script for channel ${channelName}. Return JSON only, no markdown wrapping, no commentary.

CREATIVE BRIEF
Create an immediately engaging, playful quiz opening with personality and a satisfying handoff, hard-cutting into Question 1 (editorial transition outside this clip). Provide a visually captivating ${duration}s single continuous take (one shot) Intro for channel ${channelName}.
NO TRANSITION CUTS OR SCENE BREAKS (ABSOLUTE ZERO CUTS): The entire ${duration}s is one seamless, unbroken performance captured by a continuous camera in the shared scene without any cuts, angle switches, or camera jumps. The hard cut into Question 1 occurs outside this clip during final timeline editing.
ZERO STATIC OPENINGS (IN-MEDIA-RES MOTION): Frame 0.0s must NEVER show the mascot standing still, posing passively, or waiting to start moving. The mascot must appear ALREADY in full kinetic locomotion (e.g. riding a creature mount, pedaling a kart, piloting an airplane, carving on a board, driving a cruiser, or an athletic parkour sprint), bringing the selected entrance seed vibrantly to life. Always adapt the motion style to the mascot's supported capabilities.
PERSISTENT VEHICLE / MOUNT CONTINUITY (ZERO DISAPPEARING VEHICLES): When an entrance seed specifies a vehicle, creature mount, or transport equipment (such as dinosaur mount, bicycle, airplane, surfboard, magic broom, kart, roller skates), the mascot MUST remain with or upon the transport mode throughout the entire ${duration} seconds. The mascot smoothly glides or decelerates to a stop BESIDE THE LOGO while STILL riding, sitting on, or posed beside the vehicle/mount. NEVER perform an 'aerial dismount' or cause the vehicle/mount to vanish midway through the shot, as radical subject disappearances trigger AI video models to cut scenes.
The ${duration}s performance flows through 3 natural continuous phases:
1) Kinematic Entrance (0.0s - ~${(duration * 0.31).toFixed(1)}s): Dynamic tracking shot following the mascot zooming into frame with high velocity and kinetic flair.
2) Brand Interaction & Spoken Hook (~${(duration * 0.31).toFixed(1)}s - ~${(duration * 0.69).toFixed(1)}s): Mascot smoothly decelerates / arcs toward center stage, proudly interacts with the in-scene 3D channel logo while positioned with their mount/vehicle, and delivers an enthusiastic spoken hook welcoming the audience to the quiz challenge.
3) Energetic Quiz Handoff (~${(duration * 0.69).toFixed(1)}s - ${duration}s): Mascot hypes up the audience, gestures or triggers an energetic anticipation cue pointing toward Question 1 (e.g. dramatic buzzer push, energetic pose, or playful countdown gesture), with the camera smoothly gliding into a crisp hero framing before the clip ends on peak energy, ready for the external editorial hard-cut into Question 1.

${buildSceneEnvironmentAndAudioSection(duration, false)}

${buildContextAndAnchorSection(input, "intro", clip, anchor)}
ENTRANCE SEED TRANSPORT FIDELITY MANDATE:
When an entrance seed specifies a vehicle, creature mount, flying apparatus, board, or athletic equipment (e.g. A04 Supported Ride, A12 Magic Broom, A13 Surfboard/Skateboard, A15 Pedal Bike/Kart, A16 Parachute/Jetpack, A18 Dino Mount, A19 Plane/Glider, A20 Racecar/Cruiser, A22 Roller Skates, A23 Springboard Bounce):
- opening_state MUST explicitly specify the mascot ALREADY at 0.0s actively riding, piloting, soaring, carving, or sprinting with that designated transport mode.
- Timeline Beat 1 action prose MUST vividly describe the steering dynamics, propulsion, trajectory, and physical kinetic interaction with that equipment.
- STRICTLY FORBIDDEN: NEVER flatten, replace, or downgrade a vehicle, mount, glider, or board entrance into generic foot running or sprinting.
- STRICT ANTI-BIAS MANDATE: Author ONLY the specific locomotion or transport mode authored in the selected entrance seed. If the selected seed is NOT Canopy Vine Swing, NEVER include vines, swinging ropes, or trapeze bars in the scene under any circumstances.

INTRO SPOKEN HOOK DIVERSITY & ANTI-CLICHÉ MANDATE:
When an intro verbal hook seed (intro_verbal_hook, D01-D30) is present in the SEED MATRIX, voiceover.lines MUST author fresh, punchy, memorable spoken dialogue strictly embodying the specific angle and tone of that hook (e.g. Speed Dare, Score Bet, Mystery Teaser, Trick Question Warning, Arcade Start, Showtime Broadcaster, Pop Quiz Comedic Shock, or Safari Explorer).
STRICTLY BANNED BOILERPLATE CLICHÉS: Do NOT recycle generic, repetitive stock phrases such as 'Welcome to today's quiz challenge', 'Are you ready to test your brain?', 'Quiz time! Let's play!', or 'Welcome friends! Let's go!'.
The spoken line must sound crisp, punchy, spontaneous, and tailored for young audiences (strictly 8-11 words, approximately 2.5-3.0s of vocal delivery while the mascot is positioned beside the 3D logo). Avoid verbose winding clauses or filler adjectives. Keep speech clear, rhythmic, and perfectly synchronized with the mascot's lip movements before the handoff into Question 1.

TECHNICAL CONTRACT
- SINGLE CONTINUOUS TAKE MANDATE (ZERO CUTS): The entire ${duration}s intro MUST be filmed as one continuous, unbroken shot without match cuts, scene cuts, or multi-part splits. Author exactly ONE camera interval [0-${duration}s] describing a single fluid steadicam tracking movement that follows the mascot into center stage, glides beside the channel logo, and eases closer for the quiz handoff. Radical camera jumps, multi-shot cuts (e.g. cutting from wide to medium to close-up), and editing cuts inside the clip are STRICTLY PROHIBITED. Follow the 3 continuous beats (entrance, brand interaction, handoff) with fluid camera and character movement. The three groups in the example are illustrative, not required.
${buildCommonTechnicalRules(duration, logoMode)}

OUTPUT SHAPE
${JSON.stringify(buildIntroOutputExample(duration, clip.seeds))}`;
}
