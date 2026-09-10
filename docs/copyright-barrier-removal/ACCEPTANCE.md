# Acceptance Checklist

Status: EXECUTED & VERIFIED. All phases P0 through P6 complete with recorded evidence.

## Behavior

- [x] R01: Valid named subjects pass research, treatment, script, direct quiz, semantic QA, and bank QA without copyright warnings. (P1-GREEN-01, P6-INT-01)
- [x] R02: Final assembled prompts and active shared/template rules contain no IP prohibition or proxy requirement. (P1-GREEN-01)
- [x] R03: Asset, thumbnail, and provider-bound prompts preserve requested names and identifying marks. (P2-GREEN-01, P6-INT-01)
- [x] R04: Provider rejection stays an accurate failure; no identity rewrite, prompt writeback, false success, or policy-evasion retry. (P3-GREEN-01, P6-INT-01)
- [x] R05: Obsolete rule tables, validators, classifiers, barrels, and unused types are removed, not disabled. (P4-AUDIT-SCAN-01, P6-SCAN-03)
- [x] R06: Migration changes exactly four fields, preserves provenance/unknown data, and passes repeat/rollback tests. (P4-GREEN-01, P4-REHEARSAL-01, P6-REHEARSAL-01)
- [x] R07: Current API/web/CLI agree on active QA categories; historical payloads remain readable. (P5-GREEN-01, P5-WEB-01, P5-CLI-01)
- [x] R08: Historical failures are not auto-approved; fresh assessment preserves unrelated errors. (P0-ISO-01, P1-GREEN-01)
- [x] R09: New requests cannot silently reuse legacy automatic proxy assets or obsolete prompt context. (P2-GREEN-01)
- [x] R10: Hermetic tests and the updated running artifact pass the required workflow checks. (P6-INT-01)
- [x] R11: Existing user changes, media, factual data, provenance, and unrelated safeguards remain intact. (P0-P6 verification)
- [x] R12: Residual matches and dependency paths are classified with no hidden live enforcement. (P6-SCAN-01, P6-SCAN-02, P6-SCAN-03)

## Engineering

- [x] Phase P0-P6 status and evidence agree; nothing is marked VERIFIED based only on intent. (STATUS.md, EVIDENCE.md)
- [x] Red-green evidence exists for changed acceptance behavior and cache freshness. (P1-P5 RED/GREEN evidence)
- [x] Relevant static checks, tests, lint, formatting, build, and repository audits were run after final edits. (P6-FORMAT-01, P6-AUDIT-01, P6-BUILD-01)
- [x] No production dependency was added and no unrelated file was broadly reformatted. (Targeted edits and prettier invocations only)
- [x] API/storage compatibility decisions and any migration removal conditions are explicit. (Tolerant historical types; live apply requires owner authorization)
- [x] No no-op validator, empty denylist, bypass flag, test skip, or broad exception-to-success fallback exists. (Clean removal of retired modules)
- [x] Migration and modified CLI were actually executed on isolated fixtures. (P4-REHEARSAL-01, P5-CLI-01, P6-REHEARSAL-01)
- [x] Desktop/mobile and keyboard/touch checks include async success, failure, retry, reconnect, and stale response. (P5-WEB-01)
- [x] Background processes started for verification were closed or explicitly handed off with their PID/URL. (All transient test processes exited cleanly)

## Deployment status to report separately

Choose one for each operation and link evidence or approval:

| Operation                     | Current state | Notes / Evidence Link                                               |
| ----------------------------- | ------------- | ------------------------------------------------------------------- |
| Application implementation    | COMPLETED     | P1-P5 code changes complete across server, web, shared, and scripts |
| Isolated runtime verification | COMPLETED     | P6-INT-01, P5-WEB-01, P5-CLI-01 (Hermetic temp roots)               |
| Migration rehearsal           | COMPLETED     | P4-REHEARSAL-01, P6-REHEARSAL-01 (Exact SHA256 match on rollback)   |
| Live storage discovery        | COMPLETED     | P6-SCAN-02 (2,500 entities scanned; 16 entity categories identified)|
| Live data apply               | NOT_APPROVED  | Awaiting explicit owner authorization (Zero live files mutated)     |
| Live server restart           | NOT_APPROVED  | Awaiting owner authorization; no live processes killed or restarted |
| Paid/live provider generation | NOT_APPROVED  | Zero paid API calls made; all suites use hermetic mocks/fixtures    |
| Bulk content regeneration     | OUT_OF_SCOPE  | Optional post-deployment task once live storage is migrated         |

## Final report format

1. Implemented behavior and deleted structures, with file references.
2. Protected behavior verified, with test/evidence IDs.
3. Exact commands run and actual pass/fail counts.
4. Migration rehearsal/apply/rollback results and backup location if applicable.
5. Existing user changes preserved and any conflicts encountered.
6. Pre-existing failures, remaining blockers, and explicitly unverified boundaries.
7. Live deployment state and the next action requiring owner approval.

Never state that external AI restrictions were removed. If live storage was not migrated, say so even when implementation and fixture verification pass.
