import type { IntroOutroScriptContent, IntroOutroValidationIssue, MascotStyleIdentityProfile } from "@studio/shared";

const ACTION_CAPABILITIES = [
  {
    capability: "locomotion",
    pattern: /\b(?:walks?|steps?|bounces?|jogs?|runs?|moves?|travels?|departs?|exits?|enters?|weight shift)\b/i,
  },
  { capability: "waving", pattern: /\bwav(?:e|es|ing)\b/i },
  { capability: "pointing", pattern: /\b(?:points?|pointing|presents?|presenting|gestures? (?:toward|to))\b/i },
] as const;

export function validateProductionTiming(
  content: IntroOutroScriptContent,
  identity: MascotStyleIdentityProfile,
): IntroOutroValidationIssue[] {
  const issues: IntroOutroValidationIssue[] = [];
  const duration = content.production.target_duration_seconds;
  const add = (code: string, path: string, message: string) => issues.push({ code, path, message, severity: "error" });
  const roles =
    content.production.clip_kind === "intro" ? ["entrance", "brand_interaction", "handoff"] : ["recognition", "invitation", "farewell"];
  content.timeline.forEach((beat, index) => {
    if (beat.beat !== index + 1 || beat.role !== roles[index])
      add("BEAT_ORDER_INVALID", `timeline.${index}`, "Keep beats in narrative order with the correct roles.");
    if (index > 0 && beat.start_seconds < content.timeline[index - 1].end_seconds)
      add("BEAT_ORDER_INVALID", `timeline.${index}`, "Beats cannot overlap or be reordered.");
    for (const requirement of ACTION_CAPABILITIES) {
      if (requirement.pattern.test(beat.action) && !beat.capability_ids.includes(requirement.capability)) {
        add(
          "ACTION_CAPABILITY_MISSING",
          `timeline.${index}.capability_ids`,
          `The described action requires the ${requirement.capability} capability. Add it or simplify the action.`,
        );
      }
    }
  });
  let cameraEnd = 0;
  content.camera.forEach((shot, index) => {
    if (Math.abs(shot.start_seconds - cameraEnd) > 0.011 || shot.end_seconds <= shot.start_seconds || shot.end_seconds > duration) {
      add("CAMERA_TIMING_INVALID", `camera.${index}`, "Camera intervals must be positive, ordered, contiguous and within the clip.");
    }
    cameraEnd = shot.end_seconds;
  });
  if (Math.abs(cameraEnd - duration) > 0.011) add("CAMERA_COVERAGE", "camera", "Camera must cover the entire clip.");
  content.audio.events.forEach((event, index) => {
    if (event.at_seconds >= duration)
      add("AUDIO_OUT_OF_RANGE", `audio.events.${index}`, "Start sounds before the clip ends and leave time for decay.");
  });
  if (!content.voiceover.enabled && content.voiceover.lines.length)
    add("DISABLED_VOICE_LINES", "voiceover", "Remove lines when voiceover is disabled.");
  if (content.voiceover.enabled && !content.voiceover.lines.length)
    add("VOICE_LINE_MISSING", "voiceover", "Enabled voiceover requires a spoken line.");
  const directions = content.production_directions;
  if (!directions) {
    add(
      "PRODUCTION_DIRECTIONS_MISSING",
      "production_directions",
      "Set the reference mode, voice source, logo handling, opening and closing states, and final hold.",
    );
    return issues;
  }
  const holdStart = duration - directions.end_hold_seconds;
  if (holdStart < content.timeline[2].start_seconds)
    add("END_HOLD_INVALID", "production_directions", "The final hold must fit inside the final beat.");
  if (content.voiceover.enabled !== (directions.voice_source !== "none"))
    add("VOICE_SOURCE_MISMATCH", "production_directions.voice_source", "Voice source must match the voiceover enabled state.");
  if (directions.voice_source === "mascot" && identity.capabilities.speech !== "supported")
    add("SPEECH_UNCONFIRMED", "production_directions.voice_source", "Use a narrator unless mascot speech is explicitly supported.");
  let voiceEnd = 0;
  content.voiceover.lines.forEach((line, index) => {
    const words = line.text.trim().split(/\s+/).filter(Boolean).length;
    if (line.start_seconds < voiceEnd || line.end_seconds > holdStart)
      add("VOICE_OVERLAP_OR_HOLD", `voiceover.lines.${index}`, "Speech cannot overlap another line or the final hold.");
    if (words / (160 / 60) + 0.3 > line.end_seconds - line.start_seconds + 0.011)
      add(
        "VOICE_BUDGET_EXCEEDED",
        `voiceover.lines.${index}`,
        "Shorten narration to at most 160 words/minute plus 0.3 seconds pause allowance.",
      );
    voiceEnd = line.end_seconds;
  });
  return issues;
}
