# Testing Strategy

The test suite is organized by feedback cost and dependency scope. The default command must stay deterministic and suitable for frequent local and pull-request runs. Expensive environment checks remain available without slowing every edit cycle.

## Test tiers

### Fast suite

Run `pnpm test` for shared contracts, server domain and route behavior, and web component tests.

Fast tests must not require a real browser, FFmpeg process, HyperFrames render, multi-process stress harness, or large generated media fixture. They should use focused adapters and assert observable behavior rather than implementation text where practical.

### System suite

Run `pnpm test:system` for server tests named `*.system.test.ts` or `*.browser.test.ts`.

This tier covers real or resource-intensive boundaries such as FFmpeg, HyperFrames, Chromium, process cancellation, cross-process locking, large frame sequences, and production render parity. Run it when changing media, rendering, browser-evaluated layout, persistence locking, or process lifecycle code.

### Full suite

Run `pnpm test:full` to execute the shared, fast server, system server, and web component suites. `pnpm check:all` uses this comprehensive path.

Playwright end-to-end coverage remains separate under `pnpm test:e2e`. Pixel visual regression remains opt-in under `pnpm test:visual`.

## Placement rules

- Use `*.test.ts` or `*.test.tsx` for deterministic fast tests.
- Use `*.system.test.ts` when a test invokes external processes, performs real media work, exercises cross-process behavior, or creates large integration fixtures.
- Use `*.browser.test.ts` for server-generated browser script and layout contracts.
- Use Playwright `*.spec.ts` files only for critical user journeys that require the running web and server applications.
- Keep visual snapshot updates isolated from normal verification.

## Retention rules

Keep tests that protect public contracts, domain rules, persistence safety, concurrency ordering, error recovery, security boundaries, and critical user journeys.

Remove or consolidate a test when all of the following are true:

1. Its production subject has no reachable consumer or supported external contract.
2. Current behavior is already protected at a lower-cost boundary.
3. Removing it does not reduce coverage of data migration required for persisted user data.

Do not retain tests solely because they document a completed rollout stage. Rename remaining milestone-oriented descriptions to the behavior they protect when those files are next modified.
