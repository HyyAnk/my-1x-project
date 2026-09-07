# Generated Data Cleanup Manifest

Status: not inventoried. No deletion is authorized by an empty manifest. Phase 01 inventories; Phase 07 refreshes and executes only reviewed exact targets.

## Protected Data

Question Bank records/batches/translations, channel identity/DNA, mascot originals, style references, reusable image assets, new Short-Reel records and unrelated user work are protected. A path beneath a test Episode is not automatically disposable if it holds the only copy of a shared reference.

## Required Item Fields

For each candidate record: ID, content kind, why obsolete, resolved absolute record path, exact dependent artifact paths, ownership evidence, referenced assets, shared-reference checks, current writer/task check, size/count summary, recovery method, reviewer and final disposition.

For execution add: revalidated timestamp, action, success/error, removed count, retained assets and recovery location or explicit irreversible status. Do not store raw credentials, channel secrets or private content in the manifest.

## Safety Algorithm

1. Resolve the record through the repository, not through user-supplied path concatenation.
2. Resolve each physical target and verify containment under the intended product directory after following junction/symlink rules.
3. Reject a broad root or any protected asset referenced by a surviving record. Stop and split the operation if safe selective deletion is unclear.
4. Confirm no active job writes to the target. Produce a dry-run list matching the exact reviewed target set.
5. Delete only those targets with literal paths; record each result. Reconcile indexes/task references through existing repository boundaries.
6. Re-read protected records/assets and compare pre/post identities or hashes. Start the updated app and verify list/detail recovery.

No candidate rows exist yet. A future agent must perform the read-only inventory rather than interpret this file as a cleanup script.
