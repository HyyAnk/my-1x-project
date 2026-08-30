# Architecture Decision Records

Accepted ADRs are stable constraints for later phases. They do not authorize implementation outside the active phase.

## Status meanings

- Proposed: under discussion; an implementation task must not assume it is final.
- Accepted: current direction unless superseded.
- Superseded: replaced by a newer ADR, which must be linked.
- Rejected: retained to prevent the same discarded option from being rediscovered without new evidence.

## Current decisions

| ADR     | Decision                                                               | Status   |
| ------- | ---------------------------------------------------------------------- | -------- |
| ADR-001 | Production layout remains independent from visual preset selection     | Accepted |
| ADR-002 | Text and visual choices converge on one renderer with skins            | Accepted |
| ADR-003 | Layout, base component, skin, and typography own separate CSS concerns | Accepted |
| ADR-004 | Background style is independent from palette and foreground motion     | Accepted |
| ADR-005 | Four-choice support is a separate domain migration                     | Accepted |
| ADR-006 | Phase 6 proof layouts are explicit-only during the core refactor       | Accepted |

When implementation evidence materially changes a decision, add a new ADR rather than silently rewriting historical reasoning.
