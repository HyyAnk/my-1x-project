import type { IntroOutroScriptContent, IntroOutroValidationIssue, MascotStyleIdentityProfile } from "@studio/shared";
import { allowedFinalActions, finalActionText, FINAL_HOLD_SECONDS } from "./choreographyPolicy.js";

export function validateChoreography(content: IntroOutroScriptContent, identity: MascotStyleIdentityProfile): IntroOutroValidationIssue[] {
  if (!content.production_policy) return [];
  const issues: IntroOutroValidationIssue[] = [];
  const add = (path: string, message: string) => issues.push({ code: "CHOREOGRAPHY_INVALID", severity: "error", path, message });
  const holdStart = content.production.target_duration_seconds - FINAL_HOLD_SECONDS;
  content.timeline.forEach((beat, index) => {
    const plan = beat.choreography;
    if (!plan) {
      add(`timeline.${index}`, "One structured principal action is required per beat.");
      return;
    }
    if (beat.action.length > 200) add(`timeline.${index}.action`, "Keep the principal action within 200 characters.");
    if (index < 2 && /\b(?:then|followed by|after which)\b/i.test(beat.action))
      add(`timeline.${index}.action`, "Describe one principal action, not a sequence of gestures.");
    if (/\b(?:walk|step|stride|wave|bow|jump|turn|point)(?:s|ing)?\b/i.test(plan.expression))
      add(`timeline.${index}.choreography.expression`, "Expression must describe emotion, not additional movement.");
    if (beat.props.length > 1) add(`timeline.${index}.props`, "Use at most one prop per beat.");
    const required = { wave: "waving", point: "pointing", smile: "facial_expression" } as const;
    const capability = required[plan.primary_action as keyof typeof required];
    if (capability && (identity.capabilities[capability] !== "supported" || !beat.capability_ids.includes(capability)))
      add(`timeline.${index}.choreography`, `The selected action requires the supported ${capability} capability.`);
    if (index === 2) {
      if (!allowedFinalActions(identity).includes(plan.primary_action))
        add("timeline.2.choreography", "Choose a supported stationary closing gesture, not travel or a new reveal.");
      if (beat.action !== finalActionText(plan, holdStart))
        add("timeline.2.action", "Use the compiled single closing gesture without additional actions.");
      if (plan.secondary_motion !== "none") add("timeline.2.choreography", "Secondary motion must settle before the final hold.");
      if (plan.end_pose !== content.timeline[1].choreography?.end_pose)
        add("timeline.2.choreography.end_pose", "Establish the closing pose in beat 2; do not change pose at the end.");
    }
  });
  if (content.production_directions?.end_hold_seconds !== FINAL_HOLD_SECONDS)
    add("production_directions", "Reserve exactly one second for the final hold.");
  for (const shot of content.camera) {
    if (shot.end_seconds > holdStart && (shot.start_seconds < holdStart || shot.movement !== "Static locked camera"))
      add("camera", "Provide a separate static camera interval for the final second.");
  }
  const holdShotIndex = content.camera.findIndex((shot) => shot.start_seconds === holdStart);
  if (holdShotIndex > 0 && content.camera[holdShotIndex].framing !== content.camera[holdShotIndex - 1].framing)
    add("camera", "Keep the same framing when entering the final hold.");
  if (content.voiceover.lines.length > 1 || content.voiceover.lines.some((line) => line.text.trim().split(/\s+/).length > 8))
    add("voiceover", "Use at most one spoken line of eight words.");
  if (content.audio.events.length > 3) add("audio.events", "Use at most three sound cues.");
  if (content.audio.events.some((event) => event.at_seconds >= holdStart))
    add("audio.events", "Start sound cues before the final hold to leave time for decay.");
  const bounded = [
    ["production_directions.opening_state", content.production_directions?.opening_state, 100] as const,
    ["production_directions.closing_state", content.production_directions?.closing_state, 100] as const,
    ["audio.music_direction", content.audio.music_direction, 120] as const,
    ...content.audio.events.map((event) => ["audio.events", event.direction, 80] as const),
    ...content.consistency.restrictions.map((value) => ["consistency.restrictions", value, 100] as const),
  ];
  for (const [path, value, limit] of bounded)
    if (typeof value === "string" && value.length > limit) add(path, `Keep this direction within ${limit} characters.`);
  if (content.consistency.restrictions.length > 3) add("consistency.restrictions", "Use at most three non-redundant extra restrictions.");
  if (/\b(?:walk|step|stride|wave|bow|jump|turn)(?:s|ing)?\b/i.test(content.production_directions?.closing_state ?? ""))
    add("production_directions.closing_state", "Describe a settled state, not a new closing action.");
  return issues;
}
