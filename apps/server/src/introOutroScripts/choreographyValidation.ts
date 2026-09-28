import type { IntroOutroScriptContent, IntroOutroValidationIssue, MascotStyleIdentityProfile } from "@studio/shared";
import { allowedFinalActions, finalActionText, FINAL_HOLD_SECONDS } from "./choreographyPolicy.js";
import { soundCueLimit } from "./introPerformance.js";
import { isCreativePolicy } from "./creativePolicy.js";
import { validateCreativeChoreography } from "./creativeValidation.js";

export function validateChoreography(content: IntroOutroScriptContent, identity: MascotStyleIdentityProfile): IntroOutroValidationIssue[] {
  return isCreativePolicy(content) ? validateCreativeChoreography(content, identity) : validateLegacyChoreography(content, identity);
}

function validateLegacyChoreography(content: IntroOutroScriptContent, identity: MascotStyleIdentityProfile): IntroOutroValidationIssue[] {
  if (!content.production_policy) return [];
  const isV2 = content.production_policy === "dynamic-micro-narrative-v2";
  const issues: IntroOutroValidationIssue[] = [];
  const add = (path: string, message: string) => issues.push({ code: "CHOREOGRAPHY_INVALID", severity: "error", path, message });
  const holdStart = content.production.target_duration_seconds - FINAL_HOLD_SECONDS;
  content.timeline.forEach((beat, index) => {
    const plan = beat.choreography;
    if (!plan) {
      add(`timeline.${index}`, "One structured principal action is required per beat.");
      return;
    }
    const maxActionLength = isV2 ? 500 : 200;
    if (beat.action.length > maxActionLength)
      add(`timeline.${index}.action`, `Keep the principal action within ${maxActionLength} characters.`);
    if (index < 2) {
      if (!isV2 && /\b(?:then|followed by|after which)\b/i.test(beat.action)) {
        add(`timeline.${index}.action`, "Describe one principal action, not a sequence of gestures.");
      } else if (isV2) {
        const transitions = beat.action.match(/\b(?:then|followed by|after which)\b/gi);
        if (transitions && transitions.length > 1) {
          add(`timeline.${index}.action`, "Keep actions focused with at most one transitional gesture.");
        }
      }
    }
    if (/\b(?:walk|step|stride|wave|bow|jump|turn|point)(?:s|ing)?\b/i.test(plan.expression))
      add(`timeline.${index}.choreography.expression`, "Expression must describe emotion, not additional movement.");
    if (beat.props.length > 1) add(`timeline.${index}.props`, "Use at most one prop per beat.");
    const required = {
      wave: "waving",
      point: "pointing",
      smile: "facial_expression",
      slide: "locomotion",
      dive: "locomotion",
      bounce: "locomotion",
      chase: "locomotion",
      superhero_land: "locomotion",
    } as const;
    const capability = required[plan.primary_action as keyof typeof required];
    if (capability && (identity.capabilities[capability] !== "supported" || !beat.capability_ids.includes(capability)))
      add(`timeline.${index}.choreography`, `The selected action requires the supported ${capability} capability.`);
    if (index === 2) {
      if (!allowedFinalActions(identity).includes(plan.primary_action))
        add("timeline.2.choreography", "Choose a supported stationary closing gesture, not travel or a new reveal.");
      const expectedAction = finalActionText(plan, holdStart, content.production.clip_kind);
      const legacyAction = finalActionText(plan, holdStart, "outro");
      if (beat.action !== expectedAction && beat.action !== legacyAction)
        add("timeline.2.action", "Use the compiled single closing gesture without additional actions.");
      if (!isV2 && plan.secondary_motion !== "none") add("timeline.2.choreography", "Secondary motion must settle before the final hold.");
      if (!isV2 && plan.end_pose !== content.timeline[1].choreography?.end_pose)
        add("timeline.2.choreography.end_pose", "Establish the closing pose in beat 2; do not change pose at the end.");
    }
  });
  if (content.production_directions?.end_hold_seconds !== FINAL_HOLD_SECONDS)
    add("production_directions", "Reserve exactly one second for the final hold.");
  const allowedHoldMovements = isV2
    ? ["Static locked camera", "Slow subtle push-in", "Gentle floating camera", "Fast subtle punch-in", "Dynamic punch-in", "Hero punch-in"]
    : ["Static locked camera"];
  for (const shot of content.camera) {
    if (shot.end_seconds > holdStart && (shot.start_seconds < holdStart || !allowedHoldMovements.includes(shot.movement)))
      add(
        "camera",
        isV2 ? "Provide a stable camera interval for the final second." : "Provide a separate static camera interval for the final second.",
      );
  }
  const holdShotIndex = content.camera.findIndex((shot) => shot.start_seconds === holdStart);
  if (
    content.production.clip_kind !== "intro" &&
    holdShotIndex > 0 &&
    content.camera[holdShotIndex].framing !== content.camera[holdShotIndex - 1].framing
  )
    add("camera", "Keep the same framing when entering the final hold.");
  if (content.voiceover.lines.length > 1 || content.voiceover.lines.some((line) => line.text.trim().split(/\s+/).length > 8))
    add("voiceover", "Use at most one spoken line of eight words.");
  if (content.audio.events.length > soundCueLimit(content)) add("audio.events", `Use at most ${soundCueLimit(content)} sound cues.`);
  if (content.audio.events.some((event) => event.at_seconds >= holdStart))
    add("audio.events", "Start sound cues before the final hold to leave time for decay.");
  const bounded = [
    ["production_directions.opening_state", content.production_directions?.opening_state, isV2 ? 200 : 100] as const,
    ["production_directions.closing_state", content.production_directions?.closing_state, isV2 ? 200 : 100] as const,
    ["audio.music_direction", content.audio.music_direction, isV2 ? 240 : 120] as const,
    ...content.audio.events.map((event) => ["audio.events", event.direction, isV2 ? 160 : 80] as const),
    ...content.consistency.restrictions.map((value) => ["consistency.restrictions", value, isV2 ? 200 : 100] as const),
  ];
  for (const [path, value, limit] of bounded)
    if (typeof value === "string" && value.length > limit) add(path, `Keep this direction within ${limit} characters.`);
  const maxRestrictions = isV2 ? 5 : 3;
  if (content.consistency.restrictions.length > maxRestrictions)
    add("consistency.restrictions", `Use at most ${maxRestrictions} non-redundant extra restrictions.`);
  if (/\b(?:walk|step|stride|wave|bow|jump|turn)(?:s|ing)?\b/i.test(content.production_directions?.closing_state ?? ""))
    add("production_directions.closing_state", "Describe a settled state, not a new closing action.");
  return issues;
}
