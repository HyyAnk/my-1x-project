# Answer Card Group Auto-Fit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make short Answer Card labels grow to use the real card area while keeping every answer in a question visually fair and accounting for Mascot on/off and 16:9/9:16 geometry.

**Architecture:** Keep the current character-tier CSS as a no-script fallback. Add a pure group-fit policy plus a focused browser-script adapter that measures the rendered choice group after controlled fonts load, chooses one font size and line mode for the whole group, and writes CSS variables/data attributes before render readiness is released. Pass Mascot occupancy into the existing fallback visual QA so preflight and rendered geometry no longer assume Mascot is always off.

**Tech Stack:** TypeScript, Vitest, generated HTML/CSS, browser DOM measurement, HyperFrames preview/render readiness

**Spec:** User-approved design in the current Codex task on 2026-08-31; this is a bounded change with no separate design document.

**Status:** Complete on 2026-08-31, with the Visual 3 Choices follow-up verified on 2026-09-01. The Answer Card fitter, Mascot-aware fallback QA, automated coverage, build checks, and live sandbox matrix are verified. The scoped files pass Prettier; the repository-wide format check remains blocked by unrelated in-progress files outside this change.

**Visual 3 Choices follow-up (2026-09-01):** Fixed intrinsic grid-track expansion that allowed visual cards to escape their allocated width while the text-only measurement still reported `fit`. Visual tracks now clamp intrinsic width, visual cards and labels may shrink inside the track, and the browser fitter also rejects group/card geometry outside its container. Containment uses logical offset geometry so decorative rotation, reveal scaling, and animation timing cannot change the selected font. This layout now has its own required live matrix instead of inheriting confidence from `media_left_choices_right`.

| Visual 3 Choices case                         | Result                                                                |
| --------------------------------------------- | --------------------------------------------------------------------- |
| 16:9, Mascot off/on, short                    | `38px`, 1 line, `fit`                                                 |
| 16:9, Mascot off/on, long                     | `38px`, 2 lines, `fit`                                                |
| 9:16, Mascot off/on, short                    | `42px`, 1 line, `fit`                                                 |
| 9:16, Mascot off/on, long                     | `42px`, 1 line, `fit`                                                 |
| Both aspects, Mascot off/on, extreme overflow | `17px`, 2 lines, `overflow`; group and cards remain inside the canvas |

## Global Constraints

- Preserve all pre-existing uncommitted user changes and do not create commits unless the user asks.
- Add no production dependency; use the existing controlled fonts and DOM APIs.
- Apply one fitted font size and line mode to the complete answer group, never independent per-card font sizes.
- Prefer one line; use two lines only when it provides at least a 6px font-size gain. Keep existing ellipsis behavior as the final overflow fallback.
- Run fitting only after `document.fonts.ready` and before `window.__renderReady=true`.
- Treat Mascot as layout geometry: the fitter consumes the actual post-layout text box. Do not apply a second blanket font multiplier merely because `.has-mascot` exists.
- Preserve character tiers and layout font tokens as deterministic fallback behavior if the browser fitter cannot run.
- Keep browser-specific DOM work out of `candyArcadeFonts.ts`; that module only composes and invokes the fitter.
- Verify 16:9 and 9:16, Mascot on and off, short and long samples, without saving or applying a sandbox preset.

---

### Task 1: Pure group-fit policy

**Files:**

- Create: `apps/server/src/quiz/render/choices/choiceTextFitPolicy.ts`
- Create: `apps/server/test/choiceTextFitPolicy.test.ts`

**Interfaces:**

- Produces: `ChoiceGroupFitResult`, `ResolveChoiceGroupFitInput`, and `resolveChoiceGroupFit(input): ChoiceGroupFitResult`.
- `input.fits(fontSize, lines)` is the only measurement dependency; the policy contains no DOM access.

- [x] **Step 1: Write the failing policy tests**

```ts
import { describe, expect, it } from "vitest";
import { resolveChoiceGroupFit } from "../src/quiz/render/choices/choiceTextFitPolicy.js";

describe("choice text group-fit policy", () => {
  it("uses the maximum one-line size when every answer fits", () => {
    expect(
      resolveChoiceGroupFit({
        minFontSize: 24,
        maxFontSize: 64,
        maxLines: 2,
        multilineGain: 6,
        fits: (size, lines) => lines === 1 && size <= 64,
      }),
    ).toEqual({ fontSize: 64, lines: 1, status: "fit" });
  });

  it("returns one shared size constrained by the longest answer", () => {
    expect(
      resolveChoiceGroupFit({
        minFontSize: 24,
        maxFontSize: 64,
        maxLines: 1,
        multilineGain: 6,
        fits: (size) => size <= 43,
      }),
    ).toEqual({ fontSize: 43, lines: 1, status: "fit" });
  });

  it("uses two lines only when they gain at least six pixels", () => {
    expect(
      resolveChoiceGroupFit({
        minFontSize: 24,
        maxFontSize: 64,
        maxLines: 2,
        multilineGain: 6,
        fits: (size, lines) => size <= (lines === 1 ? 34 : 48),
      }),
    ).toEqual({ fontSize: 48, lines: 2, status: "fit" });
  });

  it("returns the readable floor and overflow status when no mode fits", () => {
    expect(
      resolveChoiceGroupFit({
        minFontSize: 24,
        maxFontSize: 64,
        maxLines: 2,
        multilineGain: 6,
        fits: () => false,
      }),
    ).toEqual({ fontSize: 24, lines: 2, status: "overflow" });
  });
});
```

- [x] **Step 2: Run the test and verify RED**

Run: `pnpm --filter @studio/server test -- choiceTextFitPolicy.test.ts`

Expected: FAIL because `choiceTextFitPolicy.ts` does not exist.

- [x] **Step 3: Implement the minimal pure policy**

```ts
export type ChoiceGroupFitResult = {
  fontSize: number;
  lines: number;
  status: "fit" | "overflow";
};

export type ResolveChoiceGroupFitInput = {
  minFontSize: number;
  maxFontSize: number;
  maxLines: number;
  multilineGain: number;
  fits: (fontSize: number, lines: number) => boolean;
};

export function resolveChoiceGroupFit(input: ResolveChoiceGroupFitInput): ChoiceGroupFitResult {
  const minFontSize = Math.max(1, Math.ceil(input.minFontSize));
  const maxFontSize = Math.max(minFontSize, Math.floor(input.maxFontSize));
  const oneLineSize = largestFittingSize(minFontSize, maxFontSize, (size) => input.fits(size, 1));
  let selected = oneLineSize === null ? null : { fontSize: oneLineSize, lines: 1 };

  for (let lines = 2; lines <= Math.max(1, Math.floor(input.maxLines)); lines += 1) {
    const size = largestFittingSize(minFontSize, maxFontSize, (candidate) => input.fits(candidate, lines));
    if (size !== null && (!selected || size >= selected.fontSize + input.multilineGain)) selected = { fontSize: size, lines };
  }

  return selected
    ? { ...selected, status: "fit" }
    : { fontSize: minFontSize, lines: Math.max(1, Math.floor(input.maxLines)), status: "overflow" };
}
```

Add a private binary-search helper `largestFittingSize(min, max, fits)` that returns the largest passing integer or `null`.

- [x] **Step 4: Run the test and verify GREEN**

Run: `pnpm --filter @studio/server test -- choiceTextFitPolicy.test.ts`

Expected: 4 tests PASS.

---

### Task 2: Browser measurement adapter

**Files:**

- Create: `apps/server/src/quiz/render/choices/choiceTextFitScript.ts`
- Create: `apps/server/test/choiceTextFitScript.test.ts`
- Modify: `apps/server/src/quiz/render/choices/index.ts`

**Interfaces:**

- Consumes: `resolveChoiceGroupFit` from Task 1.
- Produces: `choiceTextFitScript(): string`, defining browser-global `fitChoiceGroups(): { groups: number; overflowGroups: number }`.
- Reads inherited tokens `--choice-fit-min`, `--choice-fit-max`, `--choice-fit-max-lines`, `--choice-fit-leading`, and `--choice-fit-multiline-gain`.
- Writes group variables `--choice-fitted-font-size`, `--choice-fitted-line-height` and attributes `data-choice-fit-lines`, `data-choice-fit-status`, `data-choice-fit-font-size`.

- [x] **Step 1: Write failing executable-script tests**

Test two observable boundaries:

```ts
it("emits executable browser code with the real fit policy", () => {
  const load = new Function(`${choiceTextFitScript()}; return { resolveChoiceGroupFit, fitChoiceGroups };`);
  const api = load() as {
    resolveChoiceGroupFit: (input: ResolveChoiceGroupFitInput) => ChoiceGroupFitResult;
    fitChoiceGroups: () => { groups: number; overflowGroups: number };
  };
  expect(
    api.resolveChoiceGroupFit({
      minFontSize: 24,
      maxFontSize: 64,
      maxLines: 1,
      multilineGain: 6,
      fits: (size) => size <= 51,
    }),
  ).toEqual({ fontSize: 51, lines: 1, status: "fit" });
  expect(typeof api.fitChoiceGroups).toBe("function");
});

it("returns an empty summary when a document has no answer groups", () => {
  const load = new Function("document", "getComputedStyle", `${choiceTextFitScript()}; return fitChoiceGroups();`);
  expect(load({ querySelectorAll: () => [] }, () => ({}))).toEqual({ groups: 0, overflowGroups: 0 });
});
```

- [x] **Step 2: Run the test and verify RED**

Run: `pnpm --filter @studio/server test -- choiceTextFitScript.test.ts`

Expected: FAIL because `choiceTextFitScript.ts` does not exist.

- [x] **Step 3: Implement the DOM adapter**

The generated script must:

1. Select `.choice-group[data-choice-fit-status="pending"]`.
2. Read token values from `getComputedStyle(group)` with numeric fallbacks: min `24`, max `64`, lines `2`, leading `1.08`, gain `6`.
3. Set the candidate group variables and line attribute synchronously.
4. Consider a candidate fit only when every `.choice-text` satisfies:
   - `scrollWidth <= clientWidth + 1`.
   - `scrollHeight <= min(surface inner height, computed line height × allowed lines) + 1`.
5. Resolve one shared result through `resolveChoiceGroupFit`.
6. Apply the result and return `{ groups, overflowGroups }` without swallowing per-group status.

Keep parsing, measurement and application in small named helpers; keep the module under roughly 200 lines.

- [x] **Step 4: Export and verify GREEN**

Run: `pnpm --filter @studio/server test -- choiceTextFitPolicy.test.ts choiceTextFitScript.test.ts`

Expected: 6 tests PASS.

---

### Task 3: Renderer and CSS fit contract

**Files:**

- Modify: `apps/server/src/quiz/render/choices/renderChoiceGroup.ts`
- Modify: `apps/server/src/quiz/render/choices/baseChoiceStyles.ts`
- Modify: `apps/server/src/quiz/render/choices/choiceTypographyStyles.ts`
- Modify: `apps/server/src/quiz/render/layouts/baseline.ts`
- Modify: `apps/server/src/quiz/render/layouts/mediaLeftChoicesRight.ts`
- Modify: `apps/server/src/quiz/render/layouts/mediaTopChoicesBottom.ts`
- Modify: `apps/server/src/quiz/render/layouts/fullStackList.ts`
- Modify: `apps/server/src/quiz/render/layouts/visualChoicesThree.ts`
- Modify: `apps/server/test/quizChoiceGroupRenderer.test.ts`
- Modify: `apps/server/test/quizPhase05BoundariesAndResolution.test.ts`

**Interfaces:**

- Consumes the data attributes and custom properties written by Task 2.
- Preserves all existing tier selectors as fallback values.

- [x] **Step 1: Add failing renderer and CSS contract tests**

Add assertions that rendered groups start with `data-choice-fit-status="pending"`, `data-choice-fit-lines="1"`, and that typography rules consume `--choice-fitted-font-size` before tier fallback tokens. Add literal capacity assertions for:

- `media_left_choices_right` 16:9 text max `64px`, portrait max `72px`.
- `media_top_choices_bottom` 16:9 text max `48px`, portrait max `68px`.
- `full_stack_list` text max `64px`, portrait max `72px`.
- `visual_choices_three` label max `38px`, portrait max `42px`.
- baseline text max `64px`.

- [x] **Step 2: Run the focused tests and verify RED**

Run: `pnpm --filter @studio/server test -- quizChoiceGroupRenderer.test.ts quizPhase05BoundariesAndResolution.test.ts`

Expected: FAIL on the missing fit attributes/tokens.

- [x] **Step 3: Implement renderer attributes and progressive CSS**

The group markup starts with:

```html
data-choice-fit-status="pending" data-choice-fit-lines="1"
```

The base text rule remains a single-line fallback. Add a two-line state:

```css
.choice-group[data-choice-fit-lines="2"] .choice-text {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  white-space: normal;
  overflow-wrap: break-word;
}
```

Every tier font declaration uses the fitted value first, for example:

```css
font-size: var(--choice-fitted-font-size, var(--choice-font-size-medium, 38px));
line-height: var(--choice-fitted-line-height, 1.15);
```

Publish the fit tokens on layout roots. `.has-mascot` may continue changing geometry and fallback tier tokens, but must not override `--choice-fit-max` solely because Mascot is enabled.

- [x] **Step 4: Run the focused tests and verify GREEN**

Run: `pnpm --filter @studio/server test -- quizChoiceGroupRenderer.test.ts quizPhase05BoundariesAndResolution.test.ts`

Expected: PASS.

---

### Task 4: Font-readiness wiring and Mascot-aware fallback QA

**Files:**

- Modify: `apps/server/src/quiz/render/candyArcade/candyArcadeFonts.ts`
- Modify: `apps/server/src/quiz/qa/visualQa.ts`
- Modify: `apps/server/src/quiz/qa/quizAssessment.ts`
- Modify: `apps/server/test/quizFonts.test.ts`
- Modify: `apps/server/test/candyArcade.test.ts`

**Interfaces:**

- `candyArcadeFontReadinessScript()` defines the fitter, calls it after `document.fonts.ready`, stores the returned summary in `window.__choiceFitStatus`, then releases `__playerReady` and `__renderReady`.
- `assessQuizVisualLayout` gains optional `hasMascot?: boolean` and forwards it to question/choice `textLayout` fallback checks.
- `assessQuiz` derives question-phase Mascot visibility from `mascot` plus `mascotConfig.enabled/show_in_question` and forwards the boolean.

- [x] **Step 1: Write failing readiness and QA tests**

Add a readiness ordering assertion that the emitted call to `fitChoiceGroups()` occurs after `await document.fonts.ready` and before `window.__renderReady=true`.

Add a QA fixture with a 61-character answer: Mascot off must not produce `layout_choice_overflow`; Mascot on must produce it because the current fallback thresholds are 82 and 60 respectively.

- [x] **Step 2: Run tests and verify RED**

Run: `pnpm --filter @studio/server test -- quizFonts.test.ts candyArcade.test.ts`

Expected: FAIL because readiness does not invoke the fitter and visual QA ignores `hasMascot`.

- [x] **Step 3: Wire the fitter and QA input**

In the font promise, use this order:

```js
await document.fonts.ready;
fitChannelBrandMarks();
window.__choiceFitStatus = fitChoiceGroups();
document.documentElement.dataset.fontsReady = "true";
window.__playerReady = true;
window.__renderReady = true;
```

In `assessQuiz`, derive:

```ts
const hasQuestionMascot = Boolean(input.mascot && input.mascotConfig?.enabled !== false && input.mascotConfig?.show_in_question !== false);
```

Pass it to `assessQuizVisualLayout`, and use it in both `textLayout` calls.

- [x] **Step 4: Run tests and verify GREEN**

Run: `pnpm --filter @studio/server test -- quizFonts.test.ts candyArcade.test.ts`

Expected: PASS.

---

### Task 5: Full verification and live sandbox regression

**Files:**

- Verify only; update production code/tests only if a failing check exposes an in-scope defect.

**Interfaces:**

- The browser-visible contract is a group font size that grows for short answers, remains uniform across all answers, and reacts to actual layout geometry.

- [x] **Step 1: Run automated verification**

Run in order:

```powershell
pnpm --filter @studio/server test -- choiceTextFitPolicy.test.ts choiceTextFitScript.test.ts quizChoiceGroupRenderer.test.ts quizFonts.test.ts candyArcade.test.ts quizPhase05BoundariesAndResolution.test.ts
pnpm --filter @studio/server typecheck
pnpm --filter @studio/server build
pnpm format:check
```

Expected: every command exits `0`.

- [x] **Step 2: Re-run the updated artifact**

Confirm the watched server restarted and responds on `127.0.0.1:4310`; reload `http://127.0.0.1:2244/#/sandbox` and click `Re-render` so the iframe uses current server output.

- [x] **Step 3: Verify the primary matrix in the sandbox**

For `media_left_choices_right`, record computed `.choice-text` font size, all group font sizes, overflow status, and card/text dimensions for:

| Aspect | Mascot | Sample |
| ------ | ------ | ------ |
| 16:9   | Off    | Short  |
| 16:9   | On     | Short  |
| 16:9   | Off    | Long   |
| 16:9   | On     | Long   |
| 9:16   | Off    | Short  |
| 9:16   | On     | Short  |
| 9:16   | Off    | Long   |
| 9:16   | On     | Long   |

Acceptance:

- Short 16:9 answers fit at up to `64px`; short 9:16 answers fit at up to `72px`.
- All three answers in each row use exactly one font size.
- Mascot on/off never causes clipping or a stale fit result.
- Long samples fit or expose `data-choice-fit-status="overflow"`; no silent ellipsis is reported as fit.
- Preview updates without F5 after each control change.

- [x] **Step 4: Inspect the final diff**

Run: `git diff --check` and review `git diff --` for only the files in this plan plus the pre-existing user changes. Confirm no unrelated user edit was overwritten.
