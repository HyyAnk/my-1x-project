# Behavioral Test Catalogue

These are executable test design requirements, not evidence that tests have run. Implement them in normal source test locations, never import this folder at runtime. Reuse existing fixture builders where available; adapt exact exported schema/function names only after updating contracts.md.

## Shared Fixture And Red-Green Seed

The following fixture uses the existing BankQuestionSchema shape. Place it in a normal test helper when implementing; do not write it into the actual Question Bank.

```ts
import { BankQuestionSchema } from "@studio/shared";

export const sourceQuestion = BankQuestionSchema.parse({
  id: "test-reel-versus-001",
  archetype_id: "versus_faceoff",
  domain_id: "vehicles_technology",
  subtopic_id: "motion",
  language: "English",
  question: "Over the same distance, which finishes first: 20 km/h or 10 km/h?",
  format: "multiple_choice",
  choices: [
    { id: "A", text: "20 km/h", is_correct: true },
    { id: "B", text: "10 km/h", is_correct: false },
  ],
  correct_choice_id: "A",
  explanation: "For the same distance at constant speed, the higher speed takes less time.",
  age_band: "family",
  status: "approved",
});
```

Build a valid draft through the real create repository method, then a valid three-segment script. A test example for the pure compiler's timing projection:

```ts
import assert from "node:assert/strict";
import test from "node:test";

test("creative segment timing is cumulative without gaps", () => {
  const durations = [8, 9, 10];
  let cursor = 0;
  const spans = durations.map((duration) => {
    const span = { start: cursor, end: cursor + duration };
    cursor = span.end;
    return span;
  });
  assert.deepEqual(spans, [
    { start: 0, end: 8 },
    { start: 8, end: 17 },
    { start: 17, end: 27 },
  ]);
});
```

This small example illustrates the expected result only. The production regression test must call the actual compiler/projection function, not duplicate this implementation and call the duplicated code proof of correctness.

For asynchronous tests, use controllable promises instead of arbitrary sleeps:

```ts
export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((ok, fail) => {
    resolve = ok;
    reject = fail;
  });
  return { promise, resolve, reject };
}
```

## Schema Cases: Phase 02

| ID    | Arrange / Act                                                                                     | Required Assertion                                                                         |
| ----- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| SC-01 | Parse draft without script, then script with 0/2/4 segments                                       | Draft accepted; each malformed script rejected; valid 3 accepted                           |
| SC-02 | Change index/mode to duplicate 1 or generate at index 2                                           | Rejected at the offending field                                                            |
| SC-03 | Durations 7.9, 10.1, NaN, Infinity; cue -1, start=end, end beyond duration                        | Rejected; 8/9/10 accepted; total derives to 27                                             |
| SC-04 | Source missing correct choice, duplicate choice IDs, draft/archived status, unsupported archetype | Rejected for selection; no bank mutation                                                   |
| SC-05 | Canonical question/answer cue changed, answer before question                                     | Fidelity/reveal validation rejects; supporting paraphrase is separately reviewed           |
| SC-06 | Adjacent state mismatch, unknown edit keys, invalid asset role/path                               | Structured field errors; no unchecked casts or silent stripping of dangerous mutation keys |

## Repository Cases: Phase 02

| ID    | Arrange / Act                                                     | Required Assertion                                                                        |
| ----- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| RP-01 | Create, save, reconstruct repository adapter, read                | Same source and IDs/revision, no Episode artifacts                                        |
| RP-02 | Promise.all two writes with same expected revision                | Exactly one accepted and one conflict; winner is readable                                 |
| RP-03 | Repeat same channel/topic creation concurrently and after restart | Exactly one record; selected-topic projection consistent                                  |
| RP-04 | Same request ID with identical versus different payload           | Replay returns original result; changed payload conflicts                                 |
| RP-05 | Cross-channel key and traversal/junction target                   | Not-found/validation error; no access outside target root                                 |
| RP-06 | Fail temporary write/rename and retry creation                    | Previous valid data survives; no duplicate orphan product; no fabricated successful write |

## Topic And Selection Cases: Phase 03

| ID    | Arrange / Act                                                       | Required Assertion                                                                                              |
| ----- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| TP-01 | Stub generator produces five candidates                             | Exactly 3 Episode and 2 Short-Reel; bad split rejected/corrected within budget                                  |
| TP-02 | With keyword versus without keyword                                 | Slots 1/4 keyword-directed only when hint present; other slots discovery; inspect creative relevance separately |
| TP-03 | Episode title contains shorts; reel title does not                  | Explicit content_kind routes correctly, title has no routing effect                                             |
| TP-04 | Eligible question only on second query page                         | Selected through bounded pagination; no false empty result from default first page                              |
| TP-05 | Empty bank, archived question, unverified English translation       | Recoverable empty/invalid-source result; no implicit new question or translation                                |
| TP-06 | Repeated confirmation and failure before topic selection projection | One reel only; retry reconciles projection; Episode path remains functional                                     |

## Script And Revision Cases: Phase 04

| ID    | Arrange / Act                                               | Required Assertion                                                                                                          |
| ----- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| SG-01 | Stub valid three-part JSON                                  | Saved script passes schemas; compiler returns exactly three strings                                                         |
| SG-02 | Invalid JSON twice, or provider timeout                     | At most one correction; bounded typed failure and retained accepted content                                                 |
| SG-03 | Compile same saved inputs twice                             | Byte-identical prompts; exact question/answer, references, local/cumulative timing, no no-text instruction                  |
| SG-04 | Edit segment 1, then 2, then 3                              | Invalidation matches ledger; old downstream text preserved; no automatic generation                                         |
| SG-05 | Start deferred generation, edit input, resolve older result | Older result discarded; new input retained                                                                                  |
| SG-06 | Cancel then resolve; resolve then cancel                    | Linearized honest state; cancelled work cannot become ready; already accepted result not mislabeled cancelled retroactively |
| SG-07 | Two sibling component completions from same input snapshot  | Both accepted when dependencies unchanged; revision increment by sibling does not discard valid result                      |

## Package Cases: Phase 05

| ID    | Arrange / Act                                                        | Required Assertion                                                       |
| ----- | -------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| PK-01 | Missing mascot/style, corrupt image, atlas instead of selected frame | Explicit missing/invalid reference, no substitute or false-ready package |
| PK-02 | Produce cover using image adapter                                    | Decoded 1080x1920, correct MIME, original refs unchanged                 |
| PK-03 | Cover fails after script/publishing succeed; retry cover             | Other content byte-identical; new cover attempt only                     |
| PK-04 | Export complete/current record, then stale record                    | Complete ZIP manifest/entries; stale export rejected                     |
| PK-05 | Unsafe entry name, duplicate asset name, client file path            | Rejected; archive never leaks external files or secrets                  |
| PK-06 | Edit races with export                                               | One consistent snapshot or conflict; no mixed revisions                  |

## Routes And UI Cases: Phase 06

| ID      | Arrange / Act                                        | Required Assertion                                                                            |
| ------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| HTTP-01 | Cross-channel, invalid IDs/body, missing record      | Correct typed status codes; no stack/secrets leaked                                           |
| HTTP-02 | Double generate with same request ID                 | One active operation, replay acknowledges same task                                           |
| HTTP-03 | Stale PATCH revision                                 | 409; draft preserved by client                                                                |
| HTTP-04 | Restart while task pending                           | Persisted accepted work retained; interrupted attempt becomes recoverable, no eternal spinner |
| HTTP-05 | Out-of-order event and reconnect                     | Refetch authoritative state; older event cannot regress UI                                    |
| UI-01   | Initial load, slow save, initial empty bank          | Appropriate skeleton/pending/empty state; previous useful context kept                        |
| UI-02   | Type while a fetch resolves                          | Unsaved draft remains; remote version available without overwrite                             |
| UI-03   | Cancel then retry                                    | Correct immediate acknowledgement and terminal state; unrelated controls usable               |
| UI-04   | Deny clipboard permission, then allow                | Selectable fallback on failure; copied feedback only after success                            |
| UI-05   | Two tabs edit same record                            | Conflict resolution preserves input and prevents silent overwrite                             |
| UI-06   | Keyboard/touch at 1440, 390 and 320px widths         | No clipping/overflow, controls reachable, concise titles without periods                      |
| UI-07   | Edit, regenerate failed unit, export, return to list | All views show current state without F5; no fake finished-video status                        |

## Retirement And Final Cases: Phases 07-08

| ID    | Arrange / Act                                             | Required Assertion                                                                             |
| ----- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| RT-01 | Submit portrait Episode config through each exposed entry | Explicit rejection; no silent legacy conversion                                                |
| RT-02 | Inspect Episode/Stage/Sandbox controls/presets            | No portrait quiz mode remains                                                                  |
| RT-03 | Fresh landscape render and Short-Reel cover               | Landscape baseline respected; generic 9:16 cover still functional                              |
| RT-04 | Dry-run/execute approved obsolete data targets            | Exact targets only; protected IDs/hashes retained; recovery status recorded                    |
| RT-05 | Remaining portrait text search and list/detail reload     | Every retained occurrence justified; no dangling removed-product references                    |
| IN-01 | Full updated Episode and reel workflows after restart     | Real HTTP/storage/UI integration succeeds; mocked provider boundaries disclosed                |
| IN-02 | Search production/test imports and package commands       | No dependency on this removable kit                                                            |
| IN-03 | Actual manual Flow runs for both archetypes               | User evidence for three segments, text, references, continuity and duration; otherwise pending |

## Evidence Standards

Use temporary isolated repository roots for storage/deletion tests, not live channel data. Test observable contracts rather than private helpers. Mock external providers, not the domain/repository under test. Use fresh process restart tests where restart safety is asserted. Record an actual test list/count so a wrong filter returning zero tests cannot pass a phase gate.
