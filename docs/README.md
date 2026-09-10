# Documentation

Reviewed on 2026-09-09 against the working tree. Source, schemas and executable tests take precedence. These guides describe implementation; they do not certify that current runtime tests pass.

## Start here

1. [Architecture](architecture.md): responsibilities, data flow and persistence boundaries.
2. [System map](system-map.md): source entry points.
3. [Development workflow](workflow.md): change safety, verification and publishing.

## Domain guides

- [Channel DNA](channel-dna.md)
- [Question bank and source-bound topics](question-bank.md)
- [Episode workflow](episode-workflow.md)
- [Quiz Engine V2](quiz-engine-v2.md)
- [Short Reels](short-reel.md)
- [Mascot rendering contract](mascot-rendering-contract.md)
- [LLM engine integration](codex-integration.md)
- [Provider boundaries](provider-system.md)

## Operations

- [Setup](setup.md)
- [Troubleshooting](troubleshooting.md)

## Historical evidence

[Bank-topic closeout](antigravity-bank-topic-closeout/README.md) is retained as historical planning and reported execution evidence, not a current task queue. Do not run its prompts automatically.

Its final report records a failed E2E run despite an unconditional acceptance claim. That discrepancy remains unverified by this documentation review. Preserve the original evidence and require fresh checks before closing the remaining gate.

The standalone GitHub publishing checklist was removed after consolidation into the workflow guide. Previously deleted historical folders were not restored.
