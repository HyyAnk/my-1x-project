import type { IntroOutroScriptContent, MascotStyleIdentityProfile } from "@studio/shared";
import { ACTION_CAPABILITIES } from "./actionCapabilities.js";

// Repair redundant metadata only; never invent a capability or rewrite creative text.
export function normalizeGeneratedContent(content: IntroOutroScriptContent, identity: MascotStyleIdentityProfile): IntroOutroScriptContent {
  const holdStart = content.production.target_duration_seconds - (content.production_directions?.end_hold_seconds ?? 0.75);
  const lines = content.voiceover.lines.map((line, index, all) => {
    const words = line.text.trim().split(/\s+/).filter(Boolean).length;
    const requiredEnd = Math.ceil((line.start_seconds + words / (160 / 60) + 0.3) * 1000) / 1000;
    const limit = Math.min(holdStart, all[index + 1]?.start_seconds ?? holdStart);
    // Preserve start cues, ordering, and final hold. Impossible schedules remain validation errors.
    return requiredEnd > line.end_seconds && requiredEnd <= limit ? { ...line, end_seconds: requiredEnd } : line;
  });
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
  };
}
