# Return Package For Independent Codex Review

Antigravity must create `docs/antigravity-bank-topic-handoff/FINAL-REPORT.md` under a documentation claim at completion.

Required sections:

1. Overall status: complete, partial or blocked; exact baseline/current HEAD and dirty file ownership.
2. Stage checklist: 2B, 3, 4, 5, 6 with links to each handoff and claim/release evidence.
3. Exact modified/new product files grouped by responsibility; identify concurrent changes preserved.
4. Public contract changes: actual exports, schemas, routes, persistence formats, revision/epoch semantics and legacy handling.
5. Review findings: every Stage 2B finding, fix file, regression test and disposition.
6. Verification: commands, exit codes, totals, test storage roots, screenshots and failures/warnings.
7. Live migration: whether applied, manifest/backup paths, exact counts, index byte proof, source semantic proof, drift investigation and rollback instructions.
8. English-only enforcement: every Bank write path and removed translation path; product localization consumer evidence.
9. Remaining risks: no hidden deferred blocker; distinguish provider doubles from paid-provider/Flow acceptance.
10. Reproduction: exact launch/test commands and safe isolated workflow steps.

Also provide a scoped diff artifact or exact reproducible diff commands including untracked files. A clean tracked git diff alone does not include new source files.

Do not include raw lease tokens, credentials, complete user questions or unrelated runtime data in the report.

User return prompt:

> Review docs/antigravity-bank-topic-handoff/FINAL-REPORT.md and all referenced phase handoffs. Independently inspect the actual integrated code, verify English-only Bank and product-only localization, reproduce the critical workflows on isolated storage, and fix any remaining defects under repository claims. Do not assume test totals or Antigravity completion statements prove acceptance.
