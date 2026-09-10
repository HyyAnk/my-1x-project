# Phase 2: Source Policy Implementation Plan

> Execute directly; each behavior change needs a failing regression first.

Goal: every confirmable Topic resolves real eligible English Bank content.
Architecture: reuse shared eligibility and inventory snapshots; remove production fixture shortcuts.
Tech stack: TypeScript, shared schemas, Vitest.
Spec: [Contract](02-contract.md).

## Files

Modify apps/server/src/repository/topics.ts and apps/server/src/quiz/bank/bridge/boundSourceResolver.ts.
Inspect apps/server/src/quiz/bank/bankInventory.ts, which owns scanBankInventory; reuse its coherent snapshot contract rather than creating a second scanner.
Extend apps/server/test/boundTopicConfirmation.test.ts and topicAvailabilityRoute.test.ts.
Create apps/server/test/topicSourceIntegrity.test.ts for synthetic/bypass/snapshot regressions.
Update fixtures in affected tests rather than maintaining fake production bindings.

## Tasks

- [ ] Save an ordinary unbound keyword candidate whose ID contains neither legacy nor unbound. Assert no generated bindings and unavailable/re-suggest behavior.
- [ ] Remove qb_synth generation, constant hashes and ID/origin naming exemptions from saveTopicRun. Preserve genuine existing bindings only.
- [ ] Add direct repository.confirmTopic tests with missing, unapproved, non-English, wrong-format, wrong-archetype and changed-hash sources. Each must fail before product/selection writes.
- [ ] Remove or constrain that bypass: route public confirmation through the authoritative workflow, or make raw product persistence internal and callable only with validated admission data. Keep dependency direction clear; do not introduce a repository/service import cycle.
- [ ] Add a deferred mutation test between source reads. Resolve the full ordered binding set against one coherent inventory snapshot using shared eligibility; duplicates and capacity mismatches fail explicitly.
- [ ] Test force policy narrowly: if permitted, force overrides cooldown only, never missing sources, bad hashes, language, status or incompatible structure.
- [ ] Record snapshot revision/admission information for phase 3. For new work, a source mutation during translation must prevent publication or explicitly retry with the same admitted policy; never reselect.
- [ ] Run focused source and allocation suites, then document exact validation/error contracts in reports/phase-2.md.

Acceptance examples: an eight-question candidate cannot confirm from three real bindings; duplicate IDs cannot count twice; arbitrary syntactically valid fake bindings never create an Episode.
