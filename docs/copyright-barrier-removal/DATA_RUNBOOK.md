# Data Migration, Refresh, and Rollback Runbook

This document specifies a tool to be implemented in P4. The commands below do not work until that tool exists and its tests pass. Never run migration against an inferred live root.

## Separate data classes

| Class                                             | Required treatment                                                                                    |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Knowledge entity enforcement keys                 | Remove exactly four keys through the reviewed migration                                               |
| Entity names, aliases, visual anchors, facts      | Preserve byte-equivalent values, ordering of arrays, IDs, and relationships                           |
| Curated asset source/license/attribution/variants | Preserve; these are not blockers                                                                      |
| Existing generic visual prose                     | Do not guess a reverse mapping to a character; retain unless owner explicitly requests a content edit |
| Historical failed job/log/report                  | Keep history; produce a fresh assessment only for selected records                                    |
| New active assessment                             | Recompute with surviving checks; do not filter the JSON and call it reassessment                      |
| Old generated image/thumbnail                     | Keep as historical output; do not relabel it as a new identity-preserving result                      |
| Cached/generated prompt                           | Rebuild through the current compiler for a new request; do not execute stale cached policy text       |
| Manually authored or selected asset               | Preserve; no automatic deletion or regeneration                                                       |

## Knowledge migration CLI contract

Entry point: `scripts/migrations/knowledge-policy-removal/cli.ts` using existing `pnpm exec tsx`.

- Default mode is dry-run. Require `--root` naming the exact entities directory and `--plan` naming a new plan-output file.
- `--apply --plan <path> --backup-root <path>` executes that reviewed plan. Root comes from the plan, and all hashes are rechecked; do not silently re-plan.
- `--rollback <journal-path>` restores exact backed-up files subject to conflict checks.
- `--debug` enables additional context; no normal debug flood. `--help` performs no writes.
- Reject unknown or conflicting arguments. Never default `--root` to cwd, a home directory, or the whole repository.

## Root and file safety

1. Resolve absolute canonical root, plan path, and backup root. Check the root exists, is the intended entities directory, and is not a drive root, home directory, or workspace root.
2. Enumerate only immediate `*.json` entity files. No recursive traversal. Reject symbolic links, junctions, and reparse-point escapes for the root, parents, and target files. Check every canonical target remains within the approved root.
3. Parse every file before changing any. Require an array of valid entity records, stable nonempty IDs, and no duplicate IDs across the selected dataset. Do not silently skip parse failures like the runtime loader can.
4. Compute raw-file SHA-256 before transform. Transform only top-level enforcement keys. Preserve all unknown keys. For unchanged files, do not rewrite bytes or timestamps.
5. Record planned hashes, file/entity/field counts, and canonical root. Dry-run must not mutate source files. It may create the explicitly requested plan file, never overwrite an existing plan silently.
6. Before apply, require the operator to stop only jobs writing this exact root. Acquire an exclusive migration lock and reject a concurrent invocation. Handle stale locks through explicit inspection, never silent lock deletion.
7. Verify every source hash matches the plan. Back up raw bytes for all changed files to a new backup transaction directory, verify hashes, and durably save the journal before the first source write.
8. For each file, recheck its hash, write a sibling temporary file, flush, and atomically rename over the exact original. A failed atomic replace must not fall back to deleting the original first. Abort safely on Windows sharing violations.
9. Update journal state after each atomic operation. A failure after one file means PARTIAL, nonzero exit, and a recoverable journal; never claim a cross-file atomic transaction.
10. Re-read transformed files and verify after hashes and invariant counts. Record final totals. Release only the tool's own lock. Retain backups and journal; no automatic backup cleanup.

## Rehearsal commands

Execute from the repository root after P4 creates the synthetic fixture. These commands create a test-owned directory, not a live-data destination, and copy a reviewed non-production fixture containing policy keys.

```powershell
$rehearsalRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("knowledge-policy-rehearsal-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path (Join-Path $rehearsalRoot "entities")
$entityRoot = Join-Path $rehearsalRoot "entities"
$planPath = Join-Path $rehearsalRoot "plan.json"
$backupRoot = Join-Path $rehearsalRoot "backups"
Copy-Item -LiteralPath apps/server/test/fixtures/knowledge-policy-removal/entities.json -Destination (Join-Path $entityRoot "entities.json")
pnpm exec tsx scripts/migrations/knowledge-policy-removal/cli.ts --root $entityRoot --plan $planPath
pnpm exec tsx scripts/migrations/knowledge-policy-removal/cli.ts --apply --plan $planPath --backup-root $backupRoot
pnpm exec tsx scripts/migrations/knowledge-policy-removal/cli.ts --root $entityRoot --plan (Join-Path $rehearsalRoot "second-plan.json")
```

The CLI must print the exact journal path it creates. Use that returned path for `--rollback`; do not guess it. The second plan must report zero changed entities. After rollback every original file hash must match, including whitespace, line endings, and Unicode bytes. A separate automated integration test must exercise this full command sequence without human setup.

## Rollback contract

For each journal entry, compare the current source hash with both original and migrated hashes. If it is already original, leave it untouched. If it equals migrated, restore the verified backup atomically. If it is neither, report ROLLBACK_CONFLICT and stop without overwriting newer user edits. Do not trust the journal's last status alone: a crash can happen between replacing a file and updating the journal.

Validate backup paths and hashes as strictly as source paths. Restore only journal-listed files. Never recursively move/delete a repository or root. A partial rollback remains explicitly partial and recoverable.

## Live rollout approval

Before applying outside a synthetic test root, present:

- Canonical entities root and all exact file paths.
- Dry-run changed-file/entity/field counts and hash summary.
- Backup destination, storage space check, and rollback journal strategy.
- Jobs/processes that may write the root and the specific proposed pause/restart.
- Confirmation that names, visual content, assets, provenance, and historical job status are not being rewritten.

Only explicit approval of those targets authorizes apply. The planning snapshot of 97 tagged entities is not approval and must not be hard-coded into the script.

## Runtime refresh after approved apply

1. Stop or drain affected writers before applying; do not kill unrelated node processes.
2. Deploy current code and prompt rules together. Clear only the knowledge cache through `clearKnowledgeBaseCache()` in the application/test lifecycle, or restart the approved server process. Do not create an unauthenticated cache-reset API.
3. Confirm entity counts and IDs match pre-migration data. Old extra keys remain tolerated if another storage root has not migrated, but no runtime logic may consume them as policy.
4. New requests use current prompt rules. If task/thread context stores old rules, use the existing fresh-context mechanism for new runs; do not silently modify another running task.
5. Reassess selected historical records through existing workflows. A failed generation with no persisted candidate cannot be “approved”; it requires a new user-initiated generation, potentially with cost.
6. Existing QA/artifact freshness must cause fresh assessment before a new production-readiness decision. Preserve old logs and last successful outputs. Do not hide unrelated errors or rewrite historical timestamps.
7. Any content regeneration is separate, explicit, and bounded. No F5-only synchronization: reuse current record invalidation/event refresh mechanisms.

## Code rollback

Use task-owned reviewed commits only when such commits exist, or restore from the reviewed task-specific patch with conflict checks. Never use `git reset --hard`, `git clean`, or whole-file restoration over mixed user changes. Restoring code and restoring metadata are separate operations; verify both the new and rolled-back reader tolerate the other data shape before rollout.
