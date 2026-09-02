# Claim Record Template

This template describes the fields the Phase 2 claim registry should support.

```yaml
id: claim-example
agent: codex
task: short task description
status: active
createdAt: 2026-09-02T00:00:00+07:00
updatedAt: 2026-09-02T00:00:00+07:00
expiresAt: 2026-09-02T02:00:00+07:00
workingMode: main-direct
baseRevision: git-sha
workspaceRoot: D:/path/to/repository

baseline:
  gitStatusShort:
    - "M path/to/pre-existing-file"
  changedFiles:
    - path/to/pre-existing-file
  note: "Files already dirty before this claim must not be edited unless covered by writeZones and explained in the release summary."

writeZones:
  - render-implementation

readStableZones:
  - shared-contracts
  - render-inputs

plannedFiles:
  - apps/server/src/quiz/render/**

verificationRequired:
  - typecheck
  - focused-tests

release:
  releasedAt:
  releasedBy:
  verificationSummary:
  filesChanged:
```

Required behavior:

- Active write claims must conflict with overlapping exclusive write zones.
- Claims must expire or be reported stale after `expiresAt`.
- Expanding a claim must update `updatedAt`, write zones, read-stable zones, and planned files before out-of-scope edits happen.
- Releasing a claim must preserve enough history for integration review.
