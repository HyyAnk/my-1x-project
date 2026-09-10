# Phase 06 - UI and Synchronization

## Files and boundaries

Modify Short-Reel studio components/hooks/CSS, typed API client and channel Short-Reel list projections. Create `ReelAssetCard.tsx`, `ReelGenerationProgress.tsx`, `useShortReelRecordSync.ts`, `utils/publishingText.ts`. Extend existing React tests and add `ShortReelStudio.publishing.test.tsx`, `ShortReelStudio.sync.test.tsx`, `ShortReelStudio.assets.test.tsx`.

Consumes: v2 record, additive input status and task stage progress. Produces: two-field publishing, three clearly identified image cards, immediate state acknowledgment and synchronized accepted output.

## Steps

- [ ] Before JSX changes, write the interaction flow in the test names: submit -> queued -> script accepted -> style accepted -> cover accepted -> ready; individual error -> retry; editing -> remote conflict -> keep/discard; cancellation -> previous output remains visible.
- [ ] Split `ReelAssets` into presentation cards for Mascot Reference, Style Image and Cover Image. Mascot displays existing channel master immediately through the current API; once accepted, use immutable reel reference URL. Do not label existing-master preview as a newly generated style result.
- [ ] Keep the references state as an aggregate, but use task stages to show style pending/failure. No ambiguous `Resolve References` control for paid image generation: use `Generate Style` or `Regenerate Style` based on accepted output.
- [ ] Build Publishing with only `Title` and `Description` text fields. Keep copy buttons for each, one save action, and grouped regeneration. Remove separate Hook/CTA/Hashtags inputs and old clipboard formatter.
- [ ] Implement pure `publishingText.ts` export `formatPublishingText(payload: ReelPublishingPayload): string` returning `TITLE: ...\n\nDESCRIPTION:\n...` for combined copy; do not append hashtags/CTA again.
- [ ] Add fixture-based DOM tests with actual canonical payloads:

```tsx
expect(screen.getByRole("textbox", { name: "Title", exact: true })).toBeVisible();
expect(screen.getByRole("textbox", { name: "Description", exact: true })).toBeVisible();
expect(screen.queryByRole("textbox", { name: "Hashtags", exact: true })).toBeNull();
expect(screen.queryByRole("textbox", { name: "CTA", exact: true })).toBeNull();
```

Use the project's existing assertion setup; if `toBeVisible` is unavailable, use the existing DOM assertion pattern rather than adding a dependency. Render through existing `shortReelStudioTestUtils.tsx` helpers after adapting them to v2.

- [ ] Show the generated-content guidance (80/600) only where a counter meaningfully prevents a mistake. Existing longer migrated text is preserved and editable within storage limits, not silently cut off or blocked from loading.
- [ ] Disable duplicate submission immediately on click, before receiving the HTTP response. Acknowledgment label becomes `Starting` or a pending spinner; failure restores the control and keeps inputs.
- [ ] Keep one Generate Package primary action. Add Regenerate All in the existing secondary-action pattern with cost/replacement confirmation. Prevent it while another operation is active.
- [ ] Preserve previous accepted assets during regeneration with a concise previous-output state. Do not replace an image with an empty placeholder merely because a new attempt is pending.
- [ ] Subscribe to task progress by both channel ID and reel ID. When `record_revision` advances, trigger a coalesced read immediately. Task terminal state always triggers a final reconciliation read.
- [ ] Implement `useShortReelRecordSync` to own in-flight request identity, newest accepted revision and channel+reel selection epoch. Only newer/current responses can update the record; AbortController or sequence guards discard older requests. Do not let an old failed fetch overwrite a later successful ready state.
- [ ] Use bounded fallback polling every 3 seconds only while a task is active and the page is visible. Pause while hidden; refresh immediately on visibility/online/reconnect. Stop timer at terminal status, unmount, target change or cancellation. Do not invent an unbounded background monitor.
- [ ] Deduplicate task updates and coalesce bursts so one accepted unit does not create many concurrent GETs. Out-of-order terminal events from an older task must not clear a newer task's pending state.
- [ ] Refresh list/card readiness through the existing data refresh path when the studio changes; do not require navigation away and back. If no cache exists, call the parent invalidation callback already used by channel data, rather than introducing a global store.
- [ ] Preserve dirty title/description/script drafts. Update safe unrelated asset/progress state while holding a conflict banner for edited fields; do not overwrite user typing on every asset event.
- [ ] Show safe per-unit failure text and retry near the failed unit, not only a transient toast. Explain missing mascot using a link/action to the existing selector/design screen.
- [ ] Confirm the existing shared footer renders once and retain its responsive behavior. Do not edit its established copy in this feature.
- [ ] Audit 1440, 768 and 390 CSS-pixel widths: portrait image fit, no horizontal overflow, reasonable tap targets, keyboard access, disabled/pending labels, no title ending with a period, no redundant subtitles. Respect reduced motion.

## Async test scenarios

Use deferred mocked GET requests and fake timers:

1. GET A starts, GET B returns newer revision, then A returns older revision: B remains displayed.
2. Reel A request resolves after switching to reel B: no A fields/images/task state appear in B.
3. Style accepted event arrives while cover is pending: style preview appears without F5.
4. Task event is missed: polling reconciles accepted output; after terminal state polling stops.
5. User types description while a style event arrives: text remains and image updates.
6. Connection fails, reconnects, then duplicate completion event arrives: one stable final state.
7. Save fails: text preserved; retry submits the intended current revision/request ID policy.
8. Rapid double click on Generate: one HTTP submission; unrelated Copy action remains available.

```powershell
pnpm --filter @studio/web test -- ShortReel
pnpm --filter @studio/web typecheck
pnpm --filter @studio/web build
```

## Exit gate

UI uses exactly two publishing fields, explains image roles and failures, shows intermediate accepted results, protects drafts, and passes race/reconnect/mobile/keyboard checks without manual reload.
