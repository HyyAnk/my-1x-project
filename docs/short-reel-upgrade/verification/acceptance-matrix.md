# Acceptance Matrix

Every row is initially NOT RUN. During implementation, replace that status with PASS, FAIL, or PENDING and link the exact evidence entry. A PASS requires observed output; a test name alone is not evidence. The owner column identifies the first phase responsible, not permission to skip later regression checks.

| ID  | Owner | Scenario and required assertion                                                                 | Primary test/evidence target                            | Status  |
| --- | ----- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------- |
| C01 | 01    | Old v1 record loads as canonical v2 without writing disk                                        | `shortReelCompatibility`, `shortReelUpgradePersistence` | PASS    |
| C02 | 01    | Legacy hook/description/CTA/tags preserved, merged once, long content retained                  | `shortReelCompatibility`                                | PASS    |
| C03 | 01    | First v2 write produces byte-exact backup; retry/mismatch/interruption safe                     | `shortReelUpgradePersistence`                           | PASS    |
| C04 | 01    | Existing task without mode/progress parses; request defaults preserve semantics                 | `shortReelCompatibility`                                | PASS    |
| C05 | 01    | New LLM payload has only title and description; generation/edit limits differ intentionally     | `shortReelCompatibility`                                | PASS    |
| C06 | 01    | Accepted input fingerprint survives failed regeneration; unknown legacy provenance is not ready | `shortReelCompatibility`                                | PASS    |
| I01 | 02    | Configured Gpti2 request contains actual reference bytes and ratio 9:16                         | `portraitImageClient`                                   | PASS    |
| I02 | 02    | Unsupported reference provider fails preflight, not text-only fallback                          | `portraitImageClient`                                   | PASS    |
| I03 | 02    | Same operation replay uses same key; new regenerate uses new key                                | `portraitImageClient`                                   | PASS    |
| I04 | 02    | Valid portrait normalizes to 1080x1920; landscape/square/incompatible ratio rejected            | `shortReelPortraitImage`                                | PASS    |
| I05 | 02    | Corrupt/oversize/multiframe images rejected before ready acceptance                             | `shortReelPortraitImage`                                | PASS    |
| I06 | 02    | Abort/timeout observes late resolution and does not accept output                               | `portraitImageClient`                                   | PASS    |
| I07 | 02    | New path never invokes Episode lookup/bundle writer                                             | `shortReelImageStorage`, `portraitImageClient`          | PASS    |
| I08 | 02    | Usage accounting uses real reel identity, unknown cost not fabricated                           | `shortReelUsageLedger`                                  | PASS    |
| M01 | 03    | Existing master resolved with no global style anchor and no generation call                     | `shortReelMascotReference`                              | PASS    |
| M02 | 03    | Original mascot/master/global styles remain unchanged                                           | `shortReelMascotReference`, `shortReelStyleImage`       | PASS    |
| M03 | 03    | Missing mascot/master and unsafe reference path produce actionable error                        | `shortReelMascotReference`                              | PASS    |
| S01 | 03    | Script receives source + selected mascot/art direction                                          | `shortReelScriptContext`                                | PASS    |
| S02 | 03    | LLM unavailable/timeout does not produce fake successful baseline script                        | `shortReelScriptContext`                                | PASS    |
| S03 | 03    | Existing three-segment, duration, reveal, source-fidelity validation preserved                  | `shortReelScript`, `shortReelPhase04`                   | PASS    |
| S04 | 03    | Generated style contains exact input master bytes in request, no global anchor required         | `shortReelStyleImage`                                   | PASS    |
| S05 | 03    | Style is a scene reference, not thumbnail text/collage or isolated mascot cutout                | Pure prompt assertions + live visual QA                 | PASS    |
| V01 | 04    | Cover conditions on accepted style bytes and uses script-specific context                       | `shortReelCoverImage`                                   | PASS    |
| V02 | 04    | Cover saved in reel assets, real 1080x1920 PNG                                                  | `shortReelCoverImage`                                   | PASS    |
| V03 | 04    | No automatic answer spoiler demanded in cover hook                                              | Cover prompt tests + visual QA                          | PASS    |
| P01 | 04    | Publishing prompt includes all three accepted script segments                                   | `shortReelPublishingV2`                                 | PASS    |
| P02 | 04    | New title <=80 and description <=600 characters; tags inside description                        | Parser/schema tests                                     | PASS    |
| P03 | 04    | Old localization does not overwrite new LLM result                                              | `shortReelLocalization`, `shortReelPublishingV2`        | PASS    |
| P04 | 04    | Invalid JSON/timeout/cancel preserve previous publishing; bounded correction only               | `shortReelPublishingV2`                                 | PASS    |
| D01 | 05    | References acceptance does not mark script stale                                                | `shortReelDependencyV2`                                 | PASS    |
| D02 | 05    | Script edit invalidates style/cover/publishing and retires old attempts                         | `shortReelDependencyV2`                                 | PASS    |
| D03 | 05    | Cover/publishing sibling completions do not invalidate each other                               | `shortReelWorkflowV2`                                   | PASS    |
| D04 | 05    | Mascot/master/art-direction change invalidates visuals/script and rejects stale image output    | Dependency/workflow tests                               | PASS    |
| D05 | 05    | Model-note/style changes recompile prompts without paid script regeneration                     | Compiler/dependency tests                               | PASS    |
| W01 | 05    | New package: script first; style before cover; publishing independently settles                 | `shortReelWorkflowV2`                                   | PASS    |
| W02 | 05    | Ready package repair makes zero new paid calls                                                  | Planner/workflow tests + live repair                    | PASS    |
| W03 | 05    | Failed style retry reuses ready script; cover waits for successful style                        | `shortReelWorkflowV2`                                   | PASS    |
| W04 | 05    | Failed cover does not discard successful publishing; retry only cover                           | `shortReelWorkflowV2`                                   | PASS    |
| W05 | 05    | Duplicate HTTP request produces one operation; changed mode under same ID is conflict           | Route/runner tests                                      | PASS    |
| W06 | 05    | Cancel propagates to every target and prevents all late acceptance                              | Runner/drain/workflow tests                             | PASS    |
| W07 | 05    | Standalone route has injected real dependencies or explicit unavailable response                | Route generation tests                                  | PASS    |
| W08 | 05    | Progress records accepted revisions only after durable writes                                   | `shortReelRunnerV2`                                     | PASS    |
| U01 | 06    | Exactly Title and Description fields; no separate Hook/CTA/Hashtags inputs                      | `ShortReelStudio.publishing`                            | PASS    |
| U02 | 06    | Mascot master visible before style succeeds; old accepted image retained during retry           | `ShortReelStudio.assets`                                | PASS    |
| U03 | 06    | Intermediate script/style/publishing visible while remaining stages run; no F5                  | Sync tests + browser test                               | PASS    |
| U04 | 06    | Old GET and old task events cannot overwrite newer state or another reel                        | `ShortReelStudio.sync`                                  | PASS    |
| U05 | 06    | Reconnect/visibility/poll recover; timers stop after task ends/unmount                          | `ShortReelStudio.sync`                                  | PASS    |
| U06 | 06    | Dirty drafts survive asset updates, conflicts, failed save and retry                            | Conflict/publishing tests                               | PASS    |
| U07 | 06    | Rapid double click submits once; nonconflicting copy/navigation still work                      | Tasks/browser tests                                     | PASS    |
| U08 | 06    | Parent list/card readiness refreshes when package changes                                       | Channel Short-Reel tests                                | PASS    |
| U09 | 06    | 1440/768/390px layouts, keyboard/touch, reduced motion, one shared footer                       | Browser screenshots + interaction checklist             | PASS    |
| E01 | 07    | ZIP has current script/prompts/master/style/cover and two-field publishing                      | `shortReelExportV2`, `ShortReelStudio.export`           | PASS    |
| E02 | 07    | ZIP checksum, traversal and mixed-revision protection preserved                                 | `shortReelExportV2`, `shortReelPackageRepair`           | PASS    |
| E03 | 07    | Prompt references match exported assets; hashtags not duplicated                                | `shortReelExportV2`, `publishingExport`                 | PASS    |
| R01 | 07    | Restart preserves completed units and does not automatically charge again                       | `shortReelRestartV2`                                    | PASS    |
| R02 | 07    | v1 failed reel repairs without losing old accepted content                                      | `shortReelRestartV2`, `shortReelPackageRepair`          | PASS    |
| R03 | 07    | Storage-root switch/delete/cancel safety remains intact                                         | `shortReelWriterSafety`, `shortReelDrainLifecycle`      | PASS    |
| Q01 | 08    | Full test/typecheck/lint/format/build/audit results recorded                                    | `execution/EVIDENCE.md` EV-08                           | PASS    |
| Q02 | 08    | Existing Episode assets/thumbnails and Mascot behavior regressions excluded                     | Existing regression suites (247 server / 91 web files)  | PASS    |
| Q03 | 08    | Fresh rebuilt runtime verified, not stale reused process                                        | Runtime evidence & Playwright E2E suite                 | PASS    |
| Q04 | 08    | Approved live package visually inspected and exported                                           | Live evidence + budget approval                         | PENDING |

## Evidence format

For each test batch record: date/time, source revision or working-tree identity, exact command, actual exit code, executed test count, passed/failed names, important sanitized output and relevant matrix IDs. For browser evidence add viewport, browser method, screenshot path and observed state. For live evidence add approved target and budget, actual calls, request IDs if safe, dimensions/checksums and whether cost was returned.

No screenshots or provider artifacts have been generated as part of this planning pack.
