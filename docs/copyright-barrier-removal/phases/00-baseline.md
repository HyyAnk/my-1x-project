# P0 - Baseline and Test Isolation

## Files and interfaces

- Read: root `AGENTS.md`, `GEMINI.md`, `package.json`, package scripts, `execution/planning-baseline.json`.
- Modify: `apps/server/test/episodeCopyrightRemediation.test.ts` to remove its absolute channel-storage dependency and real QA write.
- Create: `apps/server/test/helpers/authorizedContentFixtures.ts`.
- Update: `execution/STATUS.md`, `execution/EVIDENCE.md`.
- Produce test helper: `makeAuthorizedQuiz(subject: string): QuizV2`, `makeAuthorizedBankQuestion(subject: string): BankQuestion`.
- No application workflow changes in this phase.

## Steps

- [ ] Run the following separately and record the current checkout and tool versions:

```powershell
git status --short
git rev-parse HEAD
git branch --show-current
git diff --stat
node --version
pnpm --version
codegraph explore "copyrightValidator handleDirectQuizOutput sanitizeVisualPrompt"
```

- [ ] Compare planning hashes and inspect current diffs in overlapping files, especially `knowledgeBase.types.ts`, `resolveQuizAssets.ts`, `providerAssetResolver.ts`, and `episodeCopyrightRemediation.test.ts`. Do not discard any pre-existing changes. If isolation is needed, use a user-approved snapshot of the current working tree, not a worktree from HEAD that omits uncommitted work.
- [ ] Inspect test I/O before running the full suite:

```powershell
rg -n "[A-Za-z]:[/\\]|writeFileSync|writeFile|STUDIO_ROOT|process\.env|fetch\(" apps/server/test apps/web/test
```

Classify real-path writes and external provider calls. The known remediation test resolves a sibling channel directory and writes `quiz/qa.json`. Replace its external-data fixture with a synthetic temporary repository. Preserve schema/assessment coverage; do not merely skip it or wrap missing data in an early return. All test writes must stay under test-owned temporary roots.

- [ ] Add the helpers below. They are complete input shapes, not real production content. Validate the quiz with the existing schema so schema drift is detected immediately.

```typescript
import { QuizV2Schema, type QuizV2, type BankQuestion } from "@studio/shared";

export function makeAuthorizedQuiz(subject: string): QuizV2 {
  return QuizV2Schema.parse({
    schema_version: 2,
    episode_id: "authorized-content-fixture",
    age_band: "7-9",
    language: "en",
    questions: [
      {
        id: "question-01",
        number: 1,
        format: "multiple_choice",
        difficulty: 1,
        question: `Which subject is shown: ${subject}?`,
        choices: [
          { id: "choice-a", text: subject },
          { id: "choice-b", text: "A mountain" },
          { id: "choice-c", text: "An ocean" },
        ],
        correct_choice_id: "choice-a",
        explanation: `The reference image depicts ${subject}.`,
        fun_fact: `This exercise identifies ${subject}.`,
        source_ids: ["C01"],
        visual_opportunity: `${subject} centered on a bright studio background`,
        validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
      },
    ],
  });
}

export function makeAuthorizedBankQuestion(subject: string): BankQuestion {
  return {
    id: "AUTHORIZED-001",
    archetype_id: "speed_blitz",
    domain_id: "logic_puzzles",
    subtopic_id: "tricky_riddles",
    language: "en",
    format: "multiple_choice",
    question: `Which subject is shown: ${subject}?`,
    choices: [
      { id: "A", text: subject, is_correct: true },
      { id: "B", text: "A mountain", is_correct: false },
      { id: "C", text: "An ocean", is_correct: false },
    ],
    correct_choice_id: "A",
    explanation: `The reference image depicts ${subject}.`,
    fun_fact: `This exercise identifies ${subject}.`,
    visual_spec: { intent: "none", aspect_ratio: "16:9" },
    age_band: "family",
    difficulty: 2,
    thinking_seconds: 4,
    tags: ["identity-fixture"],
    status: "approved",
  };
}
```

- [ ] Rebuild shared types, run the isolated remediation test, then establish the safe baseline. If remaining unsafe tests exist, fix their isolation within scope or obtain direction before the full suite.

```powershell
pnpm build:shared
pnpm --filter @studio/server test test/episodeCopyrightRemediation.test.ts
pnpm typecheck
pnpm test
```

- [ ] Record baseline failures exactly. Do not run network-dependent scripts or live image generation as “baseline checks.” Check no sibling storage files were modified using explicit test-root enforcement and filesystem spies where needed.

## Gate

P0 is verified when fixture validation passes, the known external write has been removed, broad test execution is safe, pre-existing failures are documented, and all overlapping user work remains intact. Keep metadata migration and active app behavior unchanged.
