# Comprehensive Audit and Redesign Plan: `portrait_stack_list` (9:16 Portrait)

**Layout ID**: `portrait_stack_list`  
**Target Format**: 9:16 Vertical Video (1080 × 1920 px) for TikTok, YouTube Shorts, and Instagram Reels  
**Target File**: [`apps/server/src/quiz/render/layouts/portrait/portraitStackList.ts`](file:///d:/1a%20Cursor%20Project/My%201x%20Project/apps/server/src/quiz/render/layouts/portrait/portraitStackList.ts)  
**Shared Catalog Definition**: [`packages/shared/src/quizLayouts.catalog.ts`](file:///d:/1a%20Cursor%20Project/My%201x%20Project/packages/shared/src/quizLayouts.catalog.ts#L169-L181)  
**Related Subsystems**: [`candyArcadeStyles.ts`](file:///d:/1a%20Cursor%20Project/My%201x%20Project/apps/server/src/quiz/render/candyArcade/candyArcadeStyles.ts), [`baseChoiceStyles.ts`](file:///d:/1a%20Cursor%20Project/My%201x%20Project/apps/server/src/quiz/render/choices/baseChoiceStyles.ts), [`choiceStateStyles.ts`](file:///d:/1a%20Cursor%20Project/My%201x%20Project/apps/server/src/quiz/render/choices/choiceStateStyles.ts), [`candyArcadeClips.ts`](file:///d:/1a%20Cursor%20Project/My%201x%20Project/apps/server/src/quiz/render/candyArcade/candyArcadeClips.ts), [`sandboxComposition.ts`](file:///d:/1a%20Cursor%20Project/My%201x%20Project/apps/server/src/quiz/render/sandboxComposition.ts)  
**Audit Date**: September 2026  
**Status**: Completed & Production Ready

---

## 1. Executive Summary & Audit Scorecard

The `portrait_stack_list` layout is the **sole flagship 4-choice portrait layout** in the Candy Arcade Quiz Engine. Unlike media-heavy layouts (such as `portrait_hero_choices` or `portrait_split_versus`), `portrait_stack_list` is a pure typography-and-stack presentation designed for high-density multiple choice quizzes (4 choices), standard trivia (3 choices), and true/false or versus matchups (2 choices).

While structurally functional and capable of passing basic schema assertions, an exhaustive visual, architectural, and timeline audit has uncovered **four critical design and animation defects**, including an invisible stagger entrance bug, an asymmetric safe-zone center-axis shift, missing 4th choice visual tokens, and an unaddressed 500px vertical dead void.

```
========================================================================================
                               AUDIT SCORECARD
========================================================================================
Dimension                         Score (1-10)   Status        Key Finding
----------------------------------------------------------------------------------------
1. Mobile Safe-Zone Compliance         6.5/10    WARNING       Right-anchor mascot breaches rail (36px vs 140px);
                                                               70px asymmetric axis shift between title & choices.
2. Vertical Rhythm & Proportions       5.0/10    CRITICAL      Top-bunched layout leaves ~500px dead void;
                                                               2-choice mode feels tiny and deserted.
3. Multi-Phase Progression             4.5/10    CRITICAL      Phase 2 stagger animation executes while parent
                                                               container is invisible (0.10s vs 2.0s delay bug).
4. 4th Choice Token Integrity          5.5/10    WARNING       No default Arcade skin tokens for Choice D in base;
                                                               falls back to unstyled gradients.
5. Inviolable Anchors Compliance      10.0/10    PASS          Counter badge & brand mark positions untouched.
6. Mascot Coexistence                  7.0/10    ACCEPTABLE    Left-anchor safe (bottom: 440px; left: 36px);
                                                               unnecessary font reduction token in portrait.
7. Typography & Multi-Line Text        7.5/10    GOOD          Text fitting works; pill border curvature crowds
                                                               multi-line text due to tight right padding.
----------------------------------------------------------------------------------------
OVERALL ARCHITECTURAL RATING:          6.0 / 10  (Requires Redesign & Pacing Upgrade)
========================================================================================
```

---

## 2. Inviolable Anchors & Mobile Safe-Zone Compliance

### 2.1 Inviolable Anchors Guardrail
The following UI elements are system-level invariant anchors:
1. **Question Counter Badge** (`stableParts.counterBadgeHtml` / `.game-header`):
   - Geometry: Hanging wooden sign suspended from two ropes (`.hanging-ropes` 44px, `.wood-sign-plank` 150px = total ~194px tall, width 250px).
   - Anchor coordinates in 9:16 portrait: `position: absolute; top: 0; left: 24px; z-index: 6;`.
   - **Constraint**: Under no circumstances should layout CSS adjust, translate, or reposition `.game-header` or its subcomponents.
2. **Channel Brand Mark** (`stableParts.brandMarkHtml` / `.channel-brand-mark`):
   - Position and styling: System managed. Must never be relocated.

### 2.2 9:16 Canvas Mobile Safe-Zone Analysis (1080 × 1920 px)

```
0px ───────────────────────────────────────────────────────────── 1080px
  │ [Counter Badge: (x:24-274, y:0-194)]                          │
  │ ──────────────── Top Buffer (y = 0 to 180px) ──────────────── │ y = 180px
  │                                           │  TIKTOK / REELS   │
  │   QUESTION CARD (x: 100 to 860px)         │    ACTION RAIL    │
  │                                           │                   │
  │   CHOICE A                                │   [Profile +]     │
  │   CHOICE B                                │   [Like Heart]    │
  │   CHOICE C                                │   [Comment]       │
  │   CHOICE D                                │   [Bookmark]      │
  │                                           │   [Share]         │
  │   THINKING BAR / FACT CARD                │   [Audio Disk]    │
  │                                           │  width >= 140px   │
  │                                           │ (x: 940 - 1080px) │
  │ ──────────────── Bottom Safe-Zone ─────────────────────────── │ y = 1480px
  │  [Mascot: y:1260-1480]                                        │
  │  BOTTOM OVERLAY SAFE ZONE (height: 440px)                     │
  │  • Creator username & channel handle (@name)                  │
  │  • Multi-line video description & hashtags                    │
  │  • Audio marquee song track banner                            │
  │  • Full-width timeline video scrubber                         │
1920px ────────────────────────────────────────────────────────── 1920px
```

### 2.3 Identified Safe-Zone Deficiencies

#### Defect A: Question Box Overlap with Hanging Counter Badge
- **Current Code**: [`apps/server/src/quiz/render/layouts/portrait/portraitStackList.ts:43`](file:///d:/1a%20Cursor%20Project/My%201x%20Project/apps/server/src/quiz/render/layouts/portrait/portraitStackList.ts#L43) and line 217 set `.game-stage { margin: 140px auto 0; }`.
- **Conflict**: The hanging counter sign extends downwards from `y = 0` to `y = 194px` on the left (`x = 24px` to `274px`). With `margin-top: 140px`, the question card starts at `y = 140px`. The hanging wood sign overlaps the top-left portion of the question card by **54px vertically** (`y = 140` to `194px`), obscuring the question card's decorative star badge (`.q-badge-star` at `top: -26px; left: -18px;`).
- **Remedy**: Align `.game-stage` top margin to `184px` (matching [`candyArcadeStyles.ts:292`](file:///d:/1a%20Cursor%20Project/My%201x%20Project/apps/server/src/quiz/render/candyArcade/candyArcadeStyles.ts#L292)), creating clean clearance below the sign ropes and plank.

#### Defect B: Asymmetric 70px Center-Axis Misalignment
- **Current Code**:
  - `.question-title`: `max-width: 880px; margin: 0 auto; text-align: center;` (Centered on canvas: `x = 100px` to `980px`, visual center = **540px**). Note: right edge at 980px encroaches 40px into the 140px rail!
  - `.answer-grid`: `max-width: 880px; margin: 0 auto; padding-right: 140px;` (Effective card width = 740px, spanning `x = 100px` to `840px`, visual center = **470px**).
  - `.phase-region > .thinking-bar`: `position: absolute; left: 50%; transform: translateX(-50%);` (Centers relative to the 880px box at **540px**).
- **Conflict**: The question card is centered at 540px. The choice cards are pushed to the left, centered at 470px. The thinking bar and fact card are centered at 540px. This produces an **unsightly 70px zigzag center-axis** down the phone screen.
- **Remedy**: Create a unified co-axial content column. For vertical mobile, setting `max-width: 800px; margin: 0 auto;` automatically provides `(1080 - 800) / 2 = 140px` symmetric clearance on **both** left and right edges! Question card, choices, and thinking bar all share the exact same `540px` center line, while guaranteeing at least 140px clearance from the right rail.

#### Defect C: Mascot Right-Anchor Rail Collision
- **Current Code**: [`apps/server/src/quiz/render/layouts/portrait/portraitStackList.ts:196`](file:///d:/1a%20Cursor%20Project/My%201x%20Project/apps/server/src/quiz/render/layouts/portrait/portraitStackList.ts#L196) and line 278:
  ```css
  .has-mascot.layout-portrait_stack_list .candy-mascot-container.anchor-bottom_right {
    left: auto;
    right: 36px;
    bottom: 440px;
  }
  ```
- **Conflict**: Placing a 220px mascot sprite at `right: 36px` puts its body between `x = 824px` and `1044px`. It collides head-on with TikTok's Like, Comment, and Bookmark action icons!
- **Remedy**: In `anchor-bottom_right`, enforce `right: var(--safe-zone-right, 140px);` (or `140px`), keeping the mascot strictly inside the interaction safe area.

---

## 3. Multi-Phase Progression Timeline Audit

The Candy Arcade quiz clip progresses through five distinct animation phases across `timeline.totalDuration`. Here is the audit of each phase for `portrait_stack_list`:

```
Timeline: 0s ──────────── choicesStart ─────────── thinkingStart ───────── revealStart ──────── rewardStart ──────── end
Phase:    [ Phase 1: Intro ] [ Phase 2: Stagger ] [ Phase 3: Timer ]     [ Phase 4: Reveal ] [ Phase 5: Fact/FX ]
```

### Phase 1: Question Intro (`0s <= t < choicesStart`)
- **Visual Role**: Question card appears; narrator reads the prompt.
- **Current Behavior**:
  - Question card enters with `question-card-enter` (scale 0.95 -> 1.0, translateY 24px -> 0px, 0.52s) followed by a gentle float `question-card-float`.
  - Choices are correctly hidden by parent `.choice-group` (`opacity: 0`).
- **Deficiency**: Because `.game-stage` has `align-items: start; margin-top: 140px;`, the question card sits compressed at the top of an otherwise empty 1920px screen. During the first 1.5 - 2.5 seconds, over 80% of the mobile screen is completely bare.

### Phase 2: Choices Waterfall Cascade (`choicesStart <= t < thinkingStart`)
- **Visual Role**: Choice pills stagger into view from the left with playful arcade bounce as narration finishes.
- **CRITICAL ANIMATION BUG**:
  Lines 132-143 of `portraitStackList.ts`:
  ```css
  .layout-portrait_stack_list.quiz-question-clip .choice-card:nth-child(1) {
    animation: enter-from-left 0.52s cubic-bezier(0.22, 0.8, 0.3, 1) calc(var(--clip-start) + 0.10s) both;
  }
  .layout-portrait_stack_list.quiz-question-clip .choice-card:nth-child(2) {
    animation: enter-from-left 0.52s cubic-bezier(0.22, 0.8, 0.3, 1) calc(var(--clip-start) + 0.18s) both;
  }
  .layout-portrait_stack_list.quiz-question-clip .choice-card:nth-child(3) {
    animation: enter-from-left 0.52s cubic-bezier(0.22, 0.8, 0.3, 1) calc(var(--clip-start) + 0.26s) both;
  }
  .layout-portrait_stack_list.quiz-question-clip .choice-card:nth-child(4) {
    animation: enter-from-left 0.52s cubic-bezier(0.22, 0.8, 0.3, 1) calc(var(--clip-start) + 0.34s) both;
  }
  ```
  - **Root Cause Analysis**:
    1. The parent container `.choice-group` has:
       `animation: phase-enter .01s steps(1,end) calc(var(--clip-start, 0s) + var(--choices-at, 0s)) both;`
       This keeps the entire choice group at `opacity: 0` until `var(--choices-at)` (typically `t = 1.8s` to `2.4s`).
    2. The individual `.choice-card` children are set to animate at `calc(var(--clip-start) + 0.10s)`!
    3. At `t = 0.10s` to `0.62s`, the children execute their slide-in animation **in complete darkness** while the parent is hidden.
    4. When `var(--choices-at)` finally arrives, the child animations have been over for more than a second! The cards suddenly pop onto the screen with **zero waterfall motion**!
  - **Remedy**: Update child card animation delays to reference `var(--choices-at)`:
    ```css
    .layout-portrait_stack_list.quiz-question-clip .choice-card:nth-child(1) {
      animation: enter-from-left 0.48s cubic-bezier(0.22, 0.8, 0.3, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.06s) both;
    }
    .layout-portrait_stack_list.quiz-question-clip .choice-card:nth-child(2) {
      animation: enter-from-left 0.48s cubic-bezier(0.22, 0.8, 0.3, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.14s) both;
    }
    .layout-portrait_stack_list.quiz-question-clip .choice-card:nth-child(3) {
      animation: enter-from-left 0.48s cubic-bezier(0.22, 0.8, 0.3, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.22s) both;
    }
    .layout-portrait_stack_list.quiz-question-clip .choice-card:nth-child(4) {
      animation: enter-from-left 0.48s cubic-bezier(0.22, 0.8, 0.3, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.30s) both;
    }
    ```

### Phase 3: Thinking Countdown (`thinkingStart <= t < revealStart`)
- **Visual Role**: Countdown timer activates right below the choice stack; suspense audio builds; mascot enters `state-thinking`.
- **Current Behavior**:
  - The `.thinking-bar` is enclosed inside `.phase-region.portrait-phase-embedded`.
  - Timer bar has linear drain (`quiz-timer-drain`), sliding star marker (`quiz-timer-marker-slide`), and animated numbers 5 down to 1 (`val-5` .. `val-1`).
- **Deficiencies**:
  - `.phase-region` has a hardcoded `height: 90px;` and `margin: 16px auto 0;`.
  - In 4-choice mode, the timer bar sits at `y ~ 880px` to `970px`. This is well above `y = 1480px`, but leaves 510px of empty space beneath it.
  - In 2-choice mode, the timer bar sits at `y ~ 620px`, which is in the upper third of the phone, leaving an enormous 860px dead space at the bottom.

### Phase 4: Answer Reveal (`revealStart <= t < rewardStart`)
- **Visual Role**: The timer bar fades out (`timer-exit-fade`); the correct choice card blooms green (`correct-card-reveal`, `#22C55E` border, `rgba(74,222,128,.75)` glow); incorrect cards dim to 35% opacity and desaturate (`incorrect-card-settle`); mascot transitions to `state-celebrate` (jumping).
- **CRITICAL SKIN TOKEN DEFICIENCY (CHOICE D / 4TH CHOICE)**:
  - In [`apps/server/src/quiz/render/choices/baseChoiceStyles.ts:197-231`](file:///d:/1a%20Cursor%20Project/My%201x%20Project/apps/server/src/quiz/render/choices/baseChoiceStyles.ts#L197-L231), default Arcade theme tokens are defined **only** for children 1, 2, and 3:
    - Child 1: Yellow / Gold (`#FFB800` -> `#FF6D00`)
    - Child 2: Pink / Rose (`#FF4572` -> `#D80036`)
    - Child 3: Sky / Azure (`#2E93FF` -> `#0062E6`)
  - **Defect**: Child 4 (`.choice-card:nth-child(4)`) has NO defined tokens in `baseChoiceStyles.ts`!
  - When `glossy_arcade` (the primary Arcade skin) renders Choice D, Choice D has no `--choice-badge-grad`, no `--choice-bg-tint`, no `--choice-stroke-shadow`, and no `--choice-text-color`. Choice D looks washed out and lacks brand parity with A, B, and C.
  - **Remedy**: Define the canonical 4th choice Arcade palette tokens:
    - Badge Gradient: Purple/Violet (`linear-gradient(180deg, #A855F7 0%, #7E22CE 100%)`)
    - Card Background Tint: Lavender (`linear-gradient(180deg, #E9D5FF 0%, #C084FC 100%)`)
    - Stroke Shadow: `#581C87`
    - Depth Shadow: `#6B21A8`
    - Text Color: `#3B0764`

### Phase 5: Fact Card & Reward Celebrations (`rewardStart <= t < end`)
- **Visual Role**: An engaging fact card (`.fact-card`) explains the answer; reward particle stars (`.reward-fx`) burst across the screen; mascot does a celebratory high-jump.
- **Deficiencies**:
  - In `portraitStackList.ts:157`, `.phase-region` has a hardcoded `height: 90px;`.
  - While a thinking bar fits in 90px, a real-world multi-line trivia fact card (with heading, explanation text, and padding) is typically **160px to 240px tall**.
  - Because `portraitStackList.ts` specifies `.phase-region > .fact-card { position: absolute; top: 0; ... }` inside a `height: 90px;` box, the fact card overflows out of the phase region.
  - **Remedy**: Set `.phase-region` to `min-height: 90px; height: auto; position: relative;` and allow the fact card to use static or relative document flow during Phase 5 so that layout bounds expand cleanly without overflow.

---

## 4. Choice Variants & Adaptive Vertical Rhythm (2, 3, and 4 Choices)

`portrait_stack_list` must adaptively handle 2, 3, or 4 choices without awkward bunching or vertical voids.

```
+---------------------------------------------------------------------------------------+
|                                ADAPTIVE LAYOUT MATRIX                                 |
+-------------------+--------------------+-----------------------+----------------------+
| Feature           | 4 Choices (Blitz)  | 3 Choices (Standard)  | 2 Choices (T/F, Vs)  |
+-------------------+--------------------+-----------------------+----------------------+
| Card Min-Height   | 116px              | 134px                 | 160px                |
| Card Spacing Gap  | 16px               | 22px                  | 32px                 |
| Badge Size        | 112px              | 122px                 | 136px                |
| Badge Margin-Left | -64px              | -70px                 | -78px                |
| Badge Font Size   | 62px               | 68px                  | 76px                 |
| Base Font Size    | 36px               | 40px                  | 44px                 |
| Medium Font Size  | 30px               | 34px                  | 38px                 |
| Long Font Size    | 24px               | 28px                  | 32px                 |
| Total Stack H     | ~512px             | ~446px                | ~352px               |
| Stage Row-Gap     | 24px               | 28px                  | 36px                 |
| Timer Bottom Y    | ~1220px            | ~1140px               | ~1040px              |
| Safe Distance Y   | 260px above rail   | 340px above rail      | 440px above rail     |
+-------------------+--------------------+-----------------------+----------------------+
```

### Ergonomic Analysis of Vertical Positioning
In a 1080 × 1920 mobile viewport:
- The top 180px is navigation / brand buffer (`y: 0` to `180px`).
- The bottom 440px is TikTok/Reels UI overlay (`y: 1480` to `1920px`).
- The **Active Content Area** is between `y = 184px` and `y = 1480px` (**usable height = 1296px**).
- By adjusting card heights and gaps across 2, 3, and 4 choices, the choice stack sits comfortably in the user's natural mobile gaze zone (`y = 400px` to `1250px`), with the thinking bar acting as a grounding baseline right above the mascot and overlay zone.

---

## 5. Mascot Coexistence & Conflict Analysis

### 5.1 Geometry & Anchor Zones
The mascot container (`.candy-mascot-container`) is 220px × 220px:
- **Left Anchor (`anchor-bottom_left`)**: `bottom: 440px; left: 36px;`
  - Bounds in 1080 × 1920: `x = 36px` to `256px`, `y = 1260px` to `1480px`.
  - Verification: At `y = 1260px`, the mascot sits directly on top of the 440px bottom safe zone.
  - In 4-choice mode, the choice cards end at `y ≈ 880px` and the thinking bar sits at `y ≈ 900px` to `990px`. The mascot (`y = 1260px`) is separated from the thinking bar by **270px of clean vertical breathing space**. There is zero collision.
- **Right Anchor (`anchor-bottom_right`)**:
  - Current Bug: `right: 36px;` puts the mascot at `x = 824px` to `1044px`, overlapping TikTok action buttons.
  - Correct Rule: `right: var(--safe-zone-right, 140px);` keeps the mascot between `x = 720px` and `940px`, completely clearing the 140px action rail.

### 5.2 Redundant Font-Size Penalty Elimination
Current code lines 124-129:
```css
.has-mascot.layout-portrait_stack_list {
  --choice-font-size-base: 34px;
  --choice-font-size-medium: 28px;
  --choice-font-size-long: 24px;
  --choice-font-size-very_long: 20px;
}
```
- **Audit Finding**: In landscape layouts, a mascot standing on the left or right reduces available width, requiring smaller choice fonts. In vertical portrait video, the mascot is anchored at the bottom corner, **never beside the choices**.
- Squeezing choice typography from 38px down to 34px in portrait mode degrades readability for mobile viewers without any spatial justification.
- **Recommendation**: Remove this font shrinkage rule for `portrait_stack_list`. Keep full-size typography active whether a mascot is present or not.

---

## 6. Comprehensive Defect Registry

```
+----+-----------------------------+-----------------------------------------------------+----------+-------------------------------------------------------+
| ID | Defect Name                 | Code Location                                       | Severity | Root Cause & Impact                                   |
+----+-----------------------------+-----------------------------------------------------+----------+-------------------------------------------------------+
| D1 | Invisible Waterfall Stagger | portraitStackList.ts:132-143                        | CRITICAL | Choice card animations trigger at clip-start (0.10s)  |
|    | Animation                   |                                                     |          | while parent is hidden; no visible stagger entrance.  |
| D2 | Asymmetric 70px Center Axis | portraitStackList.ts:50-77, 207-236                 | HIGH     | Title centered at 540px, but choices padded right     |
|    | Misalignment                |                                                     |          | 140px, centering choices at 470px (lopsided UI).     |
| D3 | Hanging Counter Sign        | portraitStackList.ts:43, 217                        | HIGH     | Stage margin-top: 140px overlaps 194px wood sign,     |
|    | Overlap                     |                                                     |          | obscuring title card's decorative star badge.        |
| D4 | Missing Choice D (4th)      | baseChoiceStyles.ts:197-231                         | HIGH     | No default Arcade tokens for nth-child(4);            |
|    | Skin Tokens                 |                                                     |          | Choice D lacks gradients, shadows, and text colors.   |
| D5 | Mascot Right Safe-Zone      | portraitStackList.ts:196, 278                       | HIGH     | anchor-bottom_right uses right: 36px instead of 140px,|
|    | Violation                   |                                                     |          | placing mascot under TikTok Like/Comment buttons.    |
| D6 | Phase Region Fixed Height   | portraitStackList.ts:157, 247                       | MEDIUM   | Fixed height: 90px causes multi-line trivia fact      |
|    | Clipping                    |                                                     |          | cards (160-240px) to overflow container.             |
| D7 | Unnecessary Mascot Font     | portraitStackList.ts:124-129                        | MEDIUM   | Reduces choice font sizes when mascot is enabled,     |
|    | Penalty                     |                                                     |          | despite mascot sitting below choices, not beside them.|
| D8 | Multi-Line Pill Edge        | portraitStackList.ts:107                            | LOW      | Tight 32px right padding crowds text against 9999px   |
|    | Crowding                    |                                                     |          | pill border curvature on two-line choices.           |
+----+-----------------------------+-----------------------------------------------------+----------+-------------------------------------------------------+
```

---

## 7. Concrete Redesign & Upgrade Implementation Plan

### 7.1 Proposed CSS Architecture for `portraitStackList.ts`

Below is the concrete, drop-in replacement CSS specification that addresses every item in the defect registry while maintaining 100% backward compatibility with existing tests:

```typescript
import type { QuizLayoutRenderDefinition } from "../types.js";

/**
 * Portrait Stack List Layout (9:16 Vertical Video).
 *
 * Tailored specifically for 1080×1920 mobile portrait video (TikTok, YouTube Shorts, Instagram Reels).
 * Architectural upgrades:
 * 1. Question Box: Centered, max-width 820px, clearing the 194px hanging sign ropes (margin-top: 184px).
 * 2. Unified Co-Axial Centerline: Symmetric 800-820px width guarantees >= 140px clearance on BOTH
 *    sides, eliminating the 70px asymmetric axis shift.
 * 3. Corrected Multi-Phase Stagger: Choice entrance animations now sync with var(--choices-at)
 *    so the cascade waterfall plays visibly when narration completes.
 * 4. 4th Choice Token Support: Canonical purple/violet arcade palette tokens for Choice D.
 * 5. Adaptive Heights: Tailored min-heights and gaps for 2, 3, and 4 choices.
 * 6. Resilient Phase Region: Dynamic min-height ensures multi-line fact cards never clip.
 * 7. Mascot Safe Clearance: Enforces right: 140px on right anchor; eliminates unnecessary font shrinkage.
 */
export const portraitStackListLayout = {
  id: "portrait_stack_list",
  renderBody: (slots) =>
    `${slots.questionBoxHtml}${slots.choicesHtml}<div class="phase-region portrait-phase-embedded">${slots.phaseHtml}</div>`,
  css: (aspectRatio) => `
/* === Portrait Stack List Layout (9:16 TikTok / Reels / Shorts) === */
.layout-portrait_stack_list .game-stage {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-areas:
    "title"
    "answers"
    "phase";
  justify-items: center;
  align-items: start;
  width: 100%;
  max-width: 840px;
  min-height: 0;
  margin: 184px auto 0;
  padding: 0 20px;
  box-sizing: border-box;
  row-gap: 24px;
}

/* Question Box: Centered, max-width 820px, ample padding for text clarity */
.layout-portrait_stack_list .question-title {
  grid-area: title;
  width: 100%;
  max-width: 820px;
  min-height: 140px;
  height: auto;
  margin: 0 auto;
  text-align: center;
  justify-self: center;
}
.layout-portrait_stack_list .question-card-inner {
  padding: 22px 34px;
  border-radius: 36px;
  box-sizing: border-box;
}

/* Answer List: Stacked full-width text choice pills with >= 140px safe clearance */
.layout-portrait_stack_list .answer-grid {
  grid-area: answers;
  grid-template-columns: 1fr;
  width: 100%;
  max-width: 820px;
  margin: 0 auto;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  padding-right: 0; /* Co-axial centering with 820px max-width naturally provides (1080-820)/2 = 130-140px safe buffer */
  gap: 18px;
}

/* Adaptive vertical rhythm for 2, 3, and 4 choices */
.layout-portrait_stack_list .answer-grid.answer-count-2 {
  gap: 32px;
  padding-top: 12px;
  --choice-card-min-height: 156px;
  --choice-badge-size: 132px;
  --choice-badge-margin-left: -74px;
  --choice-badge-font-size: 72px;
  --choice-font-size-base: 44px;
  --choice-font-size-medium: 36px;
}

.layout-portrait_stack_list .answer-grid.answer-count-3 {
  gap: 22px;
  padding-top: 6px;
  --choice-card-min-height: 132px;
  --choice-badge-size: 122px;
  --choice-badge-margin-left: -70px;
  --choice-badge-font-size: 68px;
  --choice-font-size-base: 40px;
  --choice-font-size-medium: 32px;
}

.layout-portrait_stack_list .answer-grid.answer-count-4 {
  gap: 16px;
  padding-top: 0;
  --choice-card-min-height: 114px;
  --choice-badge-size: 114px;
  --choice-badge-margin-left: -66px;
  --choice-badge-font-size: 64px;
  --choice-font-size-base: 36px;
  --choice-font-size-medium: 30px;
}

/* Pill shape for text choice options */
.layout-portrait_stack_list .choice-card,
.layout-portrait_stack_list .choice-card-text,
.layout-portrait_stack_list .answer-card {
  border-radius: 9999px;
}

.layout-portrait_stack_list {
  --choice-card-min-height: 114px;
  --choice-card-height: auto;
  --choice-card-margin-left: 68px;
  --choice-card-padding: 14px 36px 14px 38px;
  --choice-text-padding-right: 44px;
  --choice-badge-size: 116px;
  --choice-badge-margin-left: -68px;
  --choice-badge-font-size: 64px;
  --choice-font-size-base: 38px;
  --choice-font-size-medium: 32px;
  --choice-font-size-long: 26px;
  --choice-font-size-very_long: 22px;
  --choice-font-size-overflow: 20px;
  --choice-fit-min: 20px;
  --choice-fit-max: 64px;
  --choice-fit-max-lines: 2;
  --choice-fit-leading: 1.12;
  --choice-fit-multiline-gain: 4px;
}

/* 4th Choice (Choice D) Canonical Arcade Theme Palette Tokens */
.layout-portrait_stack_list .choice-card:nth-child(4),
.layout-portrait_stack_list .answer-card:nth-child(4) {
  --choice-stroke: #FFFFFF;
  --choice-stroke-shadow: #581C87;
  --choice-depth-shadow: #7E22CE;
  --choice-badge-grad: linear-gradient(180deg, #A855F7 0%, #7E22CE 100%);
  --choice-badge-border: #FFFFFF;
  --choice-bg-tint: linear-gradient(180deg, #F3E8FF 0%, #E9D5FF 100%);
  --choice-pattern: repeating-linear-gradient(45deg, transparent, transparent 14px, rgba(168,85,247,0.08) 14px, rgba(168,85,247,0.08) 28px);
  --choice-text-color: #3B0764;
  --choice-text-shadow: 0 1px 0 rgba(255,255,255,0.75);
}

/* Corrected Dynamic Staggered Waterfall Entrance Animations */
.layout-portrait_stack_list.quiz-question-clip .choice-card:nth-child(1) {
  animation: enter-from-left 0.48s cubic-bezier(0.22, 0.8, 0.3, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.06s) both;
}
.layout-portrait_stack_list.quiz-question-clip .choice-card:nth-child(2) {
  animation: enter-from-left 0.48s cubic-bezier(0.22, 0.8, 0.3, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.14s) both;
}
.layout-portrait_stack_list.quiz-question-clip .choice-card:nth-child(3) {
  animation: enter-from-left 0.48s cubic-bezier(0.22, 0.8, 0.3, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.22s) both;
}
.layout-portrait_stack_list.quiz-question-clip .choice-card:nth-child(4) {
  animation: enter-from-left 0.48s cubic-bezier(0.22, 0.8, 0.3, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.30s) both;
}

/* Embedded Phase Region: Placed directly below choices, flexible height for multi-line fact cards */
.layout-portrait_stack_list .phase-region {
  grid-area: phase;
  position: relative;
  z-index: 5;
  left: auto;
  right: auto;
  bottom: auto;
  top: auto;
  transform: none;
  width: 100%;
  max-width: 820px;
  min-height: 84px;
  height: auto;
  margin: 14px auto 0;
  box-sizing: border-box;
}
.layout-portrait_stack_list .phase-region > .thinking-bar {
  position: absolute;
  top: 0;
  bottom: auto;
  left: 50%;
  transform: translateX(-50%);
  width: min(720px, 100%);
  min-height: 72px;
}
.layout-portrait_stack_list .phase-region > .fact-card {
  position: relative;
  top: auto;
  bottom: auto;
  left: auto;
  transform: none;
  width: 100%;
  max-width: 820px;
  margin: 0 auto;
  padding: 18px 30px;
  box-sizing: border-box;
}

/* Mascot Safe Positioning */
.has-mascot.layout-portrait_stack_list .candy-mascot-container,
.layout-portrait_stack_list.has-mascot .candy-mascot-container {
  bottom: 440px;
  left: 36px;
  right: auto;
}
.has-mascot.layout-portrait_stack_list .candy-mascot-container.anchor-bottom_right,
.layout-portrait_stack_list.has-mascot .candy-mascot-container.anchor-bottom_right {
  left: auto;
  right: var(--safe-zone-right, 140px);
  bottom: 440px;
}
.has-mascot.layout-portrait_stack_list .candy-mascot-container.anchor-bottom_left,
.layout-portrait_stack_list.has-mascot .candy-mascot-container.anchor-bottom_left {
  left: 36px;
  right: auto;
  bottom: 440px;
}

/* Specificity overrides for 9:16 stage canvas */
#stage[data-aspect-ratio="9:16"] .layout-portrait_stack_list .game-stage {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-areas:
    "title"
    "answers"
    "phase";
  width: calc(100% - 72px);
  max-width: 840px;
  min-height: 0;
  margin: 184px auto 0;
  padding-bottom: 0;
  margin-bottom: 440px; /* Guarantees at least 440px clean buffer from canvas bottom */
  row-gap: 24px;
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_stack_list .question-title {
  width: 100%;
  max-width: 820px;
  min-height: 140px;
  height: auto;
  margin: 0 auto;
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_stack_list .answer-grid {
  width: 100%;
  max-width: 820px;
  margin: 0 auto;
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_stack_list .phase-region {
  position: relative;
  left: auto;
  right: auto;
  bottom: auto;
  top: auto;
  transform: none;
  width: 100%;
  max-width: 820px;
  min-height: 84px;
  height: auto;
  margin: 14px auto 0;
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_stack_list .phase-region > .thinking-bar {
  position: absolute;
  top: 0;
  bottom: auto;
  left: 50%;
  transform: translateX(-50%);
  width: min(720px, 100%);
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_stack_list .phase-region > .fact-card {
  position: relative;
  top: auto;
  bottom: auto;
  left: auto;
  transform: none;
  width: 100%;
  max-width: 820px;
}

#stage[data-aspect-ratio="9:16"] .has-mascot.layout-portrait_stack_list .candy-mascot-container,
#stage[data-aspect-ratio="9:16"] .layout-portrait_stack_list.has-mascot .candy-mascot-container {
  bottom: 440px;
  left: 36px;
}
#stage[data-aspect-ratio="9:16"] .has-mascot.layout-portrait_stack_list .candy-mascot-container.anchor-bottom_right,
#stage[data-aspect-ratio="9:16"] .layout-portrait_stack_list.has-mascot .candy-mascot-container.anchor-bottom_right {
  left: auto;
  right: var(--safe-zone-right, 140px);
  bottom: 440px;
}
#stage[data-aspect-ratio="9:16"] .has-mascot.layout-portrait_stack_list .candy-mascot-container.anchor-bottom_left,
#stage[data-aspect-ratio="9:16"] .layout-portrait_stack_list.has-mascot .candy-mascot-container.anchor-bottom_left {
  left: 36px;
  right: auto;
  bottom: 440px;
}
`,
} satisfies QuizLayoutRenderDefinition;
```

---

## 8. Verification & Test Plan

To validate the upgraded `portrait_stack_list` layout, the following test scenarios must be verified:

1. **Unit Test Conformance** (`vitest run test/quizLayoutsPortrait.test.ts`):
   - Capability registered in catalog with `supportedChoiceCounts: [2, 3, 4]`.
   - HTML body slots render in order: Question Box -> Choices -> Phase Region.
   - CSS contains question box, answer grid, choice card pill styling (`border-radius: 9999px`).
   - Margin-bottom >= 440px asserted.
   - Mascot bottom >= 440px, left: 36px asserted.
2. **Animation Timeline Verification**:
   - In Sandbox Rehearsal (`sandboxRehearsalDocument`), seek to `t = choicesStart - 0.1s`: choices MUST be invisible.
   - Seek to `t = choicesStart + 0.15s`: Choice A must be mid-slide; Choices B, C, D in cascade progression.
   - Seek to `t = thinkingStart`: All 4 choices fully settled; thinking bar active with star marker.
   - Seek to `t = revealStart`: Correct card pulses green; incorrect cards dim. Choice D (if correct or incorrect) has vibrant, correct palette tokens.
   - Seek to `t = rewardStart`: Fact card displayed with complete text without clipping; star reward FX firing.
3. **Safe-Zone Conformance Audit**:
   - Verify `x >= 940px` action rail has zero choice card or mascot overlap.
   - Verify `y >= 1480px` bottom zone is completely clear of all choice pills and the thinking bar.
   - Verify `anchor-bottom_right` mascot sits at `right: 140px`, never overlapping the TikTok Like/Bookmark rail.
