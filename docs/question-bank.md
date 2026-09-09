# Question Bank Subsystem

The Question Bank subsystem is a centralized, local-first repository of reusable, high-quality trivia and educational questions. It decouples question research and creation from individual episode production, enabling automated catalog curation, matrix coverage tracking, just-in-time (JIT) difficulty balancing, target-language transcreation, and one-click topic→episode generation.

---

## 1. Architectural Overview & Invariants

The Question Bank architecture runs under [`apps/server/src/quiz/bank/`](apps/server/src/quiz/bank/) and adheres to strict domain invariants:

```text
Reusable English Bank Questions
         │
         ▼
Coherent Eligible Inventory (Cooldown & Filter Check)
         │
         ▼
Matrix Coverage & Deficit Planning
         │
         ▼
Topic Curation & JIT Difficulty Seeding
         │
         ▼
Topic Confirmation & Receipt Idempotency
         │
         ▼
Product-Boundary Transcreation (Non-English Target Languages)
         │
         ▼
Topic → Episode Bridge (Quiz V2 Pipeline Hand-off)
```

### Core Invariants

1. **Strict English-Only Storage Invariant:** All question stems, choices, explanations, hints, and taxonomy tags stored in the bank are strictly in English (`en`). Non-English translations are never written back to the bank repository.
2. **Channel Cooldown Isolation:** Questions maintain a 30-day publication cooldown per channel ([`bankEligibility.ts`](apps/server/src/quiz/bank/bankEligibility.ts)) to prevent repeated trivia across consecutive videos. Cooldowns are evaluated per channel and do not affect bank availability for other channels.
3. **Product-Boundary Localization:** Language transcreation happens strictly at the product generation boundary. The bank repository remains completely clean and language-agnostic.
4. **Deterministic Hash & Receipt Fingerprinting:** Source content is versioned and hashed via `hashBankQuestionSource`. Topic confirmations issue cryptographically signed receipts (`topicConfirmationReceipts.ts`) to guarantee replay idempotency and detect configuration conflicts.

---

## 2. Gameplay Archetypes & Matrix Coverage

Questions are indexed against standardized gameplay archetypes defined in `@studio/shared` (`quizArchetypes.ts`, `ALL_MATRIX_ARCHETYPES`):

| Archetype ID | Layout Family | Description |
| :--- | :--- | :--- |
| `standard_4_choice` | Multiple Choice | Classic 4-choice trivia layout with balanced letter distribution. |
| `true_false` | Binary | Binary truth statement evaluation with timed thinking pulse. |
| `binary_choice` | Binary | Direct A/B dilemma or dichotomy selection. |
| `odd_one_out` | Elimination | Identification of an outlier item among 4 thematic candidates. |
| `sequence_order` | Ordering | Chronological, scale, or logical ordering challenge. |
| `numerical_estimate` | Estimation | Proximity guessing and numerical range estimation. |
| `visual_id` | Visual | Visual cue, silhouette, or image-grounded identification. |

### Matrix Coverage Service ([`matrixCoverageService.ts`](apps/server/src/quiz/bank/matrixCoverageService.ts))

The matrix engine tracks inventory health across difficulty bands (1–5) and gameplay archetypes:

- **Coverage Calculation ([`matrix/matrixCoverageCalculator.ts`](apps/server/src/quiz/bank/matrix/matrixCoverageCalculator.ts)):** Aggregates total, eligible, and cooldown inventory counts into a multi-dimensional matrix map via `buildMatrixCoverageMap` and `calculateMatrixCoverageStats`.
- **Deficit Planning ([`matrix/matrixDeficitPlanner.ts`](apps/server/src/quiz/bank/matrix/matrixDeficitPlanner.ts)):** Analyzes target channel requirements against active inventory to calculate deficits.
- **Candidate Selection:** Supports both automated deficit-driven candidate generation (`selectAutoCandidates`) and manual filtering criteria (`selectManualCandidates`).
- **Batch Chunk Scheduling (`planBatchChunks`):** Groups deficit fulfillment into manageable LLM batch prompts adhering to token limits.

---

## 3. Question Curation & Retention Arcs

The Curation Engine ([`questionCurationEngine.ts`](apps/server/src/quiz/bank/questionCurationEngine.ts)) selects and sequences questions for an episode topic:

### Multi-Factor Scoring

Candidate questions are evaluated using composite scoring:
- **Relevance Score (`calculateRelevanceScore`):** Measures semantic similarity between topic tags/keywords and question taxonomy.
- **Visual Score (`calculateVisualScore`):** Prioritizes questions with vivid visual potential (concrete nouns, recognizable subjects, clear silhouette cues) over abstract textual facts.
- **Channel DNA Alignment:** Matches channel age band, tone, and complexity constraints.

### Retention Arc Sequencing (`assembleRetentionArc`)

To maximize viewer retention on YouTube Shorts and landscape videos, curated questions are ordered into a psychological difficulty curve:
1. **Hook (Question 1):** Moderate difficulty (Difficulty 2–3) with high visual intrigue to drive early watch-time.
2. **Momentum (Questions 2–N-1):** Progressive ramp from easy (Difficulty 1–2) to challenging (Difficulty 3–4), maintaining engagement.
3. **Climax (Final Question):** Peak difficulty (Difficulty 4–5) delivering a memorable payoff and encouraging comments.

---

## 4. Just-In-Time (JIT) Question Seeding

When the existing bank inventory cannot completely satisfy an episode's archetype and difficulty requirements, the JIT Seeder ([`questionJitSeeder.ts`](apps/server/src/quiz/bank/questionJitSeeder.ts)) activates automatically:

- **Deficit Detection (`determineMissingDifficulties`):** Identifies exact gaps in the target difficulty curve (e.g. needing a Difficulty 4 question to complete a 3-question Short arc).
- **Prompted Generation:** Generates targeted questions matching the missing difficulty levels and gameplay archetypes using structured batch prompts (`batchGeneratorPrompt.ts`).
- **Deterministic Auto-QA ([`questionBankAutoQa.ts`](apps/server/src/quiz/bank/questionBankAutoQa.ts)):** Validates generated questions against length limits, unambiguous answers, absence of banned tropes, and copyright filters before admitting them into the bank.
- **Hybrid Composition:** Returns a seamless combination of existing bank inventory and newly seeded questions (`EnsureTopicQuestionsResult`).

---

## 5. Transcreation & Localization Engine

The localization subsystem ([`localization/productLocalization.ts`](apps/server/src/quiz/bank/localization/productLocalization.ts), [`transcreation/`](apps/server/src/quiz/bank/transcreation/)) adapts English bank content to the target channel's language:

### Supported Languages & Invariants

```typescript
export const SUPPORTED_BASE_LANGUAGES = ["en", "es", "fr", "de", "it", "pt", "ja", "ko", "zh"] as const;
```

- **English Base:** When the channel language is English (`en`), transcreation is a no-op pass-through requiring zero LLM calls.
- **Strict Prohibition of Vietnamese:** Per system policy, Vietnamese (`vi`, `vi-VN`) is strictly prohibited. `normalizeTargetLanguage` explicitly raises an `UNSUPPORTED_TARGET_LANGUAGE` error if requested.
- **Selective Field Transcreation:** Only audience-facing visual and audio strings are localized:
  - Question stem
  - Choice texts (preserving original choice IDs and correct answer mapping)
  - Explanation
  - YouTube video description
  - In-image thumbnail text
- **Immutable English Metadata:** Internal director plans, stage tags, prompt instructions, and logging remain 100% in English.

---

## 6. Topic → Episode Bridge

The bridge module ([`questionBankToQuizBridge.ts`](apps/server/src/quiz/bank/questionBankToQuizBridge.ts)) translates curated question-bank content into production-ready Quiz V2 episodes in a single operation:

### Bridge Operations

1. **`createEpisodeFromQuestionBank`:** Creates an episode from a single selected bank question.
2. **`createEpisodeFromTopicWithBank`:** Bridges a multi-question confirmed topic into a full multi-beat Quiz episode.

### Bridge Execution Steps

1. **Resolution & Cooldown Check:** Resolves bound question IDs ([`boundSourceResolver.ts`](apps/server/src/quiz/bank/bridge/boundSourceResolver.ts)) and verifies that none of the questions are in active 30-day channel cooldown (unless overridden with `force=true`).
2. **Idempotency & Replay Verification:** Checks confirmation receipts via `assertConfirmationReplayOrConflict`. Replaying the same options returns the existing episode record; conflicting options raise a descriptive conflict error.
3. **Lossless Question Conversion:** Converts `BankQuestion` models into canonical `QuizQuestion` structures ([`bankQuestionConverter.ts`](apps/server/src/quiz/bank/bridge/bankQuestionConverter.ts)), normalizing choices and explanations.
4. **Director Plan Synthesis:** Deterministically constructs `director_plan.json` ([`bankDirectorPlanFactory.ts`](apps/server/src/quiz/bank/bridge/bankDirectorPlanFactory.ts)) assigning thinking durations according to channel age-band policies.
5. **Staged Atomic Persistence:** Writes the episode files into a temporary staging folder (`.staging-episode-*`) and atomically moves them into place via `publishStagedEpisode` to prevent partially written episodes.
6. **Task Enqueue:** Automatically schedules a `QUIZ_PIPELINE` task with the `TaskManager`, kicking off the Quiz V2 production pipeline (parallel assets + batch voice, QA gates, and video render) without requiring any manual authoring.
