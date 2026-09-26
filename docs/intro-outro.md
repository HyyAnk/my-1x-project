# Intro and Outro Script Studio

The channel Intro & Outro view supports script projects alongside manually uploaded video pairs. Scripts and uploaded pairs are separate records: approving a script does not generate or attach a video. Existing manual uploads remain valid without a script.

## Workflow

1. Select a style category to see its uploaded pairs and the persistent New Pair card. There are no separate Scripts and Video Pairs views.
2. In Script, press Generate Script or Regenerate. Auto identity defaults to checked whenever the workspace opens. A matching cached mascot-style identity is reused; missing/stale identity is analyzed automatically. Uncheck Auto identity to refresh it for the requested generation. Automatic analysis is saved as ready, not falsely marked as human-reviewed.
3. The background job resolves a random compatible seed matrix, then starts an independent Antigravity Gemini Flash conversation for each requested clip in parallel. Completed clips are saved and displayed while the sibling continues. No AI review or repair loop is added. Failed clips can be retried separately.
4. Intro and Outro display complete editable production prompts with Copy controls. Edits/pasted scripts autosave as plain text independently of structured revisions. Regeneration confirms replacement of manual edits and retains previous text when generation fails. Generated structured revisions remain stored for compatibility and auditing.
5. In Upload, select two 1920x1080 videos and optionally mute each clip. Generation is not required. The server assigns 001, 002, and subsequent numbers within the category and applies Stinger Swipe at 0.5 seconds. Muted files have audio physically removed. Uploaded pairs retain the exact prompt text, and the grid refreshes automatically. A successful upload archives the unchanged workspace and opens a new blank draft.

Legacy project, revision, identity-review, and upload APIs remain compatible. Version checks and idempotency keys protect edits and generation from duplicate or stale requests. A changed mascot reference or style revision invalidates the identity cache and triggers fresh analysis, without a manual review gate. See the [pair workspace implementation plan](intro-outro-pair-workspace-plan.md) for boundaries and recovery behavior.

## Independent single-clip design

The v8 template separates fixed production structure from creative writing:

- Code resolves compatible seed combinations before generation using algorithm 2 and supplies three beat intervals at 0%, 31.25%, 68.75%, and 100% of the requested duration. For 8 seconds: 0–2.5, 2.5–5.5, and 5.5–8, with the last second reserved for a settled hold.
- Each response contains only one clip. Code supplies a common style, music motif and logo placement before dispatch. Each beat has a principal-action category, expression, passive secondary motion and end pose. Code compiles the final stationary gesture; validation requires a separate static camera interval during the one-second final hold. Mascot dialogue uses synchronized lip-sync and finishes before the hold.
- Seed selection excludes high complexity and departure endings, permits at most one medium-complexity seed at 8–10 seconds, and only low-complexity seeds below 8 seconds. Explicit incompatible or unknown selections fail before the script call. Custom farewell seeds must opt into `stationary_ending`.
- New production prompts use the compact compiler; full identity, seed and capability metadata remain in revision JSON. Legacy prompts keep their original compiler. See [quality upgrade](intro-outro-quality-upgrade.md) for boundaries, tests and measured output.
- When retrying or replacing one clip, the existing compatible companion supplies the pair anchor. The other clip is neither regenerated nor overwritten.
- Each clip is parsed, validated and saved independently. Malformed response JSON or a provider failure affects only that request, without additional calls. Retry is explicit and uses a new idempotency key. See [independent generation](intro-outro-independent-generation.md) for concurrency and cancellation behavior.
- Saving an edited revision has no LLM dependency. Approval rechecks local rules against the immutable identity and seed snapshots when available. Legacy revisions remain readable; no AI-review result is fabricated.

Local validation does not prove visual fidelity or creative quality. Users still inspect scripts and produced videos; automated review is not video QA. The existing reviewer implementation remains available for explicit integrations, but this change adds no separate review button or automatic review path.

## Implementation and interaction plan

1. Preserve public generation, revision, approval, export, and job API contracts; introduce internal typed generation input/result contracts and mark new revisions with template v6.
2. Compile one structure/seed prompt, send the images once, assemble fixed fields locally, and validate each clip before persistence. Keep provider I/O separate from deterministic assembly and revision construction.
3. Remove mandatory AI calls from checkpoint and approval; keep snapshot integrity, version checks, validation blockers, and immutable revisions.
4. Keep cancellable background jobs and bounded polling. A submitted job is acknowledged immediately, then reports Writing scripts, Validating scripts, and Saving each clip. Terminal states refresh the workspace without a page reload. No fake percentage or optimistic completion is introduced.
5. Preserve cancellation and concurrent-edit behavior: late provider results are discarded after cancellation; a changed project version retains new revisions in history without replacing the user's draft. Partial success exposes failed clip details and allows selecting only that clip for retry. Existing bounded polling resumes after transient fetch errors.
6. Update UI wording to Save revision and AI review not required. Historical AI findings are shown only when present. Keep essential state visible and existing keyboard/touch controls unchanged.
7. Verify one generation call per successful pair, zero calls on checkpoint/approval, malformed output, independent clip failure, explicit retry, 6/10-second timing, cancellation during generation, concurrent edits, idempotency, batch operation, export snapshots, and legacy review blockers.

The previous successful pair required four application-level AI calls (two writes and two reviews), rising to twelve with repair loops. The new successful pair requires one. This is a call-count reduction, not a measured wall-clock speedup; provider-internal retries and latency are outside this service's control. Job logs record elapsed time and the single-pass call policy for subsequent live measurements.

## Verification commands

- `pnpm --filter @studio/server exec vitest run test/introOutroScriptsApi.test.ts test/introOutroScriptDomain.test.ts test/introOutroStyles.test.ts --testTimeout 40000`
- `pnpm --filter @studio/web exec vitest run src/features/channel/components/introOutroScriptStudio/IntroOutroScriptStudioComponents.test.tsx src/features/channel/components/introOutroScriptStudio/BatchScriptComponents.test.tsx`
- `pnpm --filter @studio/web exec playwright test --config playwright.intro-outro.config.mjs`
- `pnpm --filter @studio/server typecheck` and `pnpm --filter @studio/web typecheck`
- `pnpm --filter @studio/server build`
- From `apps/web`: `node node_modules/vite/bin/vite.js build`

The API suite starts the current application in an isolated temporary workspace and uses a deterministic provider double; it does not spend provider credits or mutate channel data. The browser suite checks the actual revision-actions component at 1440px and 390px, including keyboard selection and horizontal overflow. Live provider latency and creative quality still require production sampling.

## Code boundaries

- [Shared contracts](../packages/shared/src/introOutroScripts/) define projects, revisions, identity, seeds, and jobs.
- [Script services](../apps/server/src/introOutroScripts/) own context resolution, generation, validation, quality review, revisions, and persistent job state.
- [Routes](../apps/server/src/routes/introOutroScripts.ts) expose the workflow; [the browser API](../apps/web/src/api/introOutroScriptApi.ts) and [feature UI](../apps/web/src/features/channel/components/introOutroScriptStudio/) handle interaction and polling.
- [Pair storage](../apps/server/src/repository/introOutroStyles.ts) remains the source of truth for uploaded Intro/Outro videos.

For changes, verify success, validation failure, cancellation, partial generation, stale revisions, and reload/reconnect behavior. Start with [script API tests](../apps/server/test/introOutroScriptsApi.test.ts) and [domain tests](../apps/server/test/introOutroScriptDomain.test.ts); provider-backed generation still requires a live configured service.
