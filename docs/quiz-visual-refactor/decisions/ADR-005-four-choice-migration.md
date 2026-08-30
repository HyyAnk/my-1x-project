# ADR-005: Keep Four-Choice Support in a Separate Migration

Status: Accepted

## Context

Current schemas, generation contracts, parser validation, history records, Sandbox requests, tests, and visual CSS assume two choices for true/false and three for every other current format. Proposed 2x2 layouts require four choices.

Raising the maximum constant alone would create inconsistent artifacts and could break answer timing, prompts, QA, and existing episode assumptions.

## Decision

The seven-phase visual refactor keeps the current two/three-choice product contract. Four-choice support begins only after the core layout and choice-render architecture is stable.

The later migration must explicitly address:

- format-specific allowed counts and backward compatibility;
- generation and retry prompts;
- parsers and audits;
- remix and rephrase workflows;
- voice timing and answer-label rotation;
- history and duplicate detection;
- Sandbox and API schemas;
- QA and layout resolution;
- 2x2 text and visual layouts.

## Consequences

- The core refactor remains behavior-preserving.
- media_top_choices_bottom and full_stack_list are better proof layouts than 2x2 grids.
- Existing three-choice episodes remain canonical during the refactor.
- Four-choice product decisions receive their own acceptance and migration plan.

## Phase impact

Phase 1 must explicitly test the current fourth-choice rejection. No core phase may relax it incidentally.
