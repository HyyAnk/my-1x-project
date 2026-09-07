# Cleanup And Retention Policy

## This Folder

Only the user decides when to delete `docs/short-reel-implementation/`. Agents must not delete, move, archive, schedule deletion or add cleanup automation for this folder, even after all tests pass or the user accepts the product. The user explicitly chose to remove it personally after complete acceptance and inspection.

No production code, build command or test fixture may depend on files in this folder. It must be safe for the user to remove later without breaking the application. Durable implementation knowledge belongs in source contracts and ordinary product documentation if separately requested; never migrate/delete this folder automatically to enforce that preference.

## Legacy Test Products

The user permits removal of obsolete development products, not arbitrary directories. Phase 07 may delete only exact items in the reviewed [data manifest](inventory/generated-data-cleanup.md), with identity/containment/protected-reference checks immediately before deletion. No compatibility reader is required.

Never target the repository root, a home directory, the whole channels/assets root, Question Bank, active new Short-Reels or reusable mascot/style assets. Reject symlink/junction escapes and path traversal. Separate deletion of a test Episode from reusable assets it references.

Use one shell end-to-end, native literal-path filesystem operations and a dry-run inventory. Prefer recoverable deletion when available and state whether recovery is possible. Do not invent a broad cleanup command from a glob.

## Completion Record

Phase 07 records each deleted ID/path, reason, protected-data verification, execution result and recovery status. Phase 08 checks that no dangling indexes/routes/task records reference deleted products. A zero-item cleanup is valid only if inventory proves no eligible obsolete products remain, not because inspection was skipped.

## User Acceptance

Technical acceptance and manual Flow acceptance must both be documented. The user alone grants final acceptance; silence, successful tests or agent confidence cannot substitute. Folder deletion remains the user's separate action regardless of acceptance state.
