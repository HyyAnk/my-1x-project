# Phase 5 Report: Availability and Run Synchronization UI

## Result

PASS. Phase 5 (Availability and Run Synchronization UI) complete on working copy checkout.

## Reproduction

- **Finding U1 (Candidate Count Mismatch in Availability Policy):**
  - *Fixture & Setup:* `apps/server/test/topicRunIntegrity.test.ts` test case `"Finding U1: Availability Capacity Policy & Candidate Count Enforcement"`.
  - *Before Repair:* In `apps/server/src/repository/topics.ts`, `getTopicAvailabilityBatch` hardcoded `requiredCount = isShortReel ? 1 : QUIZ_MIN_QUESTION_COUNT` (3). When an 8-question candidate had only 3 eligible prefix sources (with questions 4..8 in channel cooldown or modified), availability evaluated `sourceCapacity (3) >= requiredCount (3)`, reporting `can_confirm: true` instead of `false`.
  - *Observed Failure:* An 8-question candidate was reported as confirmable despite having only 3 eligible sources, allowing confirm requests to proceed only to fail downstream or produce truncated content.
  - *After Repair:* In `topics.ts`, `requiredCount` is calculated as `isShortReel ? 1 : (overrideCount ?? candidate.question_count ?? candidate.source_bindings?.length ?? QUIZ_MIN_QUESTION_COUNT)`. If `sourceCapacity < requiredCount`, `can_confirm` evaluates to `false`, reporting descriptive `source_capacity` and `reason_code: "NO_ELIGIBLE_SOURCES"`.

- **Finding U2 (Latest Run Skipping Unreadable JSON & Schema Fallback):**
  - *Fixture & Setup:* `apps/server/test/topicRunIntegrity.test.ts` test cases `"Finding U2: Latest Run Fail-Closed on Malformed File"`.
  - *Before Repair:* In `apps/server/src/repository/topics.ts`, `getLatestTopicRun` iterated run files and silently caught read errors (`try { return JSON.parse(...) } catch {}`), continuing the loop and returning an older successful run when the newest run file was malformed or corrupted. Furthermore, the parsed JSON was returned without schema validation.
  - *Observed Failure:* If a newer run file had invalid JSON or bad schema, `getLatestTopicRun` returned a stale older run, concealing generation failures and displaying outdated suggestions.
  - *After Repair:* `getLatestTopicRun` identifies the newest file chronologically. If the file cannot be read, contains invalid JSON, or fails `TopicRunSchema` parse validation, it fails closed by throwing a typed `RepositoryError("TOPIC_RUN_CORRUPTED", ...)`, preventing stale run promotion.

- **Finding U3 (Clock Skew Invalidation & 1500ms Timestamp Clustering Heuristic):**
  - *Fixture & Setup:*
    - Web hook: `apps/web/src/features/channel/hooks/useTopicAvailability.test.ts` test case `"accepts newer request B even if B.checked_at is earlier than prior state (clock skew)"`.
    - Web component: `apps/web/src/features/channel/components/ChannelTopicsTab.test.tsx` test cases covering authoritative run grouping, shortage notice, legacy candidate placement, and confirmation state.
  - *Before Repair:*
    - In `apps/web/src/features/channel/hooks/useTopicAvailability.ts`, a temporal guard `if (lastCheckedAtRef.current && result.checked_at < lastCheckedAtRef.current) return null;` dropped newer poll responses if server clock stepped backward or had clock skew.
    - In `apps/web/src/features/channel/components/ChannelTopicsTab.tsx`, topics were grouped into the latest run via a timestamp clustering heuristic `Math.abs(new Date(timeA).getTime() - new Date(timeB).getTime()) < 1500`. Candidates generated within 1500ms of each other were conflated into the latest run even if they belonged to distinct runs or lacked run IDs, and empty runs with shortages could not be cleanly presented.
  - *Observed Failure:* Server clock skew permanently blocked availability updates; rapid successive runs within 1500ms were merged into a single pseudo-run in the UI; unassigned legacy candidates were mistakenly promoted into the latest run.
  - *After Repair:*
    - Removed `lastCheckedAtRef` from `useTopicAvailability.ts`. Out-of-order responses and race conditions are strictly handled by sequence numbers (`requestSeq === sequenceRef.current`) and cancellation tokens (`abortControllerRef`). Newer dispatched requests always take precedence.
    - In `ChannelTopicsTab.tsx`, removed the 1500ms timestamp clustering heuristic. Grouping is strictly governed by authoritative `run_id`. When `latestRun` has zero matching candidates and shortages, the shortage banner is rendered and previous runs remain in history. Legacy candidates without `run_id` are consistently displayed in the history list rather than fabricated into a latest run.

## Implementation

- **`apps/server/src/repository/topics.ts`:**
  - Updated `getTopicAvailabilityBatch` signature and implementation to support `TopicAvailabilityBatchOptions` with optional candidate count overrides.
  - Aligned required capacity with candidate's actual `question_count` (`overrideCount ?? candidate.question_count ?? candidate.source_bindings?.length ?? QUIZ_MIN_QUESTION_COUNT`).
  - Hardened `getLatestTopicRun` to sort suggestion run files by chronological order (filename timestamp or disk mtime), validate with `TopicRunSchema`, and throw `RepositoryError("TOPIC_RUN_CORRUPTED")` when the newest run is unreadable or malformed.
- **`apps/web/src/features/channel/hooks/useTopicAvailability.ts`:**
  - Removed `lastCheckedAtRef` and temporal rejection logic.
  - Retained strict sequence-based ordering (`requestSeq === sequenceRef.current`), unmount guards, and `AbortController` cancellation.
- **`apps/web/src/features/channel/components/ChannelTopicsTab.tsx`:**
  - Replaced heuristic `isSameRun (<1500ms)` timestamp clustering with strict `run_id` equality against `latestRun.run_id`.
  - Unassigned legacy candidates lacking `run_id` are routed to `historyTopics`.
  - Preserved shortage notice display when the latest run is empty due to shortages.
- **`apps/server/test/topicRunIntegrity.test.ts`:**
  - Added test suite asserting:
    - Candidate count=8 with 3 eligible prefix sources evaluates to `can_confirm=false`, `source_capacity=3`, `reason_code: "NO_ELIGIBLE_SOURCES"`.
    - 7 eligible sources fail for count=8; 8 eligible sources pass.
    - Explicit count override in options is respected.
    - Fail-closed behavior on corrupted/invalid newest topic run.
    - Newest run remains authoritative even within 1500ms of older runs.
- **`apps/web/src/features/channel/hooks/useTopicAvailability.test.ts`:**
  - Added regression test for clock skew where request B with earlier `checked_at` succeeds and supersedes prior state based on request sequence.
- **`apps/web/src/features/channel/components/ChannelTopicsTab.test.tsx`:**
  - Created test suite verifying:
    - Strict grouping by `latestRun.run_id`.
    - Empty latest run with shortages renders notice without swallowing history.
    - Legacy candidates without `run_id` are placed in history.
    - Confirmation button disabling when confirmation is pending.
    - Suggest button interaction.

## Verification

- **Server Topic Tests:**
  - Date: 2026-09-09
  - Command: `npx vitest run test/topicAvailabilityRoute.test.ts test/topicRunIntegrity.test.ts test/topicConfirmRoute.test.ts test/topicSourceIntegrity.test.ts` (apps/server)
  - Result: Exit code 0, 4 test files passed, 20/20 tests passed.
- **Web Channel Tests:**
  - Date: 2026-09-09
  - Command: `npx vitest run src/features/channel/hooks/useTopicAvailability.test.ts src/features/channel/components/ChannelTopicsTab.test.tsx src/features/channel/components/TopicCard.test.tsx` (apps/web)
  - Result: Exit code 0, 3 test files passed, 18/18 tests passed.

## Remaining work

None for Phase 5. Ready to proceed to Phase 6 (Acceptance).

## Safety

- Isolated storage used for all test suites (`mkdtemp`).
- No live Question Bank data was migrated, altered, or deleted.
- No non-English write-backs to canonical Question Bank.
- All dirty edits in working copy preserved.
- No git commits, pushes, branches, or worktrees created.
- In-session execution without subagents.
