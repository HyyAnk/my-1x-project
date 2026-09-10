# Short-Reel Upgrade Implementation Pack

Prepared: 2026-09-10. Status: approved product direction; implementation not started.

This pack is the handoff for Antigravity. It contains instructions, proposed contracts, test recipes, and acceptance gates, not implemented application code. Paths are repository-relative unless explicitly absolute. Proposed files are identified as new; inspect current source before creating them.

## Read order

1. Repository `AGENTS.md` and applicable nested instructions.
2. `01-approved-design.md` - scope and product decisions.
3. `02-code-map.md` - verified integration points and known traps.
4. `03-contracts-and-state.md` - normative contracts and dependency rules.
5. `IMPLEMENTATION-PLAN.md` - ordered execution index and shared test harness.
6. The current file in `phases/`, then its relevant tests in `verification/acceptance-matrix.md`.
7. `execution/PROGRESS.md` and `execution/DECISIONS.md` before every resumed session.

## Directory structure

```text
docs/short-reel-upgrade/
  README.md
  01-approved-design.md
  02-code-map.md
  03-contracts-and-state.md
  IMPLEMENTATION-PLAN.md
  ANTIGRAVITY-START.md
  ANTIGRAVITY-RESUME.md
  phases/
    00-baseline-and-isolation.md
    01-contracts-and-compatibility.md
    02-image-provider-boundary.md
    03-script-mascot-and-style.md
    04-cover-and-publishing.md
    05-dependencies-and-orchestration.md
    06-ui-and-synchronization.md
    07-export-and-recovery.md
    08-live-verification-and-handoff.md
  verification/
    acceptance-matrix.md
  execution/
    PROGRESS.md
    DECISIONS.md
    EVIDENCE.md
```

## Operating rules

- Execute one phase at a time. Each phase has a red-test, implementation, green-test, and review gate.
- Do not skip a failed gate or replace it with a weaker assertion. Baseline unrelated failures must be identified separately.
- Use existing dependencies and provider clients. No new paid provider, credentials, deployment, automatic posting, or video rendering is authorized by this pack.
- Keep all new repository content and new UI copy in English. Preserve existing user-authored content and existing shared footer; do not duplicate it in Short-Reel.
- Start from a non-destructive baseline. This checkout contains unrelated asset-curation changes; never stage, discard, rewrite, or claim them.
- Test with mocked providers and temporary storage first. A real paid smoke test requires the user's explicit budget and target approval at Phase 08.
- No OS input automation. Browser verification must use Playwright, CDP, WebDriver, or the supported browser protocol.
- Never expose API keys, base64 image payloads, or private provider responses in logs or evidence.
- This pack does not authorize automatic commits. Review and stage only exact in-scope files if the user later requests commits.

## Completion definition

Completion means the implemented version produces an LLM script, three compiled prompts, an existing mascot reference, one generated portrait style scene, one generated portrait cover, and title/description publishing copy. Its UI synchronizes without a reload, export is consistent, old reels remain readable, and Episode/Mascot regressions are excluded by tests. A successful build alone is not completion.

Use `ANTIGRAVITY-START.md` as the initial prompt. Use `ANTIGRAVITY-RESUME.md` after a context reset. The evidence and progress files currently describe planning status only.
