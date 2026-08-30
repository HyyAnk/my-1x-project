# ADR-003: Enforce CSS Ownership Boundaries

Status: Accepted

## Context

Current layout modules set Answer Card padding, border width, badge geometry, and tier font sizes. Variant CSS sometimes uses important declarations to regain control. Typography rules are repeated across base, layout, mascot, and visual-choice selectors.

Custom properties alone do not solve coupling unless each layer has defined ownership.

## Decision

Adopt these ownership boundaries:

- Layout CSS: grid/flex placement, outer dimensions, gaps, aspect-ratio adaptation, and capacity tokens.
- Base component CSS: stable internal structure and lifecycle states.
- Skin CSS: color, border appearance, shadow, texture, decorative layers, and theme-specific motion.
- Typography CSS: shared tier selectors consuming layout-provided tokens.
- State CSS: correct, incorrect, entering, pending, and reveal behavior shared across skins unless an extension is explicit.

Use a stable outer choice slot so skin borders and decorations do not change the layout budget. Avoid important declarations in normal skin composition.

## Consequences

- New layouts can change capacity without knowing skin selectors.
- New skins can decorate within an explicit box contract.
- Existing CSS migration must be incremental and visually verified at both aspect ratios.
- Layout modules can be audited for forbidden skin selectors and decorative properties.

## Phase impact

Phase 1 records existing selector and token behavior. Phase 5 owns the architectural migration.
