# P1 - Generation and QA

## Files and interfaces

Modify the P1 targets in `INVENTORY.md`: direct prompt builder, shared rules, standard batch builder, task validators, direct handler, semantic QA, question-bank Auto QA. Delete topic copyright guidance once unused. Do not yet delete `STRICT_COPYRIGHT_PATTERNS` while the audit classifier still imports it.

Create `apps/server/test/authorizedContentGeneration.test.ts`; update `directQuizCopyrightGate.test.ts`, `questionBankAutoQa.test.ts`, and isolated `episodeCopyrightRemediation.test.ts` as their expected behavior changes.

Consume P0 helpers. Preserve existing `validateQuizResearch(markdown, questionCount)`, `validateQuizTreatment(markdown, questionCount)`, `validateQuizScript(markdown, questionCount)`, `handleDirectQuizOutput(runtime, active, output)`, and Auto QA signatures.

## Steps

- [ ] Add public-behavior tests, with these concrete cases:

```typescript
import { describe, expect, it } from "vitest";
import { makeAuthorizedQuiz, makeAuthorizedBankQuestion } from "./helpers/authorizedContentFixtures.js";
import { assessSemanticQa } from "../src/quiz/qa/stages/assessSemanticQa.js";
import { runAutoQaOnQuestion } from "../src/quiz/bank/questionBankAutoQa.js";
import { validateQuizResearch, validateQuizTreatment, validateQuizScript } from "../src/tasks/validators.js";

describe("Authorized subject generation", () => {
  it.each(["Simba", "Spider-Man", "Batman", "Pikachu", "Mario", "lion cub"])("accepts a valid named subject: %s", (subject) => {
    expect(runAutoQaOnQuestion(makeAuthorizedBankQuestion(subject)).passed).toBe(true);
    expect(assessSemanticQa(makeAuthorizedQuiz(subject))).toEqual([]);
  });

  it("retains schema, quality, source, and duplicate checks", () => {
    const bank = makeAuthorizedBankQuestion("Mario");
    expect(runAutoQaOnQuestion({ ...bank, correct_choice_id: "Z" }).passed).toBe(false);
    expect(runAutoQaOnQuestion({ ...bank, question: "Short" }).passed).toBe(false);
    expect(runAutoQaOnQuestion(bank, [{ ...bank, id: "EXISTING" }]).passed).toBe(false);
    const quiz = makeAuthorizedQuiz("Mario");
    quiz.questions[0].source_ids = [];
    expect(assessSemanticQa(quiz).some((issue) => issue.code === "semantic_sources_missing")).toBe(true);
  });

  it("accepts named subjects in valid markdown without relaxing structure", () => {
    const research = "C01 Simba reference\nhttps://example.com/a\nhttps://example.com/b\nhttps://example.com/c";
    const treatment = "## Question 1\nSimba\nTime budget: 5 seconds\nCorrect answer: Simba";
    const script = "<!-- HUMOR_POLICY: v1 -->\n## Question 1\nGuess who: Simba\nCorrect answer: Simba";
    expect(() => validateQuizResearch(research, 1)).not.toThrow();
    expect(() => validateQuizTreatment(treatment, 1)).not.toThrow();
    expect(() => validateQuizScript(script, 1)).not.toThrow();
    expect(() => validateQuizResearch("C01 Simba", 1)).toThrow(/source URLs/);
    expect(() => validateQuizTreatment("Simba", 1)).toThrow(/question blocks/);
    expect(() => validateQuizScript("## Question 1\nGuess Simba; answer Simba", 1)).toThrow(/HUMOR_POLICY/);
  });
});
```

- [ ] Run red:

```powershell
pnpm --filter @studio/server test test/authorizedContentGeneration.test.ts
```

Expected before implementation: named-subject acceptance fails from current copyright checks. The `example.com` strings are source-count fixtures; no network lookup is needed.

- [ ] Remove policy imports and branches, not whole validators. In Auto QA the issue composition becomes:

```typescript
const issues: AutoQaIssue[] = [
  ...checkQualityAndSchemaIssues(question),
  ...checkDuplicateIssues(question, existingQuestions, similarityThreshold),
];
```

Remove `checkCopyrightIssues`. P5 finishes the report/type deletion; do not invent a new active “restricted content” category. In `assessSemanticQa`, remove the copyright block entirely, including warnings. In `directQuizHandler`, connect balanced quiz creation directly to the existing `writeQuiz` workflow.

- [ ] Remove global/topic copyright instruction injection and the obsolete guidance module. Remove only the copyright line in the standard batch content-policy section; keep offensive/gory/dangerous-content restrictions. Replace copyright-only instructions in shared rules with the following neutral identity instruction where useful:

```text
Preserve the requested subject's names and identifying features. Do not substitute an unrelated generic subject. Keep all existing factual, structural, and audience-appropriateness requirements.
```

- [ ] In existing direct-handler tests, replace early-rejection expectations with repository assertions: `writeQuiz` is called once with named subjects preserved; legacy artifacts are generated from that saved quiz; history checks, invalidation, and QUIZ_READY follow confirmed persistence. Add repository-write rejection and malformed-schema cases; neither may advance the stage. Reuse the existing runtime mock rather than inventing a parallel task runner.
- [ ] Test policy absence in `buildDirectQuizOutputContract` using existing typed episode fixtures: no `STRICT COPYRIGHT & TRADEMARK POLICY`, no `MANDATORY TOPIC COPYRIGHT MITIGATION`, no `SAFE VISUAL PROXY`. Test the final composed context too; absence in one builder is insufficient if a shared rule reintroduces it.
- [ ] Update batch acceptance totals. The existing three-candidate test with one valid original, one duplicate, and one Pikachu candidate now expects two approved and one duplicate rejection, subject to the surviving quality rules. Make test content factually coherent instead of retaining mismatched explanation/answer fixtures.
- [ ] Run green and protected regression suites:

```powershell
pnpm --filter @studio/server test test/authorizedContentGeneration.test.ts test/directQuizCopyrightGate.test.ts test/questionBankAutoQa.test.ts test/episodeCopyrightRemediation.test.ts test/scriptQuality.test.ts
pnpm --filter @studio/server typecheck
```

## Gate

Valid named subjects pass public generation/QA flows without warnings or substitution. Invalid structure, facts/sources, duplicate content, and persistence failures still fail correctly. No extra prompt policy module or rights gate has been introduced.
