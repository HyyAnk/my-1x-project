# Twelve-phase implementation roadmap

## Dependency sequence

```text
01 Baseline and characterization
  -> 02 Shared geometry and sizing contracts
  -> 03 Frame, fact dock and collision bounds
  -> 04 Answer surface structure and text fitting
  -> 05 Media Left and Full Stack
  -> 06 Three-choice visual layouts
  -> 07 Split Versus and Verdict
  -> 08 Mystery data, generation and validation
  -> 09 Mystery rendering, narration and timeline
  -> 10 Image prompt/provider propagation
  -> 11 UI, preview synchronization and requirements
  -> 12 Regression, runtime verification and handoff
```

Execute sequentially by default. Stages have cross-cutting dependencies; do not independently ship partially upgraded contracts and consumers.

| Phase | Document                                            | Required outcome                                                              |
| ----- | --------------------------------------------------- | ----------------------------------------------------------------------------- |
| 01    | [Baseline](phases/01-baseline.md)                   | Reproducible baseline, conflict inventory and isolated fixtures               |
| 02    | [Contracts](phases/02-contracts.md)                 | One shared target geometry and computed image recommendations                 |
| 03    | [Frame](phases/03-frame.md)                         | Fact +40px, correctly sized arenas, phase-aware collision policy              |
| 04    | [Answer primitives](phases/04-answer-primitives.md) | Detached badges, text-only variants and accurate fit measurement              |
| 05    | [Text layouts](phases/05-text-layouts.md)           | Media Left and Full Stack match exact coordinates                             |
| 06    | [Visual layouts](phases/06-visual-layouts.md)       | Visual Card and Pure Visual match exact coordinates                           |
| 07    | [Binary layouts](phases/07-binary-layouts.md)       | Rounded Split Versus and text-only Verdict                                    |
| 08    | [Mystery data](phases/08-mystery-data.md)           | Exactly-one-answer contract across all generation/persistence boundaries      |
| 09    | [Mystery runtime](phases/09-mystery-runtime.md)     | Larger aligned image, bottom answer, exact suspense gap, narration-only facts |
| 10    | [Image pipeline](phases/10-image-pipeline.md)       | New ratios and framing reach actual provider requests                         |
| 11    | [UI integration](phases/11-ui-integration.md)       | No stale preview, misleading requirements or Mystery multi-choice controls    |
| 12    | [Verification](phases/12-verification.md)           | Tests plus inspected runtime evidence from newly built application            |

## Gate protocol

For every phase:

1. Read its inputs and exact current source files.
2. Record in-scope responsibilities, public contracts, side effects and failure handling.
3. Implement in small cohesive modules. Test observable behavior, not internal selectors alone.
4. Run the phase's checks and the updated primary flow relevant to it.
5. Review the diff; record commands, results, screenshots and residual dependencies.
6. Update PROGRESS.md and create evidence/phase-NN.md using the template.
7. Advance only after the phase's gate passes. If a later phase owns a currently failing integration assertion, record it explicitly; do not call the integration green or publish the partial upgrade.

Phase 12 has no deferred implementation dependencies. Required checks that cannot run remain blockers, not completed items.
