# Novy and Feli live verification

Date: 2026-09-25. Category: Arcade Pop Master (`preset_arcade_classic`). Actual Antigravity provider calls were used with mascot and logo references. No video generation, upload, deletion, or replacement was performed.

## Results

| Channel | Workspace | Result |
| --- | --- | --- |
| Novy | `ioscript_9daded991a494710` | Intro retained from first request; outro succeeded on an explicit clip-only retry after the fix |
| Feli | `ioscript_4f0fe5abcb564ee5` | Both clips succeeded on the first request, including automatic first-use identity analysis |

- Novy initial job `ioscript_job_4f71dc5aecfa4bc9`: partial after 69.6 seconds. Cached reviewed identity was reused.
- Feli job `ioscript_job_603841a1347e4119`: succeeded after 114.9 seconds, including identity analysis. Saved identity `mascot_identity_cf56e7c63b5f4c6d` has automatic `ready` status.
- Novy outro retry `ioscript_job_8a04e6fa78ad45aa`: succeeded after 60.2 seconds. The existing intro revision was not overwritten.
- Final revisions: Novy `script_intro_4fbf1eeaf58f4809`, `script_outro_a64256a9fc9e48fc`; Feli `script_intro_c403fd4d8a7a4214`, `script_outro_186a30fd00124ca7`.
- All four drafts passed the live validation endpoint. Nonblocking visible-text warnings remain for the official channel name in Novy's intro and Feli's clips; logo fidelity still requires video QA.

## Defect and correction

The initial Novy outro described a small forward step without listing locomotion, although its identity explicitly supported locomotion. Its final three-word line had a 1.4-second interval, 0.025 seconds below the validator's 160-wpm plus 0.3-second allowance.

Generation now normalizes redundant capability metadata using the same action rules as validation, but only adds capabilities already supported by the identity. Voice intervals may extend to their calculated minimum only when space remains before the next line and final hold. Start cues and creative text are preserved. Impossible schedules and unsupported actions still fail validation. Manual edits are not automatically rewritten.

The prompt now recommends a single short line, provides the exact duration formula and examples, and explicitly includes small steps/weight shifts in locomotion metadata. No additional AI review or automatic regeneration loop was added.

## Verification

- 36 relevant domain/API tests passed, including the reproduced 3-word timing defect and negative cases for unsupported movement, overlap, and final-hold overflow.
- Server typecheck/build and scoped ESLint passed. Changed source files were formatted and the diff was checked.
- The development watcher reloaded the changed server before the successful real-provider retry. All four drafts were then validated through the running API.

These timings are individual observed runs, not throughput benchmarks. Successful script validation does not guarantee the fidelity or timing of a downstream generated video.
