# Confirmed Episodes Card Redesign Handoff Summary

## Status

- Result: completed
- Date: 2026-09-03
- Agent: codex
- Working mode: main-direct
- Baseline before edits: `bfc7aedbae88e7f146655f143896835e6de51ebc`, with six pre-existing render/test/handoff changes
- Claim: `claim-codex-mtkrf5co`

## Source Files Read

- `AGENTS.md`
- `docs/agent-coordination/README.md`
- `docs/agent-coordination/master-spec.md`
- `docs/agent-coordination/phase-roadmap.md`
- `docs/agent-coordination/templates/phase-handoff-summary.md`
- `docs/agent-coordination/handoffs/2026-09-02-prevent-clipped-quiz-answers.md`
- `apps/web/src/features/channel/components/ChannelEpisodesTab.tsx`
- `apps/web/src/features/channel/components/EpisodeCard.tsx`
- `apps/web/src/styles/features/episodes/episodeCards.css`
- `apps/web/src/api/episodeApi.ts`
- `packages/shared/src/schemas/episode.ts`
- `packages/shared/src/events.ts`

## Files Changed

- `apps/web/src/features/channel/components/ChannelEpisodesTab.tsx`
- `apps/web/src/features/channel/components/EpisodeCard.tsx`
- `apps/web/src/features/channel/components/EpisodeCard.test.tsx`
- `apps/web/src/features/channel/utils/episodeCardViewModel.ts`
- `apps/web/src/features/channel/utils/episodeCardViewModel.test.ts`
- `apps/web/src/styles/features/episodes/episodeCards.css`
- `docs/agent-coordination/handoffs/2026-09-03-confirmed-episodes-card-redesign.md`

## Main-Direct Safety

- Confirmed no branch/worktree was created: yes
- Baseline was recorded before edits: yes
- Pre-existing dirty files touched: none

## Scope

- Claimed scope: `web-layout-style`, `web-api-state`, `agent-coordination`
- Allowed scope used: Confirmed Episodes presentation, pure card view-model derivation, focused tests, handoff documentation
- Scope deviations: none

## Decisions

- Decision: Replace the tall information-heavy cards with compact horizontal thumbnail-and-summary cards.
- Reason: Thumbnail visibility, title recognition, one current state, layout, duration, and date are the only information required for scanning.
- Impact: A 1920 px desktop renders five 254 px cards on the first row; a 390 px viewport renders one full-width card without horizontal overflow.
- Decision: Only expose a thumbnail when both the completed video path and a thumbnail path exist; otherwise retain a pure black media area.
- Reason: The black state becomes the requested at-a-glance signal that the episode is not fully built.
- Impact: Generated 16:9 thumbnails are preferred, 9:16 is used as a fallback, and `object-fit: contain` prevents generated artwork from being cropped.
- Decision: Derive one concise status from the latest active task, latest failure, or persisted episode stage.
- Reason: This removes competing stage and asset badges while retaining actionable progress.
- Impact: Active progress messages supersede older stages; untouched selected episodes display `Not started`.
- Decision: Remove decorative eyebrow copy, card numbering, premise, style badge, asset pills, ready banner, and the duplicate open CTA.
- Reason: These elements repeated information or reduced scan speed.
- Impact: The whole card is the accessible open link; delete remains a separate keyboard/touch-accessible icon action.

## Verification

- TDD RED: view-model test failed because `episodeCardViewModel` did not exist; component tests failed because the old card had no thumbnail, placeholder, or link contract.
- Focused tests: 7/7 passed.
- Full web suite: 35 files and 139/139 tests passed.
- Web typecheck: passed.
- Web production build: passed.
- Focused ESLint: passed with zero warnings.
- Focused Prettier check: passed after formatting the two new test files.
- Browser desktop QA at 1920×1080: five cards in the first row, card size 254×126 px, no horizontal overflow, thumbnails use `contain`.
- Browser mobile QA at 390×844: one 352×126 px card per row, no horizontal overflow, 68 px section header, 73×15 px count label, mobile footer credit visible and desktop credit hidden.

## Open Risks

- Risk: The UI renders persisted status and media metadata as provided by the existing API; an older episode can contain a ready video without a thumbnail and will intentionally show a black thumbnail area.
- Suggested next action: Repair or regenerate missing thumbnails from the Episode workspace if older data needs a visual preview.

## Next Phase Input

- Files the next agent must read: this handoff, `EpisodeCard.tsx`, `episodeCardViewModel.ts`, and `episodeCards.css`
- Commands the next agent should run first: `pnpm --filter @studio/web test` and `pnpm --filter @studio/web build`
- Important constraints: keep one visible status per card, preserve the black no-thumbnail state, and retain five cards per desktop row at 1920 px without cropping generated thumbnails
