import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  TopicAvailabilityBatchSchema,
  TopicCandidateSchema,
  TopicRunResultSchema,
  TopicSourceBindingSetSchema,
  TopicSourceBindingSchema,
  canonicalJsonStringify,
  sourceSha256Hex,
} from "@studio/shared";
import { sha256Hex as legacyShortReelSha256Hex } from "../src/shortReel/shortReelSource.schema.js";

const validBinding = {
  source_question_id: "q-1",
  source_hash_version: 1,
  source_content_hash: "a".repeat(64),
  projection_provenance: {
    source_variant: "native" as const,
    resolved_language: "en",
    translation_key: null,
    translation_provenance: "native" as const,
  },
};

void describe("topic source contracts", () => {
  void it("accepts a server-owned binding with projection provenance", () => {
    assert.deepEqual(TopicSourceBindingSchema.parse(validBinding), validBinding);
  });

  void it("rejects malformed hashes and duplicate source ids", () => {
    assert.throws(() => TopicSourceBindingSchema.parse({ ...validBinding, source_content_hash: "bad" }));
    assert.throws(() => TopicSourceBindingSetSchema.parse([validBinding, validBinding]), /duplicate/i);
    assert.throws(
      () =>
        TopicSourceBindingSchema.parse({
          ...validBinding,
          projection_provenance: {
            source_variant: "translation",
            resolved_language: "en",
            translation_key: "en",
            translation_provenance: "verified_translation",
          },
        }),
      /native English sources/i,
    );
  });

  void it("keeps legacy topic candidates readable without bindings", () => {
    const legacy = {
      topic_id: "topic-1",
      channel_id: "channel-1",
      title: "A topic",
      premise: "A premise",
      why_it_fits: "It fits",
      hook: "A hook",
      estimated_potential: "high",
      generated_at: "2026-09-08T00:00:00.000Z",
      content_kind: "short_reel",
      archetype: "deep_trivia",
    };
    assert.equal(Object.prototype.hasOwnProperty.call(TopicCandidateSchema.parse(legacy), "source_bindings"), false);
  });

  void it("describes a stable partial run and batch availability diagnostics", () => {
    const candidate = {
      topic_id: "topic-1",
      channel_id: "channel-1",
      title: "A topic",
      premise: "A premise",
      why_it_fits: "It fits",
      hook: "A hook",
      estimated_potential: "high",
      generated_at: "2026-09-08T00:00:00.000Z",
      content_kind: "short_reel" as const,
      archetype: "deep_trivia" as const,
      slot_id: "short-reel-1",
      source_bindings: [validBinding],
    };
    assert.doesNotThrow(() =>
      TopicRunResultSchema.parse({
        run_id: "run-1",
        target_episode_count: 3,
        target_short_reel_count: 2,
        candidates: [candidate],
        shortages: [
          {
            content_kind: "episode",
            slot_id: "episode-2",
            requested_count: 8,
            available_count: 0,
            reason_code: "NO_ELIGIBLE_SOURCES",
            exclusion_counts: {},
          },
        ],
      }),
    );
    assert.equal(
      TopicAvailabilityBatchSchema.parse({
        scan_status: "complete_empty",
        checked_at: "2026-09-08T00:00:00.000Z",
        snapshot_token: "token-1",
        topics: [],
      }).scan_status,
      "complete_empty",
    );
  });

  void it("hashes canonical object key order identically", () => {
    assert.equal(canonicalJsonStringify({ b: 2, a: 1 }), canonicalJsonStringify({ a: 1, b: 2 }));
    assert.equal(sourceSha256Hex(canonicalJsonStringify({ b: 2, a: 1 })), sourceSha256Hex(canonicalJsonStringify({ a: 1, b: 2 })));
    assert.equal(sourceSha256Hex("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    assert.equal(sourceSha256Hex(""), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    assert.equal(sourceSha256Hex("Quiz ✓"), "731228dc3ecaff7544e2580a10bd4eee02d385082fb9328d7dd504c329a401ec");
    assert.equal(legacyShortReelSha256Hex("abc"), "4336fab4257194ecf7d6a1f7e1bee8ac5cd67234ec13bb0bba8942377b64a6c4");
  });

  void it("rejects source binding counts that cannot satisfy an episode candidate", () => {
    const episodeCandidate = {
      topic_id: "topic-episode",
      channel_id: "channel-1",
      title: "An episode",
      premise: "A premise",
      why_it_fits: "It fits",
      hook: "A hook",
      estimated_potential: "high",
      generated_at: "2026-09-08T00:00:00.000Z",
      content_kind: "episode" as const,
      question_count: 8,
      source_bindings: [validBinding],
      slot_id: "episode-1",
    };
    assert.throws(() => TopicRunResultSchema.parse({ run_id: "run-1", candidates: [episodeCandidate] }), /exactly 8 source binding/);
  });
});
