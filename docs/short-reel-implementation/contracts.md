# Contract Ledger

Version: 1.0 proposed implementation baseline. Phase 02 freezes implemented names and module paths here with a decision entry. Later agents must consume that frozen version. Any change requires producer/consumer tests and coordinated ownership, not local casts.

## Naming And Source

Persisted fields use snake_case to match existing schemas. TypeScript function names use camelCase. Reuse `BankQuestionSchema` and `BankQuestion`; do not copy the bank schema. New public types are inferred from Zod and exported from `@studio/shared`.

The existing bank record has `id`, `archetype_id`, `question`, `choices`, `correct_choice_id`, `explanation`, `status`, optional `language` and `translations`. Deep Trivia requires three choices, Versus Face-off two. Validate unique choice IDs and that the correct choice resolves exactly once; do not weaken bank-wide contracts to make a fixture pass.

## Content Discrimination

`TopicCandidateSchema` becomes a discriminated union on `content_kind`:

- `episode`: landscape quiz layout and existing question-count rules.
- `short_reel`: `question_count: 1`, `aspect_ratio: "9:16"`, supported archetype, no quiz layout, no Episode render options.
- Both retain topic/channel IDs, title/premise/hook and provenance `origin: "keyword" | "discovery"`. The server assigns provenance from a slot plan; do not trust an LLM's label alone.

Fixed mixed slot plan: 1 Episode keyword (or discovery without hint), 2-3 Episode discovery, 4 Short-Reel keyword (or discovery without hint), 5 Short-Reel discovery. One keyword candidate per pillar does not mean blindly counting exact-string appearances; test slot assignment and review semantic integration.

Confirm response is a union: `{ content_kind: "episode", episode, task }` using existing Episode/task values, or `{ content_kind: "short_reel", short_reel }`. No return-value shape is selected by title text or aspect alone. Existing portrait records are not converted into reels.

## Structured Script

```ts
type ReelArchetype = "versus_faceoff" | "deep_trivia";
type SegmentIndex = 1 | 2 | 3;
type TextCue = {
  role: "question" | "answer" | "supporting";
  text: string;
  start_seconds: number;
  end_seconds: number;
};
type ContinuityState = {
  character_identity: string;
  position: string;
  action: string;
  camera: string;
  environment: string;
  props: string[];
  visible_text: string[];
  revealed_facts: string[];
};
type ReelSegment = {
  index: SegmentIndex;
  mode: "generate" | "extend";
  duration_seconds: number;
  narrative: string;
  text_cues: TextCue[];
  audio_direction: string;
  start_state: ContinuityState;
  end_state: ContinuityState;
};
type ReelScript = { segments: [ReelSegment, ReelSegment, ReelSegment] };
```

All objects reject unknown mutation fields. Segment index/mode must equal 1/generate, 2/extend, 3/extend. Durations are finite numbers in [8,10]. Each cue satisfies `0 <= start < end <= segment duration`. Script total is derived and in [24,30]. Cumulative times are derived, not persisted editable data.

Question cue equals the selected English question text; answer cue equals the text of `correct_choice_id` in the same English choice set. At least one question cue appears before the first answer cue. Default compiler places the answer in segment 3; a deliberate different reveal requires a reviewed decision. Multiple cues may overlap deliberately; reject mutually conflicting question/answer presentation before the chosen reveal.

Start state of segment N+1 must equal the preceding end state for identity/environment/props/visible text and explicitly continue position/action/camera. Exact boundary state can be copied by the generator and validated structurally. Narrative meaning still needs review; do not advertise semantic proof from string equality.

## Record And Deliverables

- `ShortReelRecord`: `schema_version: 1`, `reel_id`, `channel_id`, `topic_id`, topic snapshot, `aspect_ratio: "9:16"`, immutable source snapshot, `revision`, `model_note`, `created_at`, `updated_at`, optional validated script and per-unit outputs.
- Source snapshot: original validated bank record plus selected English text/choices/explanation, source language/translation provenance, original `updated_at` if present and a stable content hash. Derive selected answer from the choice ID. Do not call draft selection a rendered Episode.
- A newly selected draft has no script, not three empty pretend-valid segments. `ReelScriptSchema` only applies when a script exists.
- Four output groups are references, script/prompts, cover, publishing. Internal script segment statuses allow downstream invalidation without adding deliverable groups.
- Unit state: `missing | pending | ready | stale | failed | cancelled`; include last accepted payload separately from current attempt so a failure does not erase usable prior work.
- Attempt metadata: operation ID, dependency fingerprint, timestamps and structured error. Ready requires a payload matching current dependencies; export rejects stale or pending mandatory units.
- References: immutable asset IDs/validated internal paths, checksum, MIME, dimensions and role (`mascot` or `style`). External URLs are not arbitrary filesystem paths.
- Publishing: hook, description, optional CTA, hashtags as a string array. Do not label generated guesses as current trends.

## Domain And Repository Interfaces

These signatures define semantic contracts; Phase 02 may adapt plumbing to the current repository facade with an explicit mapping in this ledger.

```ts
interface ReelKey {
  channel_id: string;
  reel_id: string;
}
interface MutationContext {
  expected_revision: number;
  request_id: string;
}
type GenerationTarget = "script" | "segment_1" | "segment_2" | "segment_3" | "references" | "cover" | "publishing" | "package";
```

| Function                  | Inputs                                                     | Output And Invariant                                                  |
| ------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------- |
| `createShortReel`         | channel/topic, validated source snapshot, request ID       | Persisted record; same channel/topic returns same record              |
| `getShortReel`            | ReelKey                                                    | Record or typed not-found; verify channel containment                 |
| `listShortReels`          | channel ID                                                 | Records in deterministic updated-time order                           |
| `updateShortReel`         | ReelKey, MutationContext, validated edit command           | New revision or conflict; never mutate source through arbitrary patch |
| `selectShortReelQuestion` | topic, eligible-bank reader                                | One snapshot or `BANK_EMPTY`; stable ID tie-break                     |
| `generateReelScript`      | frozen source/topic/style context, LLM client, AbortSignal | Validated ReelScript or structured generation error                   |
| `compileFlowPrompts`      | ReelScript, reference labels, model note                   | `[string, string, string]`; deterministic and no I/O                  |
| `affectedReelUnits`       | validated edit kind and segment index if applicable        | Explicit affected units from invalidation table                       |
| `acceptReelUnitResult`    | ReelKey, operation ID, dependency fingerprint, payload     | Atomic accepted/discarded result against latest record                |
| `exportShortReelPackage`  | ReelKey, expected revision                                 | Validated archive bytes for one consistent snapshot                   |

Use injected interfaces at external boundaries, not a new generic dependency framework. `request_id` permits replay of an identical mutation; reuse with different payload returns conflict. A retry following a known failed attempt uses a new request ID.

## HTTP Surface

Base path: `/api/channels/:channelId/short-reels`. Validate params and body; never trust client asset paths or client content kind over stored topic.

| Method / Suffix                  | Request                                               | Response                                           |
| -------------------------------- | ----------------------------------------------------- | -------------------------------------------------- |
| GET base                         | none                                                  | `{ short_reels }`                                  |
| GET `/:reelId`                   | none                                                  | `{ short_reel }`                                   |
| PATCH `/:reelId`                 | expected_revision, request_id, validated edit command | `{ short_reel }`                                   |
| POST `/:reelId/generate`         | expected_revision, request_id, target                 | 202 `{ task, short_reel }`                         |
| POST `/:reelId/cancel`           | operation_id, request_id                              | acknowledged cancellation with current record/task |
| GET `/:reelId/export?revision=N` | required numeric revision                             | ZIP with attachment headers, or conflict/not-ready |

Creation is through existing topic confirmation after stored-topic discrimination. Do not create two separate creation paths with different idempotency behavior.

Errors: stable `code`, safe English `message`, optional field errors and retryable flag. Map invalid input to 400, missing channel/reel/topic to 404, stale revision/reused request/active conflicting operation to 409, no eligible question or invalid source to 422, unavailable upstream to 503, timeout to 504. Match existing transport wrapper where possible; expose no raw provider stack, secrets or absolute internal paths.

## Invalidation Table

| Change                                           | Invalidate                                     | Preserve                                                          |
| ------------------------------------------------ | ---------------------------------------------- | ----------------------------------------------------------------- |
| Replace source question through explicit command | all creative units and review acknowledgements | original bank and unrelated reels                                 |
| Topic premise/hook used by generation            | script, cover, publishing                      | validated references                                              |
| Mascot/style reference change                    | script, cover                                  | source question and unrelated records                             |
| Segment 1 edit/duration                          | compiled prompts and segment 2/3 currentness   | old downstream content, references, cover if its inputs unchanged |
| Segment 2 edit/duration                          | compiled prompts and segment 3 currentness     | segment 1 and old segment 3 content                               |
| Segment 3 edit                                   | compiled prompts                               | segments 1/2                                                      |
| Publishing edit                                  | export projection                              | script, references, cover                                         |
| Cover retry                                      | cover attempt/export readiness                 | successful script/publishing                                      |

Phase 02 must define exact dependency hashes from these inputs; exclude unrelated record revision and transient status so siblings do not invalidate each other. Derived prompt/export files must never be served as current after upstream edits.
