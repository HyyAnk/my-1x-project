import type { IntroOutroTransitionStyle } from "@studio/shared";
import { OUTRO_DIALOGUE_BY_SEED } from "../dialogue/index.js";
import { scriptBeatStructure } from "../generationStructure.js";
import { buildTwoPartGuidance } from "../transitions/transitionArchetypes.js";
import {
  COMMON_OUTPUT_EXAMPLE_STYLE,
  buildCommonTechnicalRules,
  buildContextAndAnchorSection,
  buildSceneEnvironmentAndAudioSection,
  resolvePromptClipAndContext,
} from "./promptCommons.js";
import type { CreativePromptInput } from "./promptTypes.js";

export function buildOutroOutputExample(
  duration: number,
  transitionStyle?: IntroOutroTransitionStyle,
  seeds: readonly { id: string }[] = [],
) {
  const isTwoPartOutro = duration >= 12;
  const outroSeedId = seeds.find((s) => s.id in OUTRO_DIALOGUE_BY_SEED)?.id;
  const outroEntry = outroSeedId ? OUTRO_DIALOGUE_BY_SEED[outroSeedId] : undefined;
  const outroLine1 = outroEntry?.text ?? "Hit subscribe for more daily brain challenges!";
  const outroDelivery1 = outroEntry?.delivery ?? "Upbeat and welcoming with bright energy";
  const outroLine2 = outroEntry?.secondaryText ?? "See ya next time! Bye-bye!";
  const outroDelivery2 = outroEntry?.secondaryDelivery ?? "Warm and affectionate sign-off with friendly wave";

  return {
    shared: {
      style: COMMON_OUTPUT_EXAMPLE_STYLE,
      music_direction: "...",
      logo_placement: "...",
    },
    clips: {
      outro: {
        production_directions: {
          reference_mode: "character_reference",
          voice_source: "mascot",
          opening_state:
            "Mascot is already in dynamic kinetic motion at 0.0s adopting the designated entrance seed with pre-existing velocity...",
          closing_state:
            "Mascot holds a warm, living smile while waving affectionately directly toward the camera lens through the final second...",
          end_hold_seconds: 0,
          ...(isTwoPartOutro ? { transition_style: transitionStyle ?? "auto" } : {}),
        },
        timeline: scriptBeatStructure("outro", duration).map((beat) => ({
          ...beat,
          action: "Detailed 2-3 sentence cinematic action prose (kinematics, trajectory, expression, props, visual FX)...",
          capability_ids: [],
          props: [],
          visible_feature_ids: [],
        })),
        voiceover: {
          enabled: true,
          lines: isTwoPartOutro
            ? [
                {
                  start_seconds: Number((duration * 0.15).toFixed(1)),
                  end_seconds: Number((duration * 0.42).toFixed(1)),
                  text: "If you had fun solving today's quiz...",
                  delivery: "Energetic and enthusiastic on the run",
                },
                {
                  start_seconds: Number((duration * 0.54).toFixed(1)),
                  end_seconds: Number((duration - 2.5).toFixed(1)),
                  text: "...hit subscribe for more daily brain challenges! See ya next time!",
                  delivery: "Warm, proud and welcoming with affectionate sign-off",
                },
              ]
            : [
                {
                  start_seconds: Number((duration * 0.35).toFixed(1)),
                  end_seconds: Number((duration * 0.65).toFixed(1)),
                  text: outroLine1,
                  delivery: outroDelivery1,
                },
                {
                  start_seconds: Number((duration * 0.72).toFixed(1)),
                  end_seconds: Number((duration * 0.92).toFixed(1)),
                  text: outroLine2,
                  delivery: outroDelivery2,
                },
              ],
        },
        audio: {
          music_direction: "Describe this clip's musical entrance, development and ending",
          events: [{ at_seconds: 0, direction: "Describe a sound synchronized to the authored opening action" }],
        },
        camera: isTwoPartOutro
          ? [{ start_seconds: 0, end_seconds: duration, framing: "...", movement: "..." }]
          : [
              {
                start_seconds: 0,
                end_seconds: duration,
                framing: "Single continuous shot, zero cuts (Wide-to-Medium Steadicam Glide)",
                movement:
                  "One unbroken continuous take: Camera smoothly tracks alongside the mascot's kinetic entrance, then fluidly glides alongside the logo and pushes gently closer for the final wave without any cuts.",
              },
            ],
        consistency: { allowed_visible_text: [], restrictions: [] },
      },
    },
  };
}

export function buildOutroGenerationPrompt(input: CreativePromptInput): string {
  const { clip, duration, logoMode, anchor } = resolvePromptClipAndContext(input, "outro");
  const channelName = input.context.channel.display_name;
  const isTwoPartOutro = duration >= 12;
  const twoPart = buildTwoPartGuidance(clip.transitionStyle, duration);

  const creativeBrief = isTwoPartOutro
    ? twoPart.creativeBrief
    : `Create a warm, playful farewell and visually captivating ${duration}s single continuous take (one shot) Outro for channel ${channelName}.
NO TRANSITION CUTS OR SCENE BREAKS (ABSOLUTE ZERO CUTS): The entire ${duration}s is one seamless, unbroken performance captured by a continuous camera in the shared scene without any cuts, angle switches, or camera jumps.
ZERO STATIC OPENINGS (IN-MEDIA-RES MOTION): Frame 0.0s must NEVER show the mascot standing still, posing passively, or waiting to start moving. The mascot must appear ALREADY in full kinetic locomotion (e.g. riding a creature mount, pedaling a kart, piloting a plane, carving on a board, driving a roadster, or an athletic sprint), bringing the selected entrance seed vibrantly to life.
PERSISTENT VEHICLE / MOUNT CONTINUITY (ZERO DISAPPEARING VEHICLES): When an entrance seed specifies a vehicle, creature mount, or transport equipment (such as dinosaur mount, bicycle, airplane, surfboard, magic broom, kart, roller skates), the mascot MUST remain with or upon the transport mode throughout the entire ${duration} seconds. The mascot smoothly glides or decelerates to a stop BESIDE THE LOGO while STILL riding, sitting on, or posed beside the vehicle/mount (e.g. the friendly dinosaur playfully settles beside the logo, or the mascot poses on the bike/kart). NEVER perform an 'aerial dismount' or cause the vehicle/mount to vanish midway through the shot, as radical subject disappearances trigger AI video models to cut scenes.
The ${duration}s performance flows through 3 natural continuous phases:
1) Kinematic Entrance (0.0s - ~${(duration * 0.31).toFixed(1)}s): Dynamic tracking shot following the mascot zooming into frame with high velocity and kinetic flair.
2) Channel Subscription & Brand Core (~${(duration * 0.31).toFixed(1)}s - ~${(duration * 0.69).toFixed(1)}s): Mascot smoothly decelerates / arcs toward center stage, proudly interacts with the channel logo while positioned with their mount/vehicle, and delivers the dynamic spoken call-to-action or engagement hook aligned with the selected invitation seed. Make subscribing the only call to action. Use the full frame for the performance. Do not reserve space, move the mascot aside, point toward recommended videos, create video-card placeholders or lock the camera for end-screen overlays.
3) Friendly Farewell Sign-off (~${(duration * 0.69).toFixed(1)}s - ${duration}s): Mascot looks directly into the camera lens with a warm, affectionate smile, delivering a memorable closing sign-off line (aligned with the selected seed's farewell) while performing a friendly farewell hand wave or cute bounce alongside their mount, holding a living smile through ${duration}s.
End on a comfortable, living hold as the mascot smiles and waves to the audience.`;

  return `Write only the requested OUTRO script for channel ${channelName}. Return JSON only, no markdown wrapping, no commentary.

CREATIVE BRIEF
${creativeBrief}

${buildSceneEnvironmentAndAudioSection(duration, isTwoPartOutro)}

${buildContextAndAnchorSection(input, "outro", clip, anchor)}
If seeds or a previous script suggest video recommendations or reserved end-screen space, replace that suggestion with a natural channel-subscription invitation. Retain the visual identity, not the old reserved-space layout. Ensure the closing beat features an affectionate goodbye sign-off (e.g. waving to the camera with a cheerful 'See ya!' or 'Bye!').
OUTRO DIALOGUE DIVERSITY MANDATE: Do NOT recycle generic stock phrases like 'Hit subscribe for more daily brain challenges' or 'See ya next time! Bye-bye!' across all generations. Always adopt and incorporate the specific wording, tone, and thematic hook from the selected invitation seed in the SEED MATRIX (e.g. Brain Club, Mystery Teaser, Comment Your Score, Mascot Humor, or Curious Explorer). Ensure speech sounds spontaneous, characterful, and engaging for kids.
CELEBRATION TONE & ENTRANCE HARMONY MANDATE:
When an entrance seed (outro_entrance, J01-J30) is selected, the mascot MUST physically ride, pilot, or sprint with that specific transport mode throughout the outro without disappearing vehicles.
When a celebration recognition seed (outro_recognition, E01-E15) is selected, weave its distinct emotional attitude, celebratory gesture (e.g. proud fist pump, trophy reveal, standing ovation, air high-five), and festive accents (e.g. golden star particles, confetti shower) harmoniously into the mascot's performance alongside their mount or vehicle.
STRICT ANTI-BIAS MANDATE: Author ONLY the specific locomotion or transport mode authored in the selected entrance seed. If the selected seed is NOT Canopy Vine Swing or Trapeze, NEVER include vines, swinging ropes, or trapeze bars in the scene under any circumstances.

TECHNICAL CONTRACT
- ${
    isTwoPartOutro
      ? "Follow the structured 6 kinematic beats across Part 1 and Part 2 as shown in the output example, customizing the action descriptions, camera dynamics, props, and sound events to bring the premise vibrantly to life."
      : "SINGLE CONTINUOUS TAKE MANDATE (ZERO CUTS): The entire " +
        duration +
        "s outro MUST be filmed as one continuous, unbroken shot without match cuts, scene cuts, or multi-part splits. Author exactly ONE camera interval [0-" +
        duration +
        "s] describing a single fluid steadicam tracking movement that stays locked on the mascot throughout. Radical camera jumps, multi-shot cuts (e.g. cutting from wide to medium to close-up), and editing cuts are STRICTLY PROHIBITED. Follow the 3 continuous beats (entrance, subscription callout, friendly farewell) with fluid camera and character movement."
  }
${buildCommonTechnicalRules(duration, logoMode)}
${isTwoPartOutro ? twoPart.technicalContract : ""}

OUTPUT SHAPE
${JSON.stringify(buildOutroOutputExample(duration, clip.transitionStyle, clip.seeds))}`;
}
