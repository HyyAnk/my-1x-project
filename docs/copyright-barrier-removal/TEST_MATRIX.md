# Verification Matrix

All tests default to local fixtures and injected providers. No paid generation, real account mutation, or writes to external channel directories. P0 must establish isolation before a broad test command.

## Identity corpus

Use parameterized tests for `Simba`, `Mufasa`, `lion cub`, `baby lion`, `Spider-Man`, `Iron Man`, `Thor`, `Batman`, `Pikachu`, `Pokemon`, `Pok\u00e9mon`, `Mario`, `Pac-Man`, `Minecraft`, `Elsa`, `Mickey Mouse`, `Darth Vader`, and `Yoda`. The escaped spelling is a Unicode test value in English-language source, not a new language requirement.

Include repeated names, mixed case, punctuation, and names in the middle of longer descriptions. Test a real animal `wolverine` and the mythological subject `Thor` without replacing their factual context. Do not conflate subject-identity preservation with relaxing length, language, or safety rules.

## Cases and ownership

| ID  | Requirements | Test surface                   | Concrete assertion                                                                        |
| --- | ------------ | ------------------------------ | ----------------------------------------------------------------------------------------- |
| G01 | R01          | Auto QA                        | Otherwise valid named candidate is approved                                               |
| G02 | R01          | Semantic QA                    | No copyright blocker or warning in any field                                              |
| G03 | R01          | Research/treatment/script      | Valid IP-containing markdown passes; missing sources/headings/humor marker fails          |
| G04 | R01,R11      | Direct handler                 | Preserves subjects, writes once, invalidates downstream, advances stage after persistence |
| G05 | R10          | Direct handler failure         | Malformed QuizV2/write failure cannot mark QUIZ_READY                                     |
| G06 | R02          | Final generation context       | No global/topic/shared IP ban or proxy instructions                                       |
| G07 | R01,R11      | Negative QA                    | Missing fact lock/source, duplicate, wrong choice ID/count and overlength remain rejected |
| V01 | R03          | Asset compiler                 | Names in subject and final prompt are intact                                              |
| V02 | R03          | Thumbnail compiler             | Names survive 16:9 and 9:16 plus mascot/subject anchors                                   |
| V03 | R03          | Provider-bound payload         | Requested identity and requested identifying mark survive adapter suffixes                |
| V04 | R09          | Fingerprint                    | New version differs from old; same inputs remain deterministic                            |
| V05 | R09          | Asset completeness             | Old fingerprint plus existing valid PNG does not make automatic result current            |
| V06 | R09,R11      | Resolver priority              | Curated/user-selected assets retained; automatic legacy bundles cannot masquerade as new  |
| V07 | R09          | Provider/style variation       | Writer and completeness reader use identical version/provider/style context               |
| V08 | R11          | Asset validation               | Unsafe path and wrong semantic fallback still fail                                        |
| P01 | R04          | Provider rejection             | Actual error, one terminal attempt, no LLM rewrite or prompt persistence                  |
| P02 | R04,R10      | Transient error                | Existing bounded retry policy works without name changes                                  |
| P03 | R04,R10      | Cancellation                   | No late write or success transition after cancellation                                    |
| P04 | R04,R10      | Parallel assets                | Successful siblings retained; no aggregate false completion                               |
| P05 | R04          | Unknown filter reason          | No fabricated legal diagnosis or successful usage record                                  |
| D01 | R06          | Pure transform                 | Only four top-level keys removed; input unchanged; unknown fields retained                |
| D02 | R06          | Dry-run                        | Source bytes/mtime unchanged; counts/hashes are accurate                                  |
| D03 | R06          | Apply/repeat                   | All planned keys removed; repeat changes zero entities                                    |
| D04 | R06,R11      | Rollback                       | Exact original hashes restored                                                            |
| D05 | R06          | Bad JSON/duplicate ID          | No source writes; typed failure                                                           |
| D06 | R06,R11      | Concurrent source edit         | Hash mismatch aborts without overwriting user content                                     |
| D07 | R06          | Partial write/crash            | Journal permits exact recovery; nonzero exit                                              |
| D08 | R06,R11      | Invalid root/junction          | No out-of-root operation                                                                  |
| D09 | R06,R11      | Rollback conflict              | Newer edits preserved; explicit conflict                                                  |
| D10 | R06          | Old/new loader                 | Both shapes load; domain no longer uses policy keys                                       |
| H01 | R08          | Old rejection report           | History visible; only fresh assessment determines new readiness                           |
| H02 | R08          | Mixed historical issues        | Duplicate/schema/quality failures remain after reassessment                               |
| H03 | R08          | Missing rejected output        | No invented candidate or auto-approval                                                    |
| C01 | R07          | Internal batch summary         | Only active counters; totals/candidate arrays agree                                       |
| C02 | R07          | API serialization              | Same endpoint exposes coordinated new contract                                            |
| C03 | R07          | Old payload input              | Extra legacy counter does not crash UI or become active policy                            |
| U01 | R07,R10      | Web success/slow               | Immediate pending, duplicate submit disabled, unrelated controls work                     |
| U02 | R10          | Web failure/retry              | User input retained, loader ends, retry is safe                                           |
| U03 | R10          | Reconnect/out-of-order         | Stale response cannot overwrite new state; no duplicate rows                              |
| U04 | R10          | Empty/partial                  | Clear empty result and partial job state; no false completion                             |
| U05 | R10          | Responsive access              | Desktop/mobile strings, concise controls, keyboard/touch access                           |
| L01 | R07,R10      | Updated batch CLI              | Success/failure on isolated stub API; structured logging and summary                      |
| I01 | R10          | Full local pipeline            | New named-content run persists and reloads through the running app                        |
| I02 | R10,R11      | Short Reel/curated integration | Shared change causes no prompt, export-contract, or provenance regression                 |
| S01 | R05,R12      | Residual scan                  | No live references to retired gates/proxies; all other hits classified                    |

## Test design rules

- Assertions must inspect the saved/resulting content, not merely successful HTTP status.
- At least one name-only failing test must be observed red before removal and green afterward.
- Include property/parameterized coverage of each question field: question, choices, explanation, fun_fact, visual_opportunity, bank visual_spec prompt.
- No `skip`, `todo`, inverted assertion with no positive check, disabled linter, unsafe casts, or unconditional provider mocks that conceal the changed path.
- Use existing fixture helpers where sound; create the P0 helper only for common valid identity cases.
- Fake provider errors must exercise actual error mapping and task status, not just a pure string predicate.
- Negative tests must stay meaningful after retired API removal; move them to live validators.
- Record whether a test was unit, repository/API integration, browser, or live-provider. A mock-provider test is not proof of external service acceptance.

## Full command gate after focused tests

Run from the repository root, stopping to inspect each failure:

```powershell
pnpm typecheck
pnpm test
pnpm lint
pnpm format:check
pnpm build
pnpm run audit
```

Run relevant Playwright tests against an isolated app using the existing test configuration. Inspect its startup/root settings first; `pnpm test:e2e` is not safe by assumption. Record the exact filtered or full invocation and browser version.

Use targeted formatter invocation for touched files; do not run a broad formatter that rewrites user changes or update baselines simply to silence failures. Do not claim completion from typecheck/build alone.
