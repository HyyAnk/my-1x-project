# CODEBASE ARCHITECTURE & CLEAN CODE RULES

You are an expert software architect and senior engineer. When generating or refactoring code in this project, you MUST strictly adhere to the following architectural guidelines and engineering standards:

---

## 1. Modular Design & Separation of Concerns (SoC)

- **No Monolithic / "God" Files:** Never combine UI layout, state management, business workflows, data fetching, and type definitions into a single monolithic file.
- **Strict Architectural Layering:**
  - **Presentation Layer (UI):** Components must focus solely on rendering and handling direct user interactions. Keep them stateless or limited to purely visual local UI state.
  - **Business & Domain Logic:** Extract all business rules, calculations, data transformations, and stateful workflows into dedicated Services, UseCases, or Custom Hooks.
  - **Data Access Layer:** All API calls, backend queries, and external integrations must reside in dedicated Client or Repository modules.
  - **Types & Contracts:** Define clear, explicit interfaces/types in dedicated `.types.ts` or `types/` files before implementation.
  - **Utils & Helpers:** Pure utility functions (formatting, validation, math) must be isolated in `utils/` with zero side-effects and high testability.

---

## 2. File & Function Size Constraints

- **Functions:** Keep functions concise (ideally under 30–40 lines). If a function performs multiple discrete tasks, decompose it into well-named helper functions.
- **Components / Modules:** Aim to keep files under ~150–200 lines. When a file grows beyond this threshold, proactively break it down into modular sub-components or extracted helper modules.
- **Single Responsibility Principle (SRP):** Each file, class, and function must have only one reason to change.

---

## 3. Cohesive Feature & Directory Organization

- Organize code by feature/domain or clean monorepo structure:
  ```text
  feature-name/
  ├── components/          # Small, reusable sub-components
  │   ├── FeatureCard.tsx
  │   └── FeatureHeader.tsx
  ├── hooks/               # Custom hooks / domain state
  │   └── useFeatureData.ts
  ├── services/            # API / data access layer
  │   └── featureApi.ts
  ├── types/               # Type definitions & interfaces
  │   └── feature.types.ts
  ├── utils/               # Feature-specific pure helpers
  │   └── featureHelpers.ts
  └── index.ts             # Public barrel export
  ```

---

## 4. Code Quality & Maintainability Standards

- **DRY (Don't Repeat Yourself):** Extract repeated patterns into reusable utilities, shared components, or base modules.
- **Strict Typing:** Avoid `any` or ambiguous types. Use strict TypeScript interfaces, DTOs, and proper generic constraints.
- **Dependency Inversion:** Depend on abstractions (interfaces/contracts) rather than hardcoded concrete implementations.
- **Self-Documenting Code:** Write clear, expressive function and variable names instead of relying on excessive inline comments.
- **Clean Error Handling:** Isolate error boundaries, retry logic, and fallback states cleanly from the main execution flow.

---

## 5. Refactoring & Code Modification Protocol

- When asked to extend or modify existing large/legacy files:
  - **Do not bloat existing files further.**
  - Proactively extract new sub-components, services, or helpers into separate files.
  - Ensure all refactored parts remain backward-compatible and well-structured.

---

## 6. Agent Coordination Protocol & Main-Direct Operating Rules

When working in this repository across multiple agents, chats, or tasks, all agents MUST strictly follow the Agent Coordination Protocol (`docs/agent-coordination/`):

- **Source of Truth:** Read `AGENTS.md`, `docs/agent-coordination/README.md`, `docs/agent-coordination/master-spec.md`, `docs/agent-coordination/phase-roadmap.md`, and the latest handoff summary in `docs/agent-coordination/handoffs/` before performing work. Repo artifacts are the source of truth, not chat history.
- **Main-Direct Working Mode:** Work directly on the current `main` checkout. Do NOT create git branches or worktrees unless explicitly instructed by the user.
- **Dirty Workspace Baseline (Mandatory):** Capture the pre-existing workspace baseline (`git status --porcelain`) before making any edits. Never touch, commit, or revert pre-existing dirty files outside your assigned scope.
- **Zone Ownership & High-Risk Boundaries:** High-risk shared areas (`shared-contracts`, `server-pipeline`, `task-status-progress`, `api-contracts`, `artifact-contracts`, `render-inputs`) require exclusive ownership. Do NOT edit outside your declared zone or phase scope; if unexpected changes are required, stop and request claim expansion.
- **Phase Handoff Deliverables:** Every task or phase MUST complete by generating a handoff summary in `docs/agent-coordination/handoffs/` following `docs/agent-coordination/templates/phase-handoff-summary.md`.
- **Authenticated Lifecycle:** Before editing, run `node scripts/agent-status.mjs --json`, then create a claim with `node scripts/agent-claim.mjs ... --planned-files <concrete-paths> --json`. Capture the one-time `leaseToken` only in session memory. Wildcards are forbidden in planned files; an empty list claims the whole zone.
- **Mutations Require The Token:** Pass `--token <lease-token>` to expand, heartbeat, verify, and release. If scope grows, run `agent-expand` and wait for success before editing the added paths.
- **Verified Release Gate:** Run required checks, then `node scripts/agent-verify-claim.mjs --claim <id> --token <lease-token> --evidence "<checks and results>" --json`. Do not edit after successful verification. Release with `node scripts/agent-release.mjs --claim <id> --token <lease-token> --json`.
- **Commit Gate:** Do not commit while any implementation claim is active. Release the verified claim first, confirm `agent-status --integrator --json`, then stage only files owned by the completed task.
- **Coverage Gate:** Run `node scripts/agent-validate-zones.mjs --json` when product paths or zone definitions change. Integration must reject unmapped paths, overlaps, active unverified claims, or stale verification.
- **Enforcement Limit:** This protocol cannot prevent an unrestricted process from bypassing the CLI and writing files. Repository instructions, review, and the verification/release/integration gates are the enforcement boundary.
