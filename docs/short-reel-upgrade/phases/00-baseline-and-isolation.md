# Phase 00 - Baseline and Isolation

## Deliverable

A verified workspace/test baseline and explicit ownership boundary. No production behavior changes in this phase.

## Steps

- [x] Read all applicable `AGENTS.md` files and the pack's first four documents.
- [x] Record `git status --short`, `git branch --show-current`, `git rev-parse --show-toplevel`, Node version and pnpm version. Do not print `.env` or image credentials.
- [x] Verify whether the checkout is already a worktree with `git rev-parse --git-dir` and `git rev-parse --git-common-dir`. Use the user's selected checkout or an authorized isolated worktree; never silently omit required uncommitted changes by checking out an older branch.
- [x] Inventory user changes in `execution/EVIDENCE.md`. At preparation time the dirty files included `resolveQuizAssets.ts`, `knowledgeBase.types.ts`, `episodeCopyrightRemediation.test.ts`, new curated asset modules/tests, and image/scraping files. Reinspect rather than assuming this list is complete.
- [x] Run CodeGraph queries for `generateFullReelPackage`, `runShortReelTask`, `generateReelCoverImage`, `applyShortReelEdit`, `generateThumbnailVariant` and `generateAssetWithProvider`. Record any source-map changes.
- [x] Read `.quiz-studio/storage.local.json` only to identify live storage. Never use that directory as a fixture root or change this configuration during tests.
- [x] Inspect `apps/web/playwright.config.ts` and test fixtures. Determine how to start a server against temporary storage without changing live settings. If no override exists, add a narrowly scoped test harness configuration in the phase that needs it; do not run end-to-end tests against production data.
- [x] Run baseline commands below; capture failures with exact test names. Missing dependencies or unrelated failures are not a pass.

```powershell
pnpm --version
node --version
pnpm --filter @studio/shared build
pnpm --filter @studio/shared test -- shortReel
pnpm --filter @studio/server test -- shortReel
pnpm --filter @studio/server test -- thumbnail
pnpm --filter @studio/web test -- ShortReel
pnpm typecheck
```

- [x] Confirm the Vitest file filters actually executed tests. Zero tests is not a successful gate.
- [x] Record baseline findings and do not run broad formatter autofix on the dirty tree.
- [x] Reproduce the storage mismatch only in a fixture. The test seed below belongs to new `apps/server/test/shortReelImageStorage.test.ts`; at baseline it documents the forbidden old seam, and Phase 02 adds the positive no-Episode path test.

```ts
it("does not mistake a reel for an episode", async () => {
  const f = await packageFixture();
  try {
    await expect(f.repo.getBundleImagePath(f.key.channel_id, f.key.reel_id, 1, 1)).rejects.toMatchObject({ code: "EPISODE_NOT_FOUND" });
  } finally {
    await f.cleanup();
  }
});
```

Import `it`, `expect` from Vitest and `packageFixture` from `./helpers/shortReelPackageFixture.js`. This characterization test is expected to pass even before the repair; the positive generation regression must fail before implementation.

## Exit gate

The workspace, test storage and unrelated changes are documented; baseline commands have real results; no external images were generated. Proceed to Phase 01.
