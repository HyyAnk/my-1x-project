# Phase Handoffs

Every completed phase creates one factual handoff record from its template. The record is durable task state, not a conversational summary.

A handoff must include:

- starting and ending repository state;
- scope completed and omitted;
- contract or decision changes;
- exact test/build/workflow commands and results;
- files changed;
- unrelated changes preserved;
- blockers, risks, and next actions;
- readiness of the next phase.

Create handoffs as `phase-NN-YYYY-MM-DD.md`. Phase 8 subphases use `phase-08a-YYYY-MM-DD.md` through `phase-08d-YYYY-MM-DD.md`. Add a descriptive suffix if a same-day file already exists; never overwrite earlier evidence.

Templates are available for Phase 1 through Phase 7. Phase 8 uses the shared brief/matrix and its subphase prompt as the handoff contract. A later task must read the newest non-template handoff for the immediately preceding phase or subphase before it edits code.

Do not mark a phase complete in `roadmap-status.md` without its handoff evidence. A `PARTIAL` or `BLOCKED` handoff does not unlock the next phase.

Phase 8 closure: `phase-08d-2026-08-31.md` records the final adapter/dimensions decisions, complete verification, artifact revalidation, repository state, and checkpoint commit plan.
