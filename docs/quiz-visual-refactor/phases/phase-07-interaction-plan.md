# Phase 7 Background Selection Interaction Plan

Status: planned; revalidate against the Phase 6 handoff before implementation

## Primary flow

1. User opens the background control in the existing visual design surface.
2. The compact control shows the resolved current background and available registry variants.
3. User selects a variant by pointer, touch, or keyboard.
4. The selection is acknowledged immediately and preview enters a compact pending state.
5. The newest server-confirmed preview replaces the previous preview without page refresh.
6. Applying or saving a preset retains background selection independently from production layout.

## State transitions

    inherited/explicit idle
        → selected locally + preview pending
        → confirmed preview
        ↘ failure(selection retained, previous preview marked stale, retry available)

The control should distinguish inherited `auto` from an explicit variant only when that distinction helps the user decide or understand later changes. Do not expose internal provenance as decorative microcopy.

## Asynchronous behavior

- Reuse the Phase 6 latest-request-wins mechanism.
- Prevent duplicate submission for the same pending background while leaving layout, palette, and element controls available.
- If palette and background change rapidly, the response is valid only for the newest combined design state.
- Preserve selection and recoverable preset edits on error.
- Retry with the latest complete design state, not the failed request's stale snapshot.
- Show server confirmation before presenting a new preview as complete.

## Desktop, mobile, and accessibility

- Use the existing grouped select/listbox pattern; do not add one primary button per background.
- Keep labels concise; optional motion/performance descriptions belong in the opened option or accessible tooltip/popover.
- Provide visible focus, keyboard navigation, touch-friendly targets, and an accessible name.
- The preview exposes an equivalent status message when motion is reduced.
- Verify option surfaces remain in the viewport at desktop and mobile widths.

## Copy and footer audit

- No visible title ends with a period.
- Do not repeat the selected background name as helper text.
- Explain only non-obvious inherited state or recovery actions.
- Verify the exact responsive footer credit required by root `AGENTS.md` appears once.

## Verification scenarios

- legacy data with no background field;
- inherited `auto`;
- explicit `candy_rays`;
- proof animated variant;
- palette change while background stays selected;
- background change while preview is slow;
- combined rapid palette/layout/background changes with out-of-order responses;
- server error and successful retry;
- keyboard-only and touch use;
- desktop/mobile widths;
- reduced motion.
