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

## 6. Strict English-Only Codebase & System Specification

- **Absolute Prohibition of Vietnamese in Code & Files:** All code, file contents, file and folder names, comments, docstrings, variable/type/function names, test cases, mock data, commit messages, and documentation within the project MUST be in English. Under no circumstances should Vietnamese (accented or unaccented) be written into any file or filename.
- **System & UI Language:** The entire system interface, including all UI labels, buttons, dialogs, tooltips, error messages, notifications, and placeholders across the web and server applications, MUST be strictly in English.
- **Agent Chat Language Distinction:** The user may converse, ask questions, and give instructions in Vietnamese (or any preferred language) within the AI conversation/chat. Antigravity/agents will reply in the user's chosen language in the chat. However, all generated code, modified files, created files, and repository artifacts MUST strictly remain 100% English.
