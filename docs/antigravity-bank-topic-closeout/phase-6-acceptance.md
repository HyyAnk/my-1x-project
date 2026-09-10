# Phase 6: Independent Acceptance Implementation Plan

> Execute directly. Prior phase reports and test totals are not acceptance evidence.

Goal: reproduce integrated behavior and return an auditable result.
Architecture: isolated filesystem, deterministic providers, real transport/use-case/consumer boundaries.
Tech stack: Vitest, Playwright, repository scripts.
Spec: [Contract](02-contract.md).

## Files

Create apps/server/test/bankTopicCloseoutAcceptance.test.ts for cross-workflow regression cases.
Reuse current browser test harness after inspecting apps/web/package.json and Playwright configuration.
Write reports/phase-6.md and reports/FINAL-REPORT.md in this package.

## Required matrix

| Area                      | Required observable result                                                              |
| ------------------------- | --------------------------------------------------------------------------------------- |
| en/de/fr Episode and Reel | Six real route-to-storage flows, correct display language and canonical English source  |
| Source shortage           | Empty/insufficient inventory yields honest shortage and no fake candidate               |
| Source mutation           | Changed hash/status/language/format/cooldown rejects new confirmation                   |
| Concurrent confirm        | Three identical calls yield one identity; conflicting language/options are rejected     |
| Failure/restart           | Every phase-3 boundary recovers one complete product with idempotent history/projection |
| Corrupt/missing data      | Typed error or explicit recovery, no false success/empty artifact fallback              |
| Language change           | Existing products retain target; future products use updated channel target             |
| Consumers/export          | Quiz text, description and thumbnail literals localized; instructions/UI/source English |
| Bank safety               | Traversal/junction/index/redirected-root protections and recoverable multi-file failure |
| UI latest/empty/stale     | Run identity and request ordering work without F5 or timestamp clustering               |

- [ ] Rebuild shared contracts before integration tests. Use mkdtemp roots and explicit selectors; provider doubles must reject unexpected calls.
- [ ] Record ordered source IDs, correct-choice IDs, source hashes and Bank file hashes before/after each flow. Usage history changes are allowed; translated Bank content is not.
- [ ] Reopen repositories after injected failure rather than relying on in-memory state.
- [ ] Inspect final description, thumbnail prompt, Short-Reel script and exported package. Artifact existence alone does not prove consumer use.
- [ ] Run current commands below, recording exit code, duration, failures/skips and environment limitations.
- [ ] Audit modified test/config files for weakened assertions, broader exclusions, longer timeouts masking deadlocks or snapshot updates masking regressions.
- [ ] Read-only audit configured live root if accessible: resolve storage.local.json, count valid batches/questions/languages, record index agreement and migration manifest hash. Do not apply migration or alter live files.
- [ ] Review full task diff for unrelated edits, English-only implementation, unsafe recovery and missing consumers.
- [ ] Return ACCEPTED only with the complete matrix proven; otherwise NEEDS_WORK with exact remaining reproduction and next action.

## Commands

```powershell
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm build
pnpm test:e2e
pnpm test:visual
pnpm audit:repo
git diff --check
```

Do not update baselines just to pass. Inspect current scripts first; removed claim/zone scripts must not be reported as passing or restored without authority. Browser tests must use isolated storage and may not attach to live user data.

Final report must include actual commands, six flow evidence, failure/retry matrix, source immutability, changed files, remaining risks and any checks not run. Separate mock-provider integration from real-provider/render verification.
