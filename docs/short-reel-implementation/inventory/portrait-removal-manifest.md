# Portrait Source Removal Manifest

Status: not audited. Phase 01 owns initial population; Phase 07 revalidates it against current code before destructive changes. The orientation list in [file map](../file-map.md) is not a completed inventory.

## Discovery Procedure

1. Use CodeGraph for topic creation, layout dispatch, render model, stage placements, Sandbox ratio and task invalidation callers.
2. Search tracked source, tests, scripts, config and generated schema consumers for `9:16`, `9x16`, `portrait_`, `isPortrait`, portrait dimensions and layout IDs. Search localized/alternate naming discovered from callers.
3. Classify every relevant occurrence. Generic ratio support, Question Bank visual hints and Short-Reel covers are not legacy quiz layouts.
4. Record reverse dependencies and required regression tests; inspect current dirty diffs for extracted files before deciding the owner.

## Required Row Format

Each row contains concrete repository-relative path, symbol/line evidence, responsibility, disposition, callers, protected consumers, planned phase, required tests and reviewer status. Disposition is exactly one of `remove`, `landscape_only`, `retain_short_reel`, `retain_generic_media`, `historical_documentation`.

No audited rows exist yet. Phase 01 must replace this sentence with populated evidence, including retained paths, rather than an unexplained list of deletions.

## Completion Rules

- Every legacy layout registration has a corresponding renderer, schema/catalog, UI and test disposition.
- All remaining portrait matches are explicitly classified; zero matches across the entire repository is not the goal.
- Record current HEAD, dirty-file hashes or equivalent fingerprint, search commands and reviewer identity.
- Revalidate symbols and reverse callers before Phase 07; mark obsolete rows superseded, do not silently erase their history.
