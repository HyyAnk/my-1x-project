# Development and verification

Reviewed on 2026-09-09. Follow [AGENTS.md](../AGENTS.md) for engineering rules and [Documentation](README.md) for the reading order.

## Before changing code

1. Inspect `git status --short`; preserve existing work and avoid unrelated cleanup.
2. Read [Architecture](architecture.md), then the relevant domain guide and current source/tests. If `.codegraph/` exists, use CodeGraph before text search.
3. Identify responsibilities, contracts, data flow, side effects, failure modes and verification scope.
4. For UI work, plan pending/success/error/retry/cancel states, synchronization, stale-result handling, keyboard/touch access and responsive behavior.
5. Keep business workflows separate from UI/transport, and external I/O behind focused adapters/repositories. Do not enlarge mixed-responsibility facades unnecessarily.

Retired agent claim/lease scripts are not required. This does not remove application-level locks, storage serialization or revision checks.

## Verification commands

Commands are defined in [package.json](../package.json); [CI](../.github/workflows/ci.yml) defines automated gates.

| Command              | Scope                                               |
| -------------------- | --------------------------------------------------- |
| `pnpm build:shared`  | Build shared contracts before consumers when needed |
| `pnpm typecheck`     | Build shared and typecheck workspace                |
| `pnpm test`          | Shared, server and web unit/integration suites      |
| `pnpm run audit`     | Quiz choice and quiz-only integrity audits          |
| `pnpm check:all`     | Typecheck, tests and audits only                    |
| `pnpm lint`          | ESLint                                              |
| `pnpm format:check`  | Formatting policy and baseline check                |
| `pnpm build`         | Workspace production build                          |
| `pnpm test:e2e`      | Playwright scenarios                                |
| `pnpm test:visual`   | Opt-in visual regression                            |
| `pnpm test:coverage` | Server/web coverage                                 |

For focused tests:

```powershell
pnpm build:shared
pnpm --filter @studio/server exec vitest run test/runtimeNamespace.test.ts
pnpm --filter @studio/web exec vitest run src/features/channel/components/TopicCard.test.tsx
```

For code/config/dependency updates, rebuild or restart affected processes and exercise the updated primary workflow. Test relevant success, slow, empty, failure, retry, reconnect and concurrent-update paths. Use isolated fixtures; do not mutate live channels for testing.

Documentation-only updates need formatting, local-link/source-reference checks and diff review, not an application restart. Check Markdown explicitly with `pnpm exec prettier --check "docs/*.md"`; do not assume the baseline command covers every document.

Report exact commands, outcomes and unverified behavior. Failed E2E remains a failed/unverified gate even if suspected to be environmental; record evidence and recovery steps rather than declaring unconditional acceptance.

## Publishing checklist

The project already has [an MIT license](../LICENSE), [an environment example](../.env.example), and CI. Before publishing:

- Inspect the actual staged diff and tracked files; ignore rules do not remove previously tracked secrets.
- Keep API keys, local configuration, credentials, logs and user content out of commits.
- Check [ignore rules](../.gitignore), especially selected content roots outside the checkout and generated assets.
- Keep source, schemas, tests, templates and the lockfile versioned. Review asset licensing and release packaging separately.
- Preserve unrelated edits. Commit or push only when requested or authorized; a passing build does not authorize publication.

The former standalone GitHub publishing checklist has been consolidated here.

## Documentation maintenance

Update domain docs when public contracts, persistence, supported workflows or failure handling change. Prefer source links over duplicated catalogs and line-number claims. Date a source review without implying runtime acceptance. Keep historical reports separate from current implementation guidance.
