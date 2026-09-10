import { ShortReelRecordSchema } from "./shortReel.schema.js";
import type { ShortReelRecord } from "./shortReel.types.js";
import { LegacyShortReelRecordSchema, type LegacyShortReelRecord } from "./shortReel.legacy.js";
import type { ReelPublishingPayload } from "./shortReelPublishing.schema.js";

export function normalizeLegacyPublishing(legacy: {
  hook: string;
  description: string;
  cta?: string | null;
  hashtags?: string[];
}): ReelPublishingPayload {
  const title = legacy.hook.trim();
  let desc = legacy.description.trim();

  if (legacy.cta) {
    const ctaTrimmed = legacy.cta.trim();
    if (ctaTrimmed && !desc.includes(ctaTrimmed)) {
      desc = desc ? `${desc}\n\n${ctaTrimmed}` : ctaTrimmed;
    }
  }

  if (legacy.hashtags && legacy.hashtags.length > 0) {
    const seen = new Set<string>();
    const uniqueTags: string[] = [];
    for (const tag of legacy.hashtags) {
      const trimmed = tag.trim();
      if (!trimmed) continue;
      const lower = trimmed.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        uniqueTags.push(trimmed);
      }
    }

    const descLower = desc.toLowerCase();
    const tagsToAdd = uniqueTags.filter((tag) => !descLower.includes(tag.toLowerCase()));

    if (tagsToAdd.length > 0) {
      const tagsJoined = tagsToAdd.join(" ");
      desc = desc ? `${desc}\n\n${tagsJoined}` : tagsJoined;
    }
  }

  return { title, description: desc };
}

export function parseCompatibleShortReelRecord(input: unknown): ShortReelRecord {
  if (!input || typeof input !== "object") {
    return ShortReelRecordSchema.parse(input);
  }

  const raw = input as Record<string, unknown>;
  if (raw.schema_version === 2) {
    return ShortReelRecordSchema.parse(input);
  }

  if (raw.schema_version === 1) {
    const legacy: LegacyShortReelRecord = LegacyShortReelRecordSchema.parse(input);
    const v2Candidate = {
      schema_version: 2 as const,
      reel_id: legacy.reel_id,
      channel_id: legacy.channel_id,
      topic_id: legacy.topic_id,
      topic: legacy.topic,
      aspect_ratio: legacy.aspect_ratio,
      source: legacy.source,
      revision: legacy.revision,
      model_note: legacy.model_note,
      created_at: legacy.created_at,
      updated_at: legacy.updated_at,
      script: legacy.script,
      stale_segments: legacy.stale_segments,
      visual_context: null,
      units: {
        references: {
          state: legacy.units.references.state === "ready" ? ("stale" as const) : legacy.units.references.state,
          last_accepted_payload: legacy.units.references.last_accepted_payload,
          current_attempt: legacy.units.references.current_attempt,
          accepted_dependency_fingerprint: null,
        },
        script: {
          state: legacy.units.script.state,
          last_accepted_payload: legacy.units.script.last_accepted_payload,
          current_attempt: legacy.units.script.current_attempt,
          accepted_dependency_fingerprint: null,
        },
        cover: {
          state: legacy.units.cover.state === "ready" ? ("stale" as const) : legacy.units.cover.state,
          last_accepted_payload: legacy.units.cover.last_accepted_payload,
          current_attempt: legacy.units.cover.current_attempt,
          accepted_dependency_fingerprint: null,
        },
        publishing: {
          state: legacy.units.publishing.state === "ready" ? ("stale" as const) : legacy.units.publishing.state,
          last_accepted_payload: legacy.units.publishing.last_accepted_payload
            ? normalizeLegacyPublishing(legacy.units.publishing.last_accepted_payload)
            : null,
          current_attempt: legacy.units.publishing.current_attempt,
          accepted_dependency_fingerprint: null,
        },
      },
      last_mutation: legacy.last_mutation,
      mutation_history: legacy.mutation_history,
    };
    return ShortReelRecordSchema.parse(v2Candidate);
  }

  return ShortReelRecordSchema.parse(input);
}
