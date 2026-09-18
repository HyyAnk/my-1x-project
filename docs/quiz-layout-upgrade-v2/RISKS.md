# Risks and controls

| Risk                                      | Concrete evidence                                             | Required control                                                                   |
| ----------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Existing dirty worktree                   | Many modified/untracked render, schema and test files         | Capture baseline; preserve unrelated edits; compare before each patch              |
| CSS and geometry disagree                 | Hardcoded 504/510/520 sizes coexist with slot variables       | One shared source; browser-measured border/content boxes                           |
| Blank interval never appears              | Timer duration currently equals revealStart-clipStart         | Add timerHideAt; assert full 0.5-second gap                                        |
| Answer leaks via audio                    | Voice planner always builds :choice                           | Mode-aware planner/compiler; inspect audio events                                  |
| One-answer data rejected later            | Bank minimum 2; Quiz schema exact 3; repository checks format | Wire every boundary, not only sandbox                                              |
| Bad generated choices silently normalized | Batch parser trims/pads choices                               | Strict Mystery parser with actionable failures                                     |
| Wrong answer selected in layout switch    | Some UI paths use choices[0]                                  | Select correct ID/index before single-answer conversion; explicit user action only |
| Cached assets reuse old framing           | Fingerprint lacks geometry                                    | Include geometry/framing revision for new requests                                 |
| Wrong UI ratio                            | Requirements use static catalog metrics                       | Derive from canonical geometry/policy                                              |
| Double-inset Mystery image                | Outer stage + nested hero image styles                        | One 880x500 slot; measured content 880x495                                         |
| Pure badge/fact collision                 | Only 25px rest gap                                            | Motion/shadow envelope QA at peak, not only settled frames                         |
| Fact clipped at bottom                    | New bottom clearance is 38px                                  | Scoped safe-zone exception; <=16px lower effect budget                             |
| Badge taller but text becomes unreadable  | Fixed shorter text surface                                    | Real fit test, bounded font sizes, no truncation                                   |
| Skin restores obsolete geometry           | Variant selectors paint outer cards                           | All-skin regression with geometry invariant                                        |
| Provider ignores ratio                    | Adapter may choose default model dimensions                   | Contract tests plus decoded output validation                                      |
| Background matting changes aspect         | Transparent assets may be trimmed                             | Preserve/restore canvas dimensions                                                 |
| Preview race                              | Compile and font readiness are asynchronous                   | Preserve latestRequestId guard and test reversed completions                       |
| Uniform QA hide masks defect              | Existing overflow/occlusion attributes are broad              | Narrow documented overlap allowances only                                          |
| End-to-end check is skipped               | fastRenderMode can bypass checks                              | Disable bypass in acceptance run; inspect samples >0                               |
| Old experiments fail audit                | No historical migration requested                             | Separate old-data findings; no destructive fixes                                   |
| Screenshot updated without review         | Golden snapshots can bless any output                         | Before/after contact sheet and explicit inspection evidence                        |
| Paid generation or render authority       | Fixtures may use live providers                               | Mock first; ask for new spending/publishing; follow render approval policy         |

Do not "resolve" a risk by reducing a user-approved pixel expansion, hiding an answer, weakening validators or marking skipped checks as passed.
