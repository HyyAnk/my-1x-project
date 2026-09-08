# Stage B Repair 03: Lifecycle and Mobile Follow-up

## Identity and decision

2026-09-07, Codex, main-direct. This is implementer self-review, not an independent fresh-session review. Claim: claim-codexstagebfollowup-mtra8e1b. Stage B is not accepted; Phase 04 has not started.

## Reproduced and repaired

1. Topic projection used one temporary owner per repository for overlapping operations. A barrier-controlled test first ensures both operations reserve admission, holds the second write, and checks the first result. Before the fix the first result remains pending after its own write completes. Each projection now has a unique operation owner and captures the root used for both acquisition and release. The regression fails before and passes after the fix. Existing process-level admission tests also pass; this is not a new cross-process projection test.
2. At 320px the full-width Back button shared a horizontal header with the title. Chromium measured the title at x=332 with width=10.89 outside the viewport. Global overflow clipping concealed the bug from a document-width-only assertion. Mobile header contents now stack vertically. Title bounds and page width checks pass at 320, 390, and 1440px.

## Current verification

- Full server: 168 files / 1,298 tests passed.
- Full web with explicit resource bounds: pnpm --filter @studio/web test -- --maxWorkers=2 --minWorkers=1; 68 files / 352 tests passed, including AppViewRouter. The earlier default-concurrency failures remain historical evidence; no timeout was increased and no test was skipped.
- Focused repository, recovery, drain, and HTTP route checks: 25 tests passed.
- Monorepo typecheck and web production build passed.
- git diff --check and zone validation passed.

## Browser evidence

Actual ShortReelStudio, global application CSS, and schema-valid fixtures were loaded through Vite into an isolated Chromium harness. The API method was stubbed in-browser, not the UI. An initial fetch failure followed by keyboard focus + Enter on Retry rendered the correct source and stopped loading at all three widths.

- [320px](stage-b-repair-03-320.png)
- [390px](stage-b-repair-03-390.png)
- [1440px](stage-b-repair-03-1440.png)

Images were inspected visually after repair. This proves component layout and retry, not full application routing, real confirmation persistence, or network reconnect. No paid/live Flow operation was performed.

## Remaining gates

- Independent Stage B acceptance is still absent. A changed model in the same task is not a fresh reviewer.
- Full topic suggestion -> confirmation -> draft reopen browser workflow, reconnect behavior, and end-to-end assigned-plan immutability still require verification. Do not interpret passing aggregate tests as proof of these missing cases.
- The documented English-only versus required footer-credit conflict remains unresolved; no new footer policy was invented.
- Prior Repair 02 statements claiming all findings resolved were broader than the demonstrated evidence. This record qualifies them, without altering historical evidence.
