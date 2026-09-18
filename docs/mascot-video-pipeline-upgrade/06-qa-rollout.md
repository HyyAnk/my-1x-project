# QA, Rollout and Verification

## Required gates
- Safe upload path and supported video metadata.
- Complete sequential frame decode.
- Matting success for every frame.
- No hidden RGB under zero alpha.
- Residual background, alpha flicker, holes and unsafe clipping below configured thresholds.
- Common pivot, content bounds and registration stable across the sequence.
- Valid manifest references and fingerprint consistency.
- Loop seam or one-shot completion policy passes.
- Manual review confirms the requested Thinking or Celebrate semantic.

## Rollout
1. Shared contracts and baseline tests.
2. Fixture FFmpeg and matting adapters without a real upload.
3. One source-image download pair.
4. One Thinking and one Celebrate video.
5. Two variants per state with preview/production parity.
6. Ten variants per state for one style.
7. All existing styles and twenty slots per style.
8. Representative quiz render and recovery tests.

## Final checks
pnpm --filter @studio/shared build
pnpm --filter @studio/server typecheck
pnpm --filter @studio/web typecheck
pnpm --filter @studio/server test
pnpm --filter @studio/web test
pnpm lint
pnpm build
