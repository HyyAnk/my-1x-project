# Phase 08 - Regression, Live Verification and Handoff

## Deliverable

Evidence from tests and the newly started application, followed by one explicitly approved paid smoke test. If live testing lacks authorization or provider access, report the implementation as awaiting live verification, not fully complete.

## Static and regression steps

- [ ] Run the full checks below from the repository root. Record exact commands, exit codes and failure names. Do not use `--update` to overwrite visual snapshots merely to make tests pass.

```powershell
pnpm --filter @studio/shared build
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm build
pnpm run audit
```

- [ ] Run formatting on exact changed files only when needed, then repeat checks. Do not format unrelated user edits.
- [ ] Inspect the final diff for unsafe casts, discarded signals, duplicate business rules, direct Episode persistence, plaintext secrets, broad catch/fallback, unused compatibility wrappers, oversized mixed modules and unexplained disabled tests.
- [ ] Compare new failures against Phase 00 baseline. An existing unrelated failure may be documented, but a changed-path failure must be fixed before handoff.
- [ ] Run the browser suite against fresh server/web processes with temporary storage and mocked providers. Extend `apps/web/test/shortReel.spec.ts` or add `shortReelUpgrade.spec.ts` to cover package, style preview while cover runs, two publishing fields, copy, cancel/retry and ZIP download.

```powershell
pnpm --filter @studio/web exec playwright test test/shortReelUpgrade.spec.ts
```

The command applies after that new test is created; use the existing test path if extending it. Record the chosen exact path. Verify the Playwright config's `reuseExistingServer` cannot attach to an old production process. Do not change live storage to satisfy test setup.

## Runtime and paid smoke gate

- [ ] Identify the process actually serving the UI. Restart/rebuild only the affected application process when authorized. Never stop all Node processes, kill unrelated profile browsers or reuse an old bundle as proof of the new version.
- [ ] Verify the updated UI/API are served by the new process and record its startup time, port and build/source identifier. Existing default ports are hints, not permission to replace whatever is listening there.
- [ ] Ask the user for one disposable target reel or permission to use the existing failing reel, a maximum budget in their preferred unit, and permission for one full package smoke run. Do not invent a monetary estimate or reveal credentials. Offer a temporary test channel/reel if they do not want existing content changed.
- [ ] Print/log the execution plan: one existing mascot read, required LLM script/publishing calls, one style image and one cover image, reference bytes supplied, 9:16 request, target reel, no OS input focus. State that provider retry/correction behavior is bounded and no new run is authorized beyond the agreed budget.
- [ ] Generate the package once. Record safe provider request identifiers, stage start/finish times, accepted revisions and dimensions/checksums. Do not print prompts containing private content unless the user agreed; never print API keys or base64.
- [ ] Confirm the mascot came from the existing master and both generated images visually contain the intended identity/style. Inspect full images, not just thumbnails or their dimensions.
- [ ] Inspect cover readability at a small mobile preview size and confirm the essential focal point/hook is not at the bottom or right edge. Treat safe placement as a design heuristic, not a universal platform guarantee.
- [ ] Confirm publishing describes this script, has a concise hook title, embeds hashtags in description, and does not spoil the quiz answer by default. Do not claim the model analyzed final footage.
- [ ] Copy title and description separately, switch tabs and return, reopen the reel, then download and inspect the exported ZIP. None of these should require F5 to display current results.
- [ ] Call repair on the now-current package and verify no new paid generation is dispatched. Do not spend on extra regeneration tests without remaining explicit budget; use mocked evidence for failure/race paths.
- [ ] Recheck existing Episode asset/thumbnail UI and Mascot Design without triggering new paid generation. Use automated regression evidence for provider request compatibility.
- [ ] Confirm browser verification used Playwright/CDP and did not manipulate OS mouse, keyboard, clipboard or focused windows. Clipboard-copy functionality tests may use mocked browser clipboard APIs; do not drive the user's clipboard to automate unrelated UI.

## Final handoff checklist

- [ ] Populate every acceptance-matrix result with a test/evidence reference or an explicit pending reason.
- [ ] Record changed files, schemas, provider capabilities, known limitations, backup locations and rollback prerequisites.
- [ ] Record any live calls and measured cost when returned by the provider; unknown cost remains unknown.
- [ ] Update `execution/PROGRESS.md` truthfully: complete only when required tests and approved live workflow pass. Otherwise mark the specific live gate pending.
- [ ] Hand back a concise summary plus links to evidence, not a claim based only on code edits.

## Stop conditions

Stop and request direction if the correct fix requires new credentials/provider purchases, unsupported paid API behavior, broad schema changes outside this pack, irreconcilable concurrent user edits, restoring/deleting user data, or exceeding the approved live budget. Continue safe local tests and documentation where possible; do not substitute fake assets for completion.
