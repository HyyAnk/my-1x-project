# Quiz Layout Upgrade V2

Status: implementation plan only. No product code has been changed by this package.

## Objective

Upgrade all seven active 1920x1080 quiz layouts: larger image areas, detached letter badges where appropriate, clearer answer surfaces, a 40px lower fact dock, and a strictly single-answer Mystery Reveal with a 0.5-second timer-to-reveal gap. New image generation must use the closest supported ratio to the actual image viewport.

## Start here

1. Read [scope and decisions](SCOPE.md).
2. Read [geometry](specs/GEOMETRY.md), [answer surfaces](specs/ANSWER-SURFACES.md), [Mystery contract](specs/MYSTERY-CONTRACT.md), and [image generation](specs/IMAGE-GENERATION.md).
3. Read [architecture and file ownership](ARCHITECTURE.md) and [file map](FILE-MAP.md).
4. Follow [the 12-phase roadmap](ROADMAP.md) and each linked phase document in order.
5. Execute [verification](VERIFICATION.md); update [progress](PROGRESS.md) after each gate.
6. Use [the kickoff prompt](KICKOFF-PROMPT.md) to hand the entire task to a coding agent.

## Package structure

```text
quiz-layout-upgrade-v2/
  README.md
  SCOPE.md
  ROADMAP.md
  ARCHITECTURE.md
  FILE-MAP.md
  VERIFICATION.md
  RISKS.md
  PROGRESS.md
  DECISIONS.md
  KICKOFF-PROMPT.md
  specs/
    GEOMETRY.md
    ANSWER-SURFACES.md
    MYSTERY-CONTRACT.md
    IMAGE-GENERATION.md
  data/
    layout-targets.json
    file-manifest.json
    source-baseline.json
    acceptance-cases.json
  phases/                         # Exactly 12 ordered phase instructions
  evidence/
    README.md
    PHASE-REPORT-TEMPLATE.md
    FINAL-REPORT-TEMPLATE.md
  scripts/
    validate-plan.mjs
```

## Authority and drift control

- User requirements and repository instructions take precedence.
- SCOPE.md identifies user-approved requirements versus engineering decisions introduced by this plan.
- data/layout-targets.json is the numeric source of truth for this package. Tables explain it; do not implement independent copies in multiple layers.
- Production must derive sizing, CSS and UI requirements from shared typed geometry, not load planning JSON at runtime.
- data/source-baseline.json records hashes of 153 inspected or discovered existing paths. It is not a substitute for reading current files.
- data/file-manifest.json distinguishes existing integration points from proposed files. It is a bounded impact inventory, not an instruction to modify every file.
- If implementation requires changing a target, update DECISIONS.md, this package's numeric data and tests together. Do not silently trade away user requirements.
- User approval is required for scope changes, reduced image expansion, reintroduced Mystery distractors, changed 0.5-second delay, or destructive data actions.
- Implementation can refine internal module names without approval if responsibilities and contracts remain unchanged; record the change.

## Validate this package

From the repository root:

```powershell
node docs/quiz-layout-upgrade-v2/scripts/validate-plan.mjs
```

This validates plan structure, referenced files, geometry arithmetic, ratio ranking and acceptance coverage. It does not validate the application or claim implementation completion.

See [planning validation results](PLAN-VALIDATION.md) for checks actually performed on this handoff package.
