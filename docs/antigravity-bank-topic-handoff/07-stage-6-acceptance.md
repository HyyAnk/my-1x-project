# Stage 6 Integrated Acceptance Plan

Acceptance uses temporary isolated storage and provider doubles. Real paid provider quality, video publication and manual Flow are not implied.

## Required checks

Confirm commands against current package scripts, then record command, exit code, revision/fingerprint and actual result:

```powershell
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
pnpm test:visual
node scripts/agent-validate-zones.mjs --json
git diff --check
```

Explicitly execute shared hash/binding tests and affected server/web tests if workspace scripts omit them. Do not edit unrelated files to hide pre-existing failures; report baseline versus new failures separately.

## Acceptance matrix

- [ ] Full/partial/empty source-backed Topic generation through actual HTTP/task/storage.
- [ ] Incomplete/corrupt inventory fails before provider; no false shortage.
- [ ] All IDs globally disjoint and exact sources reach both Episode/Reel products.
- [ ] Source edit/delete/unapproval/cooldown yields actionable stale response.
- [ ] Concurrent/restart confirmation replay creates one product; different options conflict.
- [ ] English script/Topic/prompts/UI remain English for de/fr target products.
- [ ] Only quiz display, description and thumbnail text localized; choice mapping intact.
- [ ] English provider bypass and prohibited/unknown target rejection.
- [ ] No Bank translation writes anywhere reachable; retired controls cannot invoke old cache APIs.
- [ ] Compare Bank bytes/index before/after product creation against the post-migration baseline.
- [ ] Migration path attacks, drift, malformed language, index changes, crash recovery and replay covered.
- [ ] Reader/writer race, duplicate IDs, recursive acquisition and multi-process operating limits covered.
- [ ] UI updates without reload under slow/error/reconnect/out-of-order scenarios.
- [ ] Desktop/mobile screenshots inspected, keyboard/touch and reduced-motion checks complete.
- [ ] All accepted claims released; no lost token, stale verification, overlapping or unmapped product path.

Rebuild/restart affected processes so the primary workflow runs new code. Before running any test suite, establish that redirected live storage cannot be used by fixtures; prior live drift during testing remains unexplained.

Create `docs/agent-coordination/handoffs/bank-topic-upgrade-stage-06.md` and deliver the return package. Do not declare complete if migration or a required workflow is still blocked; list the precise remaining condition.
