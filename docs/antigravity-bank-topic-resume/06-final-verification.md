# Work 5: Final Acceptance And Return To Codex

Do not reuse old acceptance totals. Test the current combined code after claims settle.

- [ ] Read every new work handoff and actual scoped diffs, including untracked files.
- [ ] Resolve all findings in this package. No missing translation provider, unused localized artifact, Bank translation writeback, unbound fallback, mixed snapshots or incomplete publication.
- [ ] Check test isolation before suites. Use explicit temporary storage and provider doubles. Do not rerun live migration or overwrite production artifacts.
- [ ] Run pnpm lint, pnpm format:check, pnpm typecheck, pnpm test, pnpm build, pnpm test:e2e, pnpm test:visual, zone validation and git diff --check. Inspect actual package scripts; record exact commands/exit codes.
- [ ] Diagnose previous quizV2Route EBUSY cleanup: close app/tasks/child processes before removal; use bounded cleanup retries without hiding failures.
- [ ] Run rebuilt HTTP/storage/browser workflows for en/de/fr Episode and Short-Reel, empty/partial inventory, source changes, duplicate/concurrent/restart confirmation and retry.
- [ ] Validate localized strings reach actual render/Flow/thumbnail/description outputs while English source/script/UI remain unchanged.
- [ ] Verify live Bank read-only against known applied manifest only if necessary. Report actual counts/backup/index evidence, never knowledge_base entity counts as Bank questions.
- [ ] Check all work claims released and verification current; no token in files.
- [ ] Do not claim human video/Flow/provider-quality acceptance from mocked tests.

Create `docs/antigravity-bank-topic-resume/FINAL-REPORT.md` under an exact claim containing:

1. Completed/pending status per work item with handoff links.
2. Actual files/contracts changed and current HEAD/dirty ownership.
3. Each defect -> fix -> regression test evidence.
4. Commands, exits, screenshots, runtime reproduction and isolated roots.
5. Live Bank status (read-only; no new migration unless separately authorized).
6. Any remaining risks/blockers and no hidden deferred work.
7. Exact scoped diff commands including untracked additions.
8. Verified/released claims and safe launch instructions.

Return prompt for Codex:

> Review docs/antigravity-bank-topic-resume/FINAL-REPORT.md and referenced handoffs. Inspect actual code, reproduce en/de/fr Episode and Short-Reel workflows on isolated storage, verify English-only Bank/product-only localization, concurrency/retry/empty-run behavior, and fix remaining defects under claims. Do not trust completion statements or test totals without reproduction.
