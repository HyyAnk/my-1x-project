# Phase 6 Layout Selection Interaction Plan

Status: planned; revalidate against the Phase 5 handoff before implementation

## Primary flow

1. User opens the existing layout control in Sandbox or another editable surface.
2. The control shows one current selection and the catalog-backed available layouts.
3. User selects a layout by pointer, touch, or keyboard.
4. Selection is acknowledged immediately in the control and preview enters a compact pending state.
5. A preview request carries the selected layout and current design/content state.
6. The newest confirmed response replaces the preview; no page refresh is required.

Layout descriptions are optional decision support. Keep them out of the always-visible surface; expose them in the opened option surface or an accessible tooltip/popover with focus and touch access.

## State transitions

    idle(current layout)
        → selected locally + preview pending
        → success(new preview confirmed)
        ↘ failure(selection preserved, previous preview marked stale, retry available)

Rapid changes create a new request identity. Abort an obsolete request when practical and always ignore an older response. Retrying uses the latest selected layout and latest content/style state.

## Asynchronous behavior

- Disable only a duplicate submission of the same pending selection.
- Keep unrelated design controls usable.
- Show a compact spinner/pending label for a short preview request; use a skeleton only if the preview surface becomes unavailable.
- Never show a completed new preview before the server response confirms it.
- Preserve the previous preview during failure when useful, but label it stale/failed rather than implying it matches the current selection.
- Handle reconnect, timeout, aborted request, out-of-order response, and repeated response safely.

## Desktop and mobile

- Desktop/tablet: compact select/listbox aligned with existing design controls; option descriptions available on focus/hover/open.
- Mobile: full-width touch-friendly control; descriptions available after opening/tapping; option list remains inside the viewport.
- Keyboard: visible focus, arrow navigation where appropriate, Enter/Space selection, Escape close, and an accessible name.
- Motion: restrained preview transition with equivalent status text and `prefers-reduced-motion` support.

## Copy and control audit

- Use short layout labels and one primary action surface.
- Do not add a subtitle/helper line unless it changes a decision or explains recovery.
- No visible title ends with a period.
- Do not add a button for every layout.
- Verify the exact responsive footer credit required by root `AGENTS.md` appears once through the existing global footer path.

## Verification scenarios

- initial load and current selection;
- each of four layouts;
- slow success;
- empty or missing optional media;
- server validation error;
- retry success;
- rapid A → B → C selection with responses arriving out of order;
- reconnect/timeout where supported;
- keyboard-only use;
- touch/mobile width;
- reduced motion.
