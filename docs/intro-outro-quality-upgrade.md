# Single-pass production quality upgrade

## Plan and scope

1. Introduce a versioned v6 production policy and structured choreography per beat. Retain legacy schemas and compilation for existing revisions; do not migrate or rewrite saved prompts.
2. Use one principal action, an expression, passive secondary motion and a settled pose. The last beat is assembled from supported stationary gestures, never free-form travel plus a gesture chain. Reserve the last second for a static camera and pose.
3. Filter seeds before generation using duration, complexity, explicit compatibility and the hero-hold ending policy. Search compatible combinations deterministically rather than sampling independently and failing afterward. Reject incompatible explicit selections instead of substituting them.
4. Compile v6 prompts without internal IDs or the full anatomy inventory. Keep signature features, all explicit motion constraints, references, logo handling, timed actions and audio. Deduplicate exact repetitions and enforce concise generated fields before persistence. Preserve legacy export behavior.
5. Keep exactly one script provider call; validation failures return existing partial/error states. No AI review, hidden regeneration, prose truncation, or fake quality guarantee.

## Verification

Test Novy-style three-stride final beats and Feli-style wave/bow combinations, supported/unsupported gestures, final camera lock, narration limits, conflicting explicit seeds, deterministic compatible random selection, and prompt length/essential constraints. Run domain/API suites, shared/server builds, scoped lint and formatting. Test doubles verify contracts; downstream video fidelity still requires video production QA.

## Limitations

The default v6 structure uses a stationary hero hold; departure endings are excluded rather than combined with it. Structured fields and targeted checks limit choreography, but deterministic validation cannot prove semantic or artistic quality of arbitrary natural language. The 300–500-word range is a target for typical identities, not a reason to discard essential constraints for unusually complex mascots.

## Delivered verification

- Shared/server builds, web typecheck, scoped ESLint and diff whitespace checks passed.
- 62 tests passed across production-quality, domain, script API and pair-upload suites. Legacy export assertions remain covered.
- A real-provider Novy / Arcade Pop Master pair succeeded in one request in 68.2 seconds on 2026-09-25. Job: `ioscript_job_24e2f6f94fea4c30`; separate verification project: `ioscript_729ec2db38eb4618`. Existing Novy/Feli workspace scripts were not overwritten.
- The generated prompts contained 484 words / 3515 characters (intro) and 494 words / 3517 characters (outro), before punctuation cleanup. Previous live prompts exceeded 8000 characters per clip. Both clips passed local validation without warnings or repair calls.
- Read-through confirmed the closing beat uses a stationary point or smile, a fixed pose, and a static camera from 7–8 seconds. One short narrator line per clip ends before the hold. The first two beats retain natural expression and follow-through without a closing travel/gesture chain.
- Exported examples: [Intro](examples/novy-v6-intro.md), [Outro](examples/novy-v6-outro.md). These are script samples, not proof of downstream generated video quality.

New generation requires the v6 structured choreography. Old revisions have no production-policy marker and retain their prior validation/compiler. The seed catalog is revision 3 and selection algorithm 2; legacy algorithm 1 snapshots still parse. Shared scene fields from a legacy companion remain exact, even if longer, to avoid breaking pair continuity during single-clip regeneration.
