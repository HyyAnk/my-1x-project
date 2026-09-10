# P5 - Contracts, UI, CLI, and Active Documentation

## Files and interfaces

- Modify `apps/server/src/quiz/bank/questionBankAutoQa.ts` and `batch/batchChunkScheduler.ts`.
- Verify `questionBankBatchService.ts` and `apps/server/src/routes/questionBank/` response consumers.
- Modify `apps/web/src/features/questionBank/types/questionBankUi.types.ts`, `questionBankUi.test.tsx`, and `apps/web/src/i18n/locales/en/questionBank.ts`.
- Modify `scripts/generate-question-bank-batch.mjs`; reuse a suitable existing logger or add `scripts/lib/terminalLogger.mjs` without dependencies.
- Update `docs/quiz-engine-v2.md`; only remove obsolete lint suppression entries for deleted modules.
- Keep API endpoints, other counters, UI language, and existing refresh/event ownership.

## Steps

- [ ] Search for all report producers/consumers including persisted task outputs and user scripts:

```powershell
rg -n "copyrightRejections|qaSummary|AutoQaIssue|BatchAutoQaReport" apps packages scripts
```

Record whether any external consumer is known. If response compatibility cannot be verified, obtain a rollout decision before deleting a public field used by that consumer. Do not silently ship a breaking response to an identified external client.

- [ ] Add red tests asserting that fresh batches expose only active categories:

```typescript
const report = runBatchAutoQa([makeAuthorizedBankQuestion("Pikachu")]);
expect(report.passedCount).toBe(1);
expect(report.rejectedCount).toBe(0);
expect(report.summary).toEqual({
  duplicateRejections: 0,
  schemaRejections: 0,
  qualityRejections: 0,
});
expect(Object.hasOwn(report.summary, "copyrightRejections")).toBe(false);
```

Place this in `questionBankAutoQa.test.ts` with imports from the existing Auto QA module and P0 fixture helper. Test route output separately through the existing Fastify injection fixture; an internal report test alone does not prove the public response.

- [ ] Update the active `AutoQaIssue.type` union to `"duplicate" | "schema" | "quality"`. Remove `copyrightRejections` from `BatchAutoQaReport.summary`, its initialization, rejection counting, scheduler initialization, and aggregation. Preserve `passedCount`, `rejectedCount`, candidate arrays, and totals.
- [ ] Update web types and fixtures in the same phase. A historical payload with `copyrightRejections` must still load if it appears in persisted history; tolerate the extra field at the input boundary, do not map it into “quality” or make it active. Keep historical raw logs immutable. Avoid adding a new shared contract layer unless an existing shared contract is already the source of truth.
- [ ] Replace obsolete visible explanatory copy only where it remains useful:

```text
Checks question quality, duplicate content, and schema validity.
```

If a description merely repeats the visible controls, remove it instead. Do not add a replacement copyright badge, tooltip, toggle, or acknowledgment form.

- [ ] Add or extend web tests for immediate pending state, duplicate-submit prevention, successful list/count refresh, failure with retained input, retry, and stale-response ordering. Use controlled promises; do not use fixed delays to “make async tests pass.” Exercise desktop and mobile behavior with keyboard/touch-accessible recovery controls.
- [ ] Remove the CLI copyright category and log lines. Modified CLI normal logging must use a helper with timestamp, readable level, step, and applicable worker/profile context. Suggested zero-dependency interface:

```javascript
const STYLES = { INFO: 36, STEP: "1;34", OK: 32, WARN: 33, ERROR: "1;31", DEBUG: 2 };
const PROFILE_STYLES = [36, 32, 33, 35, 34, 96, 92, 93, 95, 94];

/** @typedef {{ step: string, workerId?: string, profileId?: string, wallet?: string }} LogContext */
/** @param {keyof typeof STYLES} level
 * @param {string} message
 * @param {LogContext} context */
export function log(level, message, context) {
  if (level === "DEBUG" && !process.argv.includes("--debug")) return;
  const stream = level === "ERROR" ? process.stderr : process.stdout;
  const color = Boolean(stream.isTTY) && process.env.NO_COLOR === undefined;
  const style = (value, code) => (color ? `\u001b[${code}m${value}\u001b[0m` : value);
  const parts = [style(new Date().toISOString(), 2), style(`[${level}]`, STYLES[level])];
  if (context.workerId) parts.push(style(`[T:${context.workerId}]`, 2));
  if (context.profileId) {
    const hash = [...context.profileId].reduce((total, char) => total + char.charCodeAt(0), 0);
    parts.push(style(`[P:${context.profileId}]`, PROFILE_STYLES[hash % PROFILE_STYLES.length]));
  }
  if (context.wallet) {
    const wallet = context.wallet.length > 12 ? `${context.wallet.slice(0, 6)}...${context.wallet.slice(-4)}` : context.wallet;
    parts.push(style(`[W:${wallet}]`, 95));
  }
  parts.push(style(`[STEP:${context.step}]`, "1;34"), message.replace(/[\r\n]+/g, " "));
  stream.write(`${parts.join(" ")}\n`);
}
```

Reuse an existing fitting helper instead of copying this if possible. One write per line, ISO timestamps, mandatory labels, TTY detection, and `NO_COLOR` fallback are required. Add a startup summary with non-secret configuration, execution mode, profile count, concurrency, and method, plus a final total/success/failed/skipped/retries/elapsed summary. For this HTTP CLI, method is `HTTP API`, concurrency is the actual configured value, and absent profiles are reported as zero, not invented. Keep profile colors stable; reuse colors only when necessary while retaining labels. The CLI is single-process; do not add concurrency infrastructure. Do not log secrets or entire config objects.

- [ ] If adding that helper, test formatted lines and non-TTY output with injected/captured output streams. Run the modified batch CLI against an isolated stub API/candidate fixture, including one failure; do not invoke live generation just to prove logging. Record exact invocation and output.
- [ ] Update active architecture docs and remove only obsolete suppression entries. Do not rewrite historical evidence documents or the license file.
- [ ] Run checks:

```powershell
pnpm --filter @studio/server test test/questionBankAutoQa.test.ts test/questionBankRoute.test.ts
pnpm --filter @studio/web test src/features/questionBank/questionBankUi.test.tsx
pnpm typecheck
```

## Gate

All current in-repository producers and consumers agree on the new summary. New UI/CLI output does not advertise copyright filtering; old payloads remain readable. UI mutations acknowledge progress and synchronize affected views without F5. The updated CLI has actually been run safely.
