# Bank and Topic Closeout

Status: historical planning and reported execution evidence. Do not execute this package as a current work queue.

Documentation review note (2026-09-09): the final report claims unconditional acceptance but records `pnpm test:e2e` exit code 1 with only 5/13 tests passing. Runtime acceptance remains qualified/unverified until fresh evidence resolves that gate. No runtime tests were rerun during this documentation cleanup.

The original planning baseline below is retained for traceability, not as current instructions. Use [current documentation](../README.md) first.

Read [Audit](01-current-audit.md), [Contract](02-contract.md), then phases 1 through 6 in order. Start Antigravity with [Master prompt](prompts/00-master.md). Each phase also has a standalone prompt.

## Scope

Finish English-only Question Bank, source-backed Topic allocation, durable Episode/Short-Reel confirmation, product-only localization, and synchronized availability. Work directly and sequentially. No subagents and no prescribed model.

## Current baseline

Inspected on 2026-09-09. HEAD: cc77992 (Change Claim rule). The working tree contains existing source/test/config edits and many deleted historical documents. Preserve them. Previous claims tooling and handoff folders are absent; do not restore them from historical instructions or invent claim execution results.

This package adds documentation only. Seven existing focused server suites ran successfully: 74 tests. This does not establish fault-injection, full workflow, render, E2E, or final acceptance.

## Execution order

1. Bank filesystem and transaction safety
2. Source-backed allocation and authoritative validation
3. Confirmation transactions and retry recovery
4. Localization consumers and language lifecycle
5. Availability and run synchronization
6. Independent acceptance and return report

After each phase create `reports/phase-N.md` using [Report template](report-template.md). Write the final result to `reports/FINAL-REPORT.md`, including remaining failures. Do not overwrite or restore deleted historical reports.
