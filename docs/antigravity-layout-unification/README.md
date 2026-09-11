# Quiz Layout Unification Handoff

Prepared: 2026-09-11

Status: implementation proposal, not an implemented renderer change. The owner requested this packet for execution by Antigravity. Sending the included kickoff prompt approves execution of this proposal; any material deviation requires the owner's decision.

## Read order

1. [Design contract](01-design-contract.md)
2. [Exact layout geometry](02-layout-geometry.md)
3. [Architecture and source map](03-architecture.md)
4. [Implementation plan](04-implementation-plan.md)
5. [Acceptance and verification](05-acceptance.md)
6. [Kickoff prompt](06-antigravity-prompt.md)

Machine-readable source of proposed coordinates: [layout-targets.json](layout-targets.json). Generated drawings in `wireframes/` illustrate geometry only, not a new visual theme. `evidence/` contains measurements and 16 screenshots of the current sandbox renderer, not proposed output or production certification.

## Decision summary

- One fixed shell across all eight active 16:9 quiz layouts.
- Fixed roles: Counter Badge, Question Card, Thinking Bar, channel brand mark with YouTube icon, Fact Card.
- Preserve the current Counter Badge and brand mark component sizing; use the Media Left Question Card at 1420 x 168 as the shared reference.
- Move the Media Left Thinking Bar down exactly 60 canvas pixels: `(470, 822, 1240, 84)` becomes `(470, 882, 1240, 84)`.
- Place Fact Card at `(470, 846, 1240, 156)`, centered on the same lower dock at `(1090, 924)`.
- Each layout owns only the media/answer arena. Keep palette, skins, assets, question order, correctness, and timing semantics.
- Fixed means invariant anchors across layouts and phases, not simultaneous visibility of all five roles.
- Keep the left brand/mascot rail reserved even when mascot or branding is absent. This explicitly supersedes the earlier suggestion to recenter content when mascot is absent.

## Scope boundaries

Only the eight active landscape quiz layouts are migration targets. `baseline` is a preview compatibility path; keep it working without promoting it to a ninth production layout. Portrait/Short Reel, intro, outro, transitions, UI redesign, audio, assets, and catalog activation are out of scope.

Existing unrelated working-tree changes must remain untouched. Do not reset, broadly stage, commit, or upgrade dependencies as part of this handoff without a separate request. All new files, comments, fixtures, and visible text must be English. These are video-layout documents; do not add a website footer to video frames.

## Reproduce evidence

From the repository root:

```powershell
node --import tsx docs/antigravity-layout-unification/tools/measure-layouts.ts
node docs/antigravity-layout-unification/tools/build-wireframes.mjs
```

The first command uses headless Playwright and inlines installed fonts. No OS mouse, keyboard, clipboard, remote API, asset generation, or production data mutation is involved. It overwrites only generated evidence in this packet; preserve the original evidence elsewhere before using it for before/after comparison. The second command validates the proposal rectangles and rebuilds the SVG drawings.

## Evidence limits

The current measurements use sandbox snapshot phases, CSS animations paused at local 2 seconds, default built-in skins, and no mascot. Question rectangles include the existing approximately -2.456 px float transform; the proposed question anchor is the unanimated y=53, not y=50.544. Production timeline, mascot bounds, all skin variants, and real episode media must be verified during implementation. Passing the packet's geometry check is not proof that the future renderer is correct or visually approved.
