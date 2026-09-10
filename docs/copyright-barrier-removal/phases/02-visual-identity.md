# P2 - Visual Identity and Cache Correctness

## Files and interfaces

- Modify: `quiz/assets/promptCompiler.ts`, `quiz/thumbnail/thumbnailPromptCompiler.ts` under `apps/server/src/`.
- Review/modify the necessary seam only: `quiz/assets/assetValidator.ts`, `resolveQuizAssets.ts`, `assetFingerprint.ts`, and provider prompt-appending adapters listed in the inventory.
- Delete: `quiz/assets/visualPromptSanitizer.ts` and the four `quiz/assets/sanitizer/` files after confirming no non-IP responsibilities were added.
- Create: `apps/server/test/authorizedContentVisuals.test.ts`.
- Update: `visualPromptSanitizer.test.ts`, `quizAssetsQa.test.ts`, `thumbnailPromptEngine.test.ts`.
- Keep signatures of `compileQuizAssetPrompt` and `compileThumbnailPrompt` unchanged.

## Steps

- [ ] Add compiler-level regressions instead of testing a disabled sanitizer:

```typescript
import { describe, expect, it } from "vitest";
import { makeAuthorizedQuiz } from "./helpers/authorizedContentFixtures.js";
import { planQuizAssets } from "../src/quiz/assets/assetPlanner.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { compileQuizAssetPrompt } from "../src/quiz/assets/promptCompiler.js";
import { assetFingerprint } from "../src/quiz/assets/assetFingerprint.js";
import { compileThumbnailPrompt, resolveThumbnailLayout } from "../src/quiz/thumbnail/index.js";

describe("Authorized visual identities", () => {
  it.each(["Simba", "Pikachu", "Pac-Man", "Mario", "Spider-Man", "lion cub"])("preserves %s in final prompts", (subject) => {
    const quiz = makeAuthorizedQuiz(subject);
    const assets = planQuizAssets(quiz, createDefaultDirectorPlan(quiz));
    const request = assets.assets.find((item) => item.purpose === "hero_question_image");
    if (!request) throw new Error("Expected hero asset fixture");
    const compiled = compileQuizAssetPrompt(request);
    expect(compiled.prompt).toContain(subject);
    expect(assetFingerprint(request, "gpti2", compiled.cacheVersion)).not.toBe(
      assetFingerprint(request, "gpti2", "pixar_3d-v3-expressive-faces"),
    );
    const plan = resolveThumbnailLayout({ topicTitle: subject, layoutOverride: "split_vs" });
    plan.subjectAnchors = [
      { label: subject, visualPrompt: `${subject} on a bright stage` },
      { label: "Mountain", visualPrompt: "A green mountain" },
    ];
    for (const ratio of ["16:9", "9:16"] as const) {
      expect(compileThumbnailPrompt(plan, ratio)).toContain(subject);
    }
  });
});
```

- [ ] Run the new test red. Then replace IP transformations with direct subject use and ordinary whitespace normalization:

```typescript
const cleanSubject = request.subject.trim();
// Keep the existing rawPrompt assembly, style contracts, and framing rules.
const prompt = rawPrompt.replace(/\s{2,}/g, " ").trim();
// Return this alongside existing critical flag and the new cache version.
```

In thumbnail compilation return the assembled prompt with the same ordinary normalization. Do not add a wrapper named `sanitizeVisualPrompt` that simply returns its argument. Remove its imports, exports, and dead rule files. Set the returned compiler version explicitly:

```typescript
return {
  prompt,
  cacheVersion: `${contract.id}-v4-subject-identity`,
  critical: request.required,
};
```

- [ ] Review every “no logos”/“no brand names” instruction in compiler and provider adapters. Preserve layout restrictions while allowing the exact requested subject and identifying marks. Verify with a request for a logo as the primary subject, not only a character name. Do not remove watermark protections from source assets.
- [ ] Inspect stale-asset completion carefully. The planning version of `assetValidator.ts` accepts a mismatched fingerprint whenever `resolved.path` exists. A version bump alone therefore does not establish freshness. Add a regression with valid PNG bytes, matching semantic key, an old generation fingerprint, and an existing path: a newly requested generation must not be considered current.
- [ ] Inspect reused `existingBundleFile` and incremental-resolution paths too. `resolveQuizAssets.ts` labels both curated copies and existing bundle copies `explicit_episode`; do not assume that source label alone proves user selection or current identity. Use existing manifest metadata to distinguish explicit/curated selection from auto-generated legacy bundle reuse. Missing provenance on an automatic reusable artifact makes it stale for a new request; retain its old bytes and display as historical output.
- [ ] Make a focused shared reuse predicate if resolver and validator need the same rule. Keep provider and visual-style inputs consistent between generation and completeness checks; the current validator hardcodes `gpti2` and defaults the style. Derive/persist the same context already used by generation instead of adding a second inference algorithm. Add exact provider/style mismatch tests.
- [ ] Preserve explicit user-selected assets and curated source priority. A named subject must not become a generic fallback. Historical successful versions stay viewable, and only a new generation/reassessment uses the new cache version. No bulk cache deletion.
- [ ] Run green and resolver/thumbnail regressions:

```powershell
pnpm --filter @studio/server test test/authorizedContentVisuals.test.ts test/quizAssetsQa.test.ts test/thumbnailPromptEngine.test.ts test/thumbnailService.test.ts test/curatedAssetPriority.test.ts
pnpm --filter @studio/server typecheck
```

## Gate

Names survive subject assembly, final compilation, and provider-bound prompt capture. Old generated proxy cache entries cannot be relabeled current merely because their files exist. Explicit and curated assets remain usable. No semantic/path/framing safety check was bypassed.
