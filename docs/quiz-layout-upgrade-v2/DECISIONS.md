# Decision register

| ID  | Decision                                                   | Basis                                                       | Change rule                                                        |
| --- | ---------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------ |
| D01 | Seven landscape layouts; Mystery-only multi-choice removal | User clarification in planning conversation                 | User approval to broaden                                           |
| D02 | Exact +55/+60/+65/+180 image/answer offsets; +40 fact dock | User requirements                                           | User approval to reduce/change                                     |
| D03 | Shared canonical geometry, not scattered CSS offsets       | Repository architecture rules and observed duplication      | Equivalent module seam allowed with record                         |
| D04 | Detached badge heights preserve stacked row envelopes      | Engineering calculation, detailed in GEOMETRY.md            | Record alternatives and verify geometry; no silent drift           |
| D05 | Mystery slot880x500, image880x495, contain16:9             | Calculated fit in920x540 stage                              | Preserve crop-free large viewport unless user approves change      |
| D06 | Mystery uses explicit answer_mode, one choices item        | Existing schemas lack a single-answer discriminator         | Equivalent explicit contract allowed only with full boundary audit |
| D07 | timerHideAt is separate from revealStart                   | Existing timer duration derives from revealStart            | Exact0.5 gap is mandatory                                          |
| D08 | Fact-only38px safe-zone allowance                          | y886+height156=1042                                         | No global safe-zone relaxation                                     |
| D09 | No historical migration or destructive reset               | User says prior output is experimental; no deletion request | Separate authorization required                                    |
| D10 | Ratio selection reuses existing policy                     | Existing policy already implements minimax mismatch         | New algorithm unnecessary                                          |
| D11 | Source hash drift is a reinspection signal                 | Existing worktree is dirty and may change concurrently      | Never use planning hash to overwrite source                        |
| D12 | Required render approval remains explicit                  | Applicable tool/skill workflow                              | Await approval rather than claim completion                        |

## New decisions during implementation

Append, never silently replace:

```text
ID:
Date:
Phase:
Observed issue:
Options considered:
Chosen change:
Affected requirements and files:
Numeric/timing impact:
Tests and evidence:
User approval needed/received:
```
