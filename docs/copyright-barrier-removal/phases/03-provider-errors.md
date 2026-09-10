# P3 - Provider Errors Without Identity Rewrite

## Files and interfaces

- Modify: `apps/server/src/tasks/imageRunner.ts`, `apps/server/src/quiz/assets/resolvers/providerAssetResolver.ts`.
- Modify only the relevant responsibility: `apps/server/src/utils/promptSanitizer.ts`.
- Inspect: provider adapters/chains and Short Reel consumers listed in the inventory.
- Create: `apps/server/test/authorizedContentProviderErrors.test.ts`.
- Retain provider generation signatures, task cancellation, usage recording, and genuine transient-error handling.
- Do not create a new provider client or change provider order to work around content rejection.

## Steps

- [ ] Add tests at the existing two public workflows, using typed mocks/spies already used by image/provider tests. Inject a provider error with code `IMAGE_CONTENT_FILTER_REJECTED` and original prompt `Simba standing on a bright rock`.
- [ ] Assert the observable rejection contract below for each workflow. Here `generate` is the provider spy, `rewrite` is the existing LLM rewrite spy, `saveEpisodeFile` is the repository spy, and `run` is the existing workflow invoked with the fixture runtime; bind them in the test's existing typed setup, not as production globals.

```typescript
const rejection = new Error("Prompt rejected by content filter");
generate.mockRejectedValue(rejection);
await expect(run()).rejects.toBe(rejection);
expect(generate).toHaveBeenCalledTimes(1);
expect(rewrite).not.toHaveBeenCalled();
expect(saveEpisodeFile).not.toHaveBeenCalledWith(expect.anything(), expect.anything(), "visual_bible.md", expect.anything());
```

Once the rewrite export is removed, replace its spy with a “no LLM request” assertion on the actual client boundary. Keep the provider exception assertion; do not test only that a helper is absent.

- [ ] Run red:

```powershell
pnpm --filter @studio/server test test/authorizedContentProviderErrors.test.ts
```

Expected: current recovery attempts to call the rewriter, retries, or changes/persists the original prompt instead of reporting the terminal rejection.

- [ ] Remove automatic rephrase and visual-bible writeback branches triggered by provider content-filter errors. At the catch boundary, retain cancellation first, then explicitly terminate a content-filter rejection before generic retries:

```typescript
if (isContentFilterError(err)) {
  throw err;
}
```

This is not a global “never retry” rule. Existing configured retries for transport errors, service unavailability, or rate limits remain bounded. Preserve context-rich logs and existing provider exception translation; do not expose credentials in error messages.

- [ ] Remove obsolete imports and progress text such as “Auto-rephrasing” when the corresponding operation no longer runs. Keep meaningful generating/failed/retry/cancelled states. Do not reset a job's progress backwards to simulate retry progress.
- [ ] Audit `sanitizeImagePromptWithLLM` callers across the repository. If these are its only live callers, remove that now-unused function and its copyright rewrite prompt. Keep `executeSinglePromptText`, `compactImagePrompt`, `isContentFilterError`, `extractFilterReason`, and separately used non-IP transformations. If another active caller exists, first remove copyright rewriting there and document the call path. No obsolete rewrite instructions may remain dormant.
- [ ] Inspect provider chains for terminal content rejection being converted into a fallback placeholder or another automatic policy-evasion attempt. Preserve existing routing for ordinary availability failures, but a content-filter failure must remain an error. Fix only the error-propagation seam and test it.
- [ ] Add the following boundary cases with fake timers/controlled promises and no live provider calls:

| Case                                   | Required assertion                                                                     |
| -------------------------------------- | -------------------------------------------------------------------------------------- |
| First-call success                     | Original subject in provider payload; one saved asset; one success usage event         |
| Terminal filter rejection              | One attempt; no rewrite; no changed prompt persisted; no successful asset/usage record |
| Timeout/transient failure then success | Existing bounded retry count respected; original identity unchanged                    |
| Cancellation during request/backoff    | No later retry, save, or success event                                                 |
| Late success after cancellation        | Existing lifecycle guard prevents completion from overwriting cancelled state          |
| Partial parallel assets                | Successful siblings retained; rejected item failed; no all-complete marker             |
| Unknown provider category              | Preserve actual error; no invented copyright accusation                                |

- [ ] Run green with relevant tests:

```powershell
pnpm --filter @studio/server test test/authorizedContentProviderErrors.test.ts test/promptSanitizer.test.ts test/gpti2Image.test.ts test/shopAiKeyImage.test.ts test/shortReelWorkflowV2.test.ts
pnpm --filter @studio/server typecheck
```

## Gate

The provider receives the intended identity, and rejection does not cause silent IP substitution, persistence of a rewritten subject, fake success, or unbounded retries. Non-IP validation and transient-error recovery still behave as before.
