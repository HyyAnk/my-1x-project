import type { IntroOutroScriptContent, MascotStyleIdentityProfile } from "@studio/shared";
import { ACTION_CAPABILITIES } from "./actionCapabilities.js";
import { isCreativePolicy } from "./creativePolicy.js";

// Repair redundant metadata only; never invent a capability or rewrite creative text.
export function normalizeGeneratedContent(content: IntroOutroScriptContent, identity: MascotStyleIdentityProfile): IntroOutroScriptContent {
  if (isCreativePolicy(content)) return content;
  const holdStart = content.production.target_duration_seconds - (content.production_directions?.end_hold_seconds ?? 0.75);
  const lines = content.voiceover.lines.map((line, index, all) => {
    const words = line.text.trim().split(/\s+/).filter(Boolean).length;
    const requiredEnd = Math.ceil((line.start_seconds + words / (160 / 60) + 0.3) * 1000) / 1000;
    const limit = Math.min(holdStart, all[index + 1]?.start_seconds ?? holdStart);
    // Preserve start cues, ordering, and final hold. Impossible schedules remain validation errors.
    return requiredEnd > line.end_seconds && requiredEnd <= limit ? { ...line, end_seconds: requiredEnd } : line;
  });
  const maxRestrictions = content.production_policy === "dynamic-micro-narrative-v2" ? 5 : 3;
  const normalizedRestrictions = [...new Set((content.consistency?.restrictions ?? []).map((r) => r.trim()).filter(Boolean))].slice(
    0,
    maxRestrictions,
  );

  // Do not silently discard or retime authored cues; validation requests a repair instead.
  const normalizedAudioEvents =
    content.production.clip_kind === "intro" && content.production_policy === "dynamic-micro-narrative-v2"
      ? content.audio.events
      : content.audio.events
          .slice(0, 3)
          .map((event) => (event.at_seconds >= holdStart ? { ...event, at_seconds: Math.max(0, holdStart - 0.5) } : event));

  return {
    ...content,
    timeline: content.timeline.map((beat) => ({
      ...beat,
      capability_ids: [
        ...new Set([
          ...beat.capability_ids,
          ...ACTION_CAPABILITIES.filter(
            ({ capability, pattern }) => identity.capabilities[capability] === "supported" && pattern.test(beat.action),
          ).map(({ capability }) => capability),
        ]),
      ],
    })),
    voiceover: { ...content.voiceover, lines },
    audio: {
      ...content.audio,
      events: normalizedAudioEvents,
    },
    consistency: {
      ...content.consistency,
      restrictions: normalizedRestrictions,
    },
  };
}
