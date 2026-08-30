# ADR-001: Separate Production Layout from Visual Presets

Status: Accepted

## Context

VisualPresetItem bundles theme, palette, and element styles. Older custom preset data may contain layout_id, while current built-in presets use preview_layout_id as a Sandbox showcase. Production layout is selected per question from Director semantics and question format.

Coupling production layout to a style preset would make content compatibility depend on a decorative selection. A visual preset could then force a visual-only layout onto a two-choice or text-media question.

## Decision

Visual presets do not determine production layout.

- Production layout remains a per-question semantic decision.
- preview_layout_id may select a representative Sandbox composition.
- layout_id remains a legacy custom-preset field only while backward compatibility requires it.
- Future compatibility logic evaluates a selected skin/preset against the resolved layout rather than replacing the layout silently.

## Consequences

- A preset can apply consistently across several compatible layouts.
- The Director/layout resolver remains responsible for question composition.
- UI must explain that preview layout is representative rather than an episode-wide production override.
- Legacy preset migration needs an explicit removal condition for layout_id.

## Phase impact

Phase 1 records current behavior. Later phases preserve this boundary while centralizing style resolution.
