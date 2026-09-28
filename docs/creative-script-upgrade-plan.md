# Creative script upgrade

## Objective

Let the model author varied, natural intro/outro performances. Use Novy's causal acting and integrated audio as inspiration, not a required plot or a quota of gestures, voices or effects. Keep the existing video-prompt workflow and avoid adding a review-model call or audio pipeline.

## Boundaries and implementation

1. Introduce a versioned creative production policy for newly generated revisions. Existing revisions retain their previous behavior.
2. Preserve authored action text, ending, speech, score and supplied beat timing. Keep three broad timeline groups for compatibility with the editor, but allow multiple micro-beats within them. Missing legacy beat timestamps may use the established default grouping; invalid supplied values must not be silently repaired.
3. Replace mandatory stunt sequences with goals and optional examples. Pass the randomization seed into the writing prompt so different runs with the same selected ideas can still vary. Keep paired visual identity while allowing clip-specific musical development.
4. Separate technical blockers from editorial suggestions. Timing gaps, overlaps, invalid ranges, unknown references and explicitly unsupported capabilities remain errors. Pacing and text-based action heuristics are non-blocking warnings. No action-count, six-SFX, eight-word, one-line, exact-camera-name or fixed-ending gate for the new policy.
5. Stop seed filtering by complexity and stationary-ending conventions; preserve explicit incompatibilities and reviewed capability requirements.
6. Export the authored performance without layering a mandatory chase, silence, single hit or hero pose over it. Keep native audiovisual generation directions and reference fidelity.

## Contracts and failure handling

- Retain existing JSON field names, three editor groups and bounded payload sizes. The existing schema allows up to three speech events and sixteen sound events; these are transport limits, not target counts.
- Add the new production policy to the shared schema and allow an intentional zero-second final hold. No persisted revision migration.
- Invalid provider output reports a generation error; a creative warning does not trigger regeneration, erase content or prevent approval/export.
- Maintain cancellation, independent clip completion and current progress reporting. The existing final-hold field accepts zero for the new policy and retains its legacy minimum otherwise. Editing immediately updates the draft via the existing onChange path; save/pending/error/retry behavior and refresh stay unchanged. No new controls or layout changes are needed on desktop or mobile.

## Verification

- Test preservation through provider parsing, normalization, validation and export: authored ending, unequal beat timing, two dialogue events, intentional repeated wording, seven or more cues and a cue in the last second.
- Test real blockers: overlapping speech, out-of-range audio, timeline gaps, unsupported anatomy/capabilities and incorrect identity references.
- Test creative seed eligibility, deterministic selection, explicit conflicts and different prompt variation seeds.
- Run existing legacy tests, API generation/approval/export tests, shared/server/web type checks, relevant builds and scoped lint. No claim of Seedance/Veo audiovisual verification without an actual render.

## Completed verification

- `pnpm --filter @studio/server exec vitest run introOutro --testTimeout 15000`: 116 tests passed, including provider-fixture generation, approval and export of two speech events, eight SFX, a late cue and non-blocking editorial warnings.
- `pnpm --filter @studio/web exec vitest run IntroOutroScriptStudioComponents ScriptProductionDirections`: 13 tests passed, including immediate draft update to zero hold and the legacy minimum.
- `pnpm --filter @studio/shared test`: 426 tests passed.
- `pnpm typecheck`: shared, server and web passed.
- Server and web builds passed; scoped ESLint and `git diff --check` passed.
- After the final validator routing refactor, the creative-policy, API and legacy production-quality suites were rerun: 48 tests passed.
- No live provider generation, Seedance/Veo render or desktop/mobile visual-browser audit was performed. The only UI change is the existing numeric field's minimum; no labels, layout or controls were added.

Delivery: template `intro-outro-script-v11`, production policy `creative-performance-v3`, seed-selection version `3`. New revisions opt into the change; saved revisions are not rewritten. No new dependencies or background services were introduced.
