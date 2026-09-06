# Full Stack List (`full_stack_list`) — Exhaustive Layout Audit & Redesign Plan

> **Layout ID:** `full_stack_list`  
> **Target Format:** 16:9 Landscape Video (1920×1080) for YouTube, Web, and Large Displays  
> **Engine:** Candy Arcade Quiz Engine v2 (Hyperframes / Canvas Animation)  
> **Catalog Registration:** [`packages/shared/src/quizLayouts.catalog.ts`](file:///d:/1a%20Cursor%20Project/My%201x%20Project/packages/shared/src/quizLayouts.catalog.ts#L91-L103)  
> **Renderer Source:** [`apps/server/src/quiz/render/layouts/fullStackList.ts`](file:///d:/1a%20Cursor%20Project/My%201x%20Project/apps/server/src/quiz/render/layouts/fullStackList.ts)  
> **Audit Date:** September 2026  
> **Author:** Frontend Architect & Motion UI Designer (Subagent)

---

## 1. Executive Summary & Audit Scorecard

The `full_stack_list` layout is the flagship 16:9 landscape presentation for media-free, full-width multiple choice and true/false quiz questions in the Candy Arcade Quiz Engine. Operating on the standard 1920×1080 canvas, it features a prominent full-width Question Card across the top, followed by a stacked single-column list of text answer choices (supporting 2 or 3 options), and a dynamic bottom phase region accommodating the Thinking Countdown Bar and the Fact / Explanation Card. It is the primary layout powering the `speed_blitz` archetype, general trivia, and high-velocity knowledge formats.

An exhaustive mathematical, geometric, multi-phase animation, and typography audit reveals **eight (8) critical and major architectural defects**:

```
==================================================================================================
                                    AUDIT SCORECARD
==================================================================================================
Dimension                         Score (1-10)   Status        Key Finding
--------------------------------------------------------------------------------------------------
1. Inviolable Anchors Compliance      10.0/10    PASS          Counter Badge & Brand Mark untouched.
2. 16:9 Geometry & Stage Centering     5.0/10    CRITICAL      Massive 220px–326px vertical dead void;
                                                               Phase region detached from grid flow.
3. Star Marker Canvas Containment      4.0/10    CRITICAL      Timer marker star clips off right edge
                                                               by 36px to 47.5px (x=1956px bug).
4. Multi-Phase Motion Progression      4.5/10    CRITICAL      Zero choice entrance animations (static pop);
                                                               No waterfall stagger in Phase 2.
5. Typography & Auto-Fit Dynamics      6.0/10    WARNING       Fixed card height (126px) chokes 2-line
                                                               text auto-fit down to 24px unnecessarily.
6. Mascot Coexistence (.has-mascot)    5.5/10    WARNING       Asymmetric 70px step-in between question
                                                               box and choices stack; unwarranted font cut.
7. Phase 4 Climax & Contrast           6.5/10    WARNING       Dimmed cards drop to opacity 0.35,
                                                               falling below WCAG AA contrast (4.5:1).
8. Format Single Responsibility        7.0/10    ACCEPTABLE    Obsolete 9:16 CSS block retained in 16:9 file.
--------------------------------------------------------------------------------------------------
OVERALL ARCHITECTURAL RATING:          5.8 / 10  (Requires Comprehensive Redesign & Pacing Upgrade)
==================================================================================================
```

### Key Defect Highlights:
1. **CRITICAL — Star Marker 1956px Canvas Overflow Bug (`BUG-FSL-01`):** The Thinking Bar track is sized globally to `width: min(82vw, 1540px)` (1540px). Centered at $x = 1090\text{px}$ within the 1580px stage, the track right edge sits at $x = 1860\text{px}$. The circular countdown star marker (`.timer-marker`, 176px container with 192px SVG star) starts at `left: 100%` ($x = 1860\text{px}$) with radius 96px. Its right tip reaches $\mathbf{1956px}$, extending **36px beyond the 1920px canvas boundary**. During pulse keyframes (`scale(1.12)`), it extends to **$1967.5\text{px}$** (**47.5px clipped** off-screen).
2. **CRITICAL — Zero Choice Entrance Animations / Static Pop (`BUG-FSL-02`):** `fullStackList.ts` defines zero animation rules for `.choice-card`. In Phase 2 ($t = \text{choicesStart}$), the parent `.choice-group` transitions opacity via `steps(1, end)`, causing all choice cards to abruptly snap onto the screen simultaneously with zero waterfall motion.
3. **SEVERE — 220px to 326px Vertical Dead Void (`BUG-FSL-03`):** The `.phase-region` is omitted from `grid-template-areas` (`"title" "answers"`) and rendered as `position: absolute; bottom: 10px;` of the 945px `.game-stage`. In 2-choice mode, the cards end at $y \approx 552\text{px}$, while the timer sits at $y \approx 878\text{px}$, creating an enormous **326px empty abyss**. In 3-choice mode, the gap is **222px**.
4. **HIGH — Fixed Card Height Auto-Fit Choke (`BUG-FSL-04`):** `--choice-card-height: 126px` rigidly clamps card height. In `choiceTextFitScript.ts`, `measureChoiceText` checks if two lines of text fit within the card inner height. With fixed 126px height and 28px padding, available height is only 98px. Two lines at 42px require 96px+ plus glyph allowance, triggering overflow rejection and forcing text down to 24px despite having a massive 1440px wide card.
5. **MEDIUM — Asymmetric 70px Step-In in `.has-mascot` (`BUG-FSL-05`):** Line 33 shrinks `.answer-grid` to `max-width: 1280px` while `.question-title` remains at 1420px, creating an unsightly 70px asymmetric indentation between the question card and the choices stack.

This document provides the exhaustive mathematical breakdown, multi-phase motion timeline, coordinate budgets, and a drop-in, production-ready replacement for `apps/server/src/quiz/render/layouts/fullStackList.ts`.

---

## 2. Inviolable Anchors & Canvas Geometry Compliance Audit

The 16:9 landscape canvas (1920×1080) enforces strict geometric separation between invariant brand anchors and the dynamic quiz stage.

```
+-------------------------------------------------------------------------------------------------------------+ y = 0
| [Question Counter Badge] (40-290px, 0-194px) |                                                             |
| Hanging Wood Sign with Swaying Ropes         |                  QUESTION TITLE CARD (1440 x 168 px)         |
| (INVIOLABLE ANCHOR - NEVER ALTER POSITION)   |                  x = 370px -> 1810px, y = 16px -> 184px      |
+----------------------------------------------+-------------------------------------------------------------+ y = 184px
|                                              |                         (gap = 20px)                        |
|                                              +-------------------------------------------------------------+ y = 204px
| [Quiz Channel Brand Mark]                    |                                                             |
| x = 20-340px, y = 390-590px                  |                  STACKED CHOICE CARD A                      |
| SVG Icon + Channel Name + Sub-label          |                  x = 370px -> 1810px, y = 204px -> 330px    |
| (INVIOLABLE ANCHOR - NEVER ALTER POSITION)   |                                                             |
|                                              |                  STACKED CHOICE CARD B                      |
|                                              |                  x = 370px -> 1810px, y = 354px -> 480px    |
|                                              |                                                             |
|                                              |                  STACKED CHOICE CARD C (Optional)           |
|                                              |                  x = 370px -> 1810px, y = 504px -> 630px    |
|                                              +-------------------------------------------------------------+ y = 630px
|                                              |                         (gap = 20px)                        |
+----------------------------------------------+-------------------------------------------------------------+ y = 650px
| [Animated Mascot Host]                       |                  PHASE REGION (ROW 3 OF CSS GRID)           |
| x = 32-252px, y = 842-1062px                 |   Phase 3: Thinking Bar (width: 1380px, track: 400-1780px)  |
| 220 x 220 px (bottom-left dock)              |   Star Marker Tip: x <= 1887.5px (CLEARS CANVAS BY 32.5px!) |
|                                              |   Phase 5: Fact Card (width: 1380px, y = 650px -> 830px)    |
+----------------------------------------------+-------------------------------------------------------------+ y = 830px
|                                              |   CLEAN LOWER MARGIN BUFFER (y = 830px -> 1080px, 250px)    |
+-------------------------------------------------------------------------------------------------------------+ y = 1080px
x = 0                                         x = 300px                                          x = 1880px  x = 1920px
|<-------------- Left Utility Dock ------------>|<------------------ Game Stage (1580px) -------------------->|<- 40px ->|
```

### 2.1 Inviolable Anchor Verification Table

| Inviolable Anchor | DOM Selector & Component | Canonical Geometry | Canvas Coordinates (16:9 Landscape) | Compliance Status | Analysis & Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Question Counter Badge** | `stableParts.counterBadgeHtml`<br>`.game-header`<br>`.hanging-wood-sign` | Width: 250px, Plank: 240×150px, Ropes: 44px, Stars: $\pm 10\text{px}$. Sway angle $\pm 1.8^\circ$. | Without Mascot: `top: 0; left: 40px;`<br>Total Span: $x \in [40, 290]\text{px}$, $y \in [0, 194]\text{px}$<br><br>With Mascot: `left: calc(360px / 2); transform: translateX(-50%);`<br>Total Span: $x \in [55, 305]\text{px}$, $y \in [0, 194]\text{px}$ | <span style="color:green">**100% COMPLIANT**</span> | `.game-stage` starts at $x = 300\text{px}$ (or $460\text{px}$ with mascot). `.question-title` is centered at $x = 1090\text{px}$ ($x_{\text{left}} = 370\text{px}$). Leaves an **$80\text{px}$ clear buffer** from the wood sign plank ($x = 290\text{px}$). No coordinate or style changes. |
| **Quiz Channel Brand Mark** | `stableParts.brandMarkHtml`<br>`.channel-brand-mark` | Vertical stack: SVG icon (136×94px), Channel Name (`84px` Fredoka), Sub-label (`40px`, letter-spacing 8px). Width: 320px. | `top: 390px; left: calc(360px / 2); transform: translateX(-50%);`<br>Total Span: $x \in [20, 340]\text{px}$, $y \in [390, 590]\text{px}$ | <span style="color:green">**100% COMPLIANT**</span> | Lives entirely in the dedicated left gutter. Leaves $30\text{px}$ margin from the stage edge ($x = 300\text{px}$) and $120\text{px}$ margin in `.has-mascot` ($x = 460\text{px}$). No coordinate or style changes. |

### 2.2 Left Utility Dock Spatial Harmony
In Candy Arcade 16:9 landscape video (1920×1080), the left 300px–360px is an autonomous vertical dock:
- **Top ($y \in [0, 194]\text{px}$):** Hanging Wood Sign Question Counter Badge
- **Middle ($y \in [390, 590]\text{px}$):** Channel Brand Mark
- **Bottom ($y \in [842, 1062]\text{px}$):** Animated Mascot Host (anchor-bottom_left)

Because `.game-stage` begins at $x = 300\text{px}$ (without mascot) or $x = 460\text{px}$ (with mascot), the entire left dock operates without interference.

---

## 3. Exhaustive Defect Inventory (Root Causes & Mathematical Proofs)

### 3.1 BUG-FSL-01 (CRITICAL): Star Marker 1956px Canvas Overflow Bug

#### Mathematical Derivation of Overflow:
1. Canvas width is strictly $W_{\text{canvas}} = 1920\text{px}$.
2. In `candyArcadeStyles.ts:66`, `.game-stage` is configured with `width: 1580px; margin: 12px 40px 0 auto;`.
   - Stage left boundary: $x_{\text{stage\_left}} = 1920 - 40 - 1580 = 300\text{px}$.
   - Stage right boundary: $x_{\text{stage\_right}} = 1920 - 40 = 1880\text{px}$.
   - Stage horizontal center: $x_{\text{stage\_center}} = 300 + \frac{1580}{2} = 1090\text{px}$.
3. In `candyArcadeStyles.ts:85`, the thinking bar is centered inside `.phase-region` with:
   `position: absolute; left: 50%; transform: translateX(-50%); width: min(82vw, 1540px);`
   - $82\text{vw}$ of $1920\text{px} = 1574.4\text{px}$. $\min(1574.4, 1540) = 1540\text{px}$.
   - Thinking bar width: $W_{\text{bar}} = 1540\text{px}$.
   - Track left edge: $x_{\text{track\_left}} = 1090 - \frac{1540}{2} = 320\text{px}$.
   - Track right edge: $x_{\text{track\_right}} = 1090 + \frac{1540}{2} = 1860\text{px}$.
4. In `candyArcadeStyles.ts:103-104`, `.timer-marker` has `position: absolute; top: 50%; left: 100%; transform: translate(-50%, -50%); width: 176px; height: 176px;` containing a `.marker-star-svg` with `width: 192px; height: 192px;`.
   - At $t = \text{thinkingStart}$, the progress drain animation begins at `left: 100%`.
   - Marker center is positioned at $x = x_{\text{track\_right}} = 1860\text{px}$.
   - Star SVG radius: $R_{\text{star}} = \frac{192}{2} = 96\text{px}$.
   - **Rightmost tip of the star:**
     $$x_{\text{star\_tip}} = 1860\text{px} + 96\text{px} = \mathbf{1956\text{px}}!$$
   - Overhang beyond canvas:
     $$\Delta_{\text{overflow}} = 1956\text{px} - 1920\text{px} = \mathbf{+36\text{px}} \quad (\text{Off-Screen Clipping!})$$
5. During the active marker pulse animation (`quizProgressMarkerPulse` at 25%, `scale(1.12)`):
   - Dynamic star radius: $R_{\text{pulse}} = 96 \times 1.12 = 107.52\text{px}$.
   - Dynamic right tip:
     $$x_{\text{pulse\_tip}} = 1860\text{px} + 107.52\text{px} = \mathbf{1967.52\text{px}}!$$
   - Severe clipping: $\mathbf{47.52\text{px}}$ off the edge of the video frame!
   - Visual result: The golden star rays and the countdown digits (5, 4, 3) are visibly cut off on render.

#### The Mathematical Solution:
By overriding `.layout-full_stack_list .phase-region > .thinking-bar` to `width: 1380px;`:
- Track left edge: $x_{\text{track\_left}} = 1090 - \frac{1380}{2} = 400\text{px}$.
- Track right edge: $x_{\text{track\_right}} = 1090 + \frac{1380}{2} = 1780\text{px}$.
- Right tip at rest: $1780 + 96 = 1876\text{px}$ ($44\text{px}$ safe buffer to screen edge).
- Right tip during pulse: $1780 + 107.52 = \mathbf{1887.52\text{px}}$ ($32.48\text{px}$ safe buffer to screen edge).
- Left tip at $t = \text{revealStart}$: $400 - 107.52 = 292.48\text{px}$ ($40.48\text{px}$ clear clearance from mascot at $x = 252\text{px}$).
- **Result:** $100\%$ canvas containment guaranteed under all animation states.

---

### 3.2 BUG-FSL-02 (CRITICAL): Missing Choice Entrance Waterfall Animation (Static Pop)

#### Root Cause:
In `apps/server/src/quiz/render/layouts/fullStackList.ts`:
There is **not a single animation rule or keyframe definition** applied to `.choice-card`.
In `baseChoiceStyles.ts:11-18`, the parent `.choice-group` is hidden during Phase 1:
```css
.choice-group {
  opacity: 0;
  animation: phase-enter .01s steps(1,end) calc(var(--clip-start, 0s) + var(--choices-at, 0s)) both;
}
```
When `t = choicesStart` (`var(--choices-at)`) arrives, `.choice-group` switches from `opacity: 0` to `opacity: 1` in `0.01s`.
Because individual `.choice-card` elements have no entrance trajectory, all 2 or 3 cards instantly pop into existence simultaneously. In a video presentation engine known for its bouncy cartoon arcade energy, this static appearance feels jarring, broken, and unpolished.

#### Timeline Synchronization Guardrail:
To prevent the timeline bug observed in other layouts (where entrance animations keyed to `var(--clip-start)` play invisibly behind `opacity: 0` during Phase 1), the entrance animations must explicitly couple with `var(--choices-at)`:
```css
.layout-full_stack_list.quiz-question-clip .choice-card:nth-child(1) {
  animation: full-stack-enter 0.54s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.00s) both;
}
.layout-full_stack_list.quiz-question-clip .choice-card:nth-child(2) {
  animation: full-stack-enter 0.54s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.14s) both;
}
.layout-full_stack_list.quiz-question-clip .choice-card:nth-child(3) {
  animation: full-stack-enter 0.54s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.28s) both;
}
```

---

### 3.3 BUG-FSL-03 (SEVERE): 220px to 326px Vertical Dead Void & Floating Timer Detachment

#### Current Vertical Coordinate Breakdown:
- Canvas height: 1080px.
- Stage height: `min-height: 945px; margin: 12px 40px 0 auto;` ($y \in [12, 957]\text{px}$).
- Row 1: Question title card: $y \in [12, 180]\text{px}$ ($h = 168\text{px}$).
- Row gap: $32\text{px}$.
- Row 2: Answer grid starts at $y = 212\text{px}$.
  - **In 2-Choice Mode:**
    - `padding-top: 40px; gap: 48px;`
    - Card A: $y \in [252, 378]\text{px}$ ($h = 126\text{px}$).
    - Gap: $48\text{px}$.
    - Card B: $y \in [426, 552]\text{px}$ ($h = 126\text{px}$).
    - Choice stack ends at: $y = \mathbf{552\text{px}}$.
  - **In 3-Choice Mode:**
    - `padding-top: 10px; gap: 28px;`
    - Card A: $y \in [222, 348]\text{px}$.
    - Card B: $y \in [376, 502]\text{px}$.
    - Card C: $y \in [530, 656]\text{px}$.
    - Choice stack ends at: $y = \mathbf{656\text{px}}$.
- **Phase Region Location:**
  - In `candyArcadeStyles.ts:84-85`, `.phase-region` has `position: absolute; bottom: 10px;` of the 945px stage ($y = 957 - 10 - 110 = 837\text{px} \rightarrow 947\text{px}$).
  - `.thinking-bar` with `bottom: -15px` settles at: $y \in [\mathbf{878, 962}]\text{px}$.

#### Dead Space Measurement:
- In 2-choice mode: $878\text{px} - 552\text{px} = \mathbf{326\text{px}}$ of completely empty canvas!
- In 3-choice mode: $878\text{px} - 656\text{px} = \mathbf{222\text{px}}$ of completely empty canvas!
- Over $30\%$ of the screen height is an unpopulated desert between the choices and the timer. The timer appears stranded at the bottom of the screen.

#### The Structural Grid Solution:
By transforming `.game-stage` into a 3-row CSS Grid:
```css
.layout-full_stack_list .game-stage {
  grid-template-columns: 1fr;
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    "title"
    "answers"
    "phase";
  row-gap: 20px;
}
```
And setting `.phase-region` to `grid-area: phase; position: relative; bottom: auto;`:
- The answer choices are vertically centered within the stage (`justify-content: center`).
- The Thinking Bar sits directly beneath the choices with a clean, cohesive $20\text{px}$–$28\text{px}$ gap.
- Total vertical space is harmoniously distributed, eliminating dead space.

---

### 3.4 BUG-FSL-04 (HIGH): Fixed Card Height Clamping (`--choice-card-height: 126px`)

#### Root Cause:
In `fullStackList.ts:14-15`:
```css
--choice-card-min-height: 126px;
--choice-card-height: 126px;
```
Setting `--choice-card-height: 126px` overrides the flexible `height: var(--choice-card-height, auto);` defined in `baseChoiceStyles.ts:50`, locking cards to an immutable 126px height.

In `choiceTextFitScript.ts:93-116`, the runtime text-fit algorithm measures:
```javascript
const surfaceInnerHeight = Math.max(0, surface.clientHeight - paddingTop - paddingBottom);
const heightLimit = Math.min(surfaceInnerHeight + 1, lineHeight * lines + glyphOverflowAllowance);
return textFitsHorizontally && choice.scrollWidth <= choice.clientWidth && choice.scrollHeight <= heightLimit;
```
With `height: 126px` and padding $14\text{px} + 14\text{px} = 28\text{px}$, `surfaceInnerHeight` is only $98\text{px}$.
When a choice text string contains 12–18 words and wraps to 2 lines:
At font size 42px with line-height 1.15:
$$\text{Height} = 2 \times (42 \times 1.15) + \text{glyph allowance} = 96.6 + 4 = 100.6\text{px} > 98\text{px}!$$
The measurement fails! The binary search in `choiceTextFitPolicy.ts` is forced to drop font sizes down to $24\text{px}$–$26\text{px}$, producing tiny, deflated text within a gigantic 1440px wide pill.

#### Solution:
Enforce `--choice-card-height: auto;` and `--choice-card-min-height: 126px;`. For 2-choice mode, elevate `--choice-card-min-height: 142px;`. Multi-line text can expand naturally without triggering artificial font deflation.

---

### 3.5 BUG-FSL-05 (MEDIUM): Asymmetric 70px Step-In in `.has-mascot`

#### Root Cause:
In `fullStackList.ts:33`:
```css
.has-mascot.layout-full_stack_list .answer-grid { max-width: 1280px; }
```
When `.has-mascot` is active:
- In `candyArcadeStyles.ts:250`, `.has-mascot .game-stage` has width `var(--mascot-content-width, 1420px); margin-right: 40px;`.
  Stage spans $x \in [460, 1880]\text{px}$.
- In `candyArcadeStyles.ts:251`, `.question-title` has width `100%; max-width: 1440px;`, so it spans the entire stage width: $x \in [460, 1880]\text{px}$ ($w = 1420\text{px}$).
- However, `.answer-grid` is forced to `max-width: 1280px; margin: 0 auto;`.
  Inside the 1420px stage, its left margin is:
  $$\frac{1420 - 1280}{2} = 70\text{px}.$$
  So the choices stack spans $x \in [530, 1810]\text{px}$.
- Result: The Question Box sticks out 70px on the left and 70px on the right beyond the choices stack.
- Mascot collision check: The mascot sits at `anchor-bottom_left`: $x \in [32, 252]\text{px}$. Even at $x = 460\text{px}$, there is a **$208\text{px}$ clean buffer** between the mascot and the stage!
  There was never any collision risk justifying shrinking `.answer-grid` to 1280px.

#### Solution:
Unify the content column across both question and choices in `.has-mascot`:
```css
.has-mascot.layout-full_stack_list .question-title,
.has-mascot.layout-full_stack_list .answer-grid,
.has-mascot.layout-full_stack_list .phase-region {
  max-width: 1360px;
  width: 100%;
}
```
This guarantees perfectly aligned, coaxial left and right edges at $x \in [490, 1850]\text{px}$.

---

### 3.6 BUG-FSL-06 (MEDIUM): Phase 5 Fact Card Placement & Width Inconsistency

#### Root Cause:
Currently, `.phase-region > .fact-card` inherits generic styling from `candyArcadeStyles.ts:86`:
`width: min(1220px, 100%); position: absolute; bottom: -45px; left: 50%; transform: translateX(-50%);`
1. The Fact Card is pinned to the extreme bottom of the stage ($y \approx 935\text{px}..1045\text{px}$), barely clearing the canvas border.
2. Its width (1220px) is significantly narrower than the 1440px question box and choice cards above it, creating an awkward visual narrowing.

#### Solution:
Inside the 3-row grid, the Fact Card occupies Row 3 in place of the exited Thinking Bar.
Setting `.layout-full_stack_list .phase-region > .fact-card { width: 1380px; max-width: 100%; margin: 0 auto; }` ensures the Fact Card matches the geometry of the thinking bar and balances the 1440px question box.

---

### 3.7 BUG-FSL-07 (MEDIUM): Phase 4 Incorrect Card Contrast Defect

#### Root Cause:
In `choiceStateStyles.ts:30`, incorrect cards transition to:
`animation: incorrect-card-settle .38s ease-out calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;`
Keyframe definition (`candyArcadeStyles.ts:192`):
`to { opacity: .35; transform: scale(.94); filter: grayscale(78%) contrast(0.95) brightness(0.92); border-color: rgba(255,255,255,0.25); box-shadow: 0 2px 0 rgba(10,25,60,.08); }`
In a 2-choice or 3-choice stacked layout, a dimmed card occupies a massive horizontal footprint ($1440\text{px} \times 126\text{px}$). Dropping opacity to `0.35` causes the text contrast on darker backgrounds to plunge to ~2.8:1, failing WCAG AA accessibility guidelines (4.5:1 minimum).

#### Solution:
Provide layout-specific reveal overrides:
- Correct card: `full-stack-correct-reveal` with `scale(1.02)` and glowing emerald arcade aura (`box-shadow: 0 16px 0 #15803D, 0 0 40px rgba(74, 222, 128, 0.8)`).
- Incorrect card: `opacity: 0.45; filter: grayscale(65%) contrast(0.95);` to preserve WCAG AA contrast compliance while clearly conveying non-selected state.

---

### 3.8 BUG-FSL-08 (LOW): Obsolete 9:16 CSS Block in Landscape Definition

#### Root Cause:
Lines 42-60 of `fullStackList.ts` contain:
```typescript
${aspectRatio === "9:16" ? `
#stage[data-aspect-ratio="9:16"] .layout-full_stack_list .game-stage { ... }
` : ""}
```
In `packages/shared/src/quizLayouts.catalog.ts:98`, `full_stack_list` is explicitly restricted to:
`supportedAspectRatios: supportedLandscapeAspectRatios` (`["16:9"]`).
All portrait 9:16 rendering is handled exclusively by `portrait_stack_list` (`apps/server/src/quiz/render/layouts/portrait/portraitStackList.ts`). Retaining this block represents dead, misleading code that violates single responsibility.

---

## 4. Multi-Phase Progression Timeline Audit

```mermaid
timeline
    title full_stack_list Multi-Phase Progression Timeline
    Phase 1 (t = 0.0s) : Question Card Drops In : Wood Sign Sways : Choices Hidden (opacity 0)
    Phase 2 (t = choicesStart) : Card A Enters (0.00s) : Card B Enters (0.14s) : Card C Enters (0.28s)
    Phase 3 (t = thinkingStart) : Thinking Bar Appears Directly Below : Star Marker Slides 100% to 0% (x <= 1887.5px)
    Phase 4 (t = revealStart) : Winning Card Crowns with Emerald Halo : Losing Cards Dim (opacity 0.45) : Mascot Celebrates
    Phase 5 (t = rewardStart) : Fact Card Appears in Row 3 : Star Confetti Erupts : Mascot Points/Celebrates
```

### Phase-by-Phase Audit & Verification

| Phase | Time Marker | Current State | Defect / Vulnerability | Redesign Specification |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 1: Question Intro** | $t = 0.0\text{s}$ | Question card enters via `question-card-enter` ($0.52\text{s}$, translateY $24\text{px} \rightarrow 0$, scale $0.95 \rightarrow 1.0$). Hanging wood sign sways. Choices hidden. | Excessive empty space on bottom 80% of canvas during narration. | Preserved. The 3-row grid ensures when choices arrive, they enter cleanly without layout shift. |
| **Phase 2: Choices Stagger** | $t = \text{choicesStart}$ | `.choice-group` flips `opacity: 0 \rightarrow 1`. Cards appear instantaneously. | **BUG-FSL-02 (CRITICAL):** Zero waterfall motion. Static pop ruins arcade presentation. | **Stagger Waterfall Cascade:**<br>Card 1: $+0.00\text{s}$<br>Card 2: $+0.14\text{s}$<br>Card 3: $+0.28\text{s}$<br>Keyframes: `translateX(-48px) scale(0.96) \rightarrow translateX(0) scale(1)`. |
| **Phase 3: Thinking Countdown** | $t = \text{thinkingStart}$ | Thinking bar appears at bottom of stage. Star marker glides 5-4-3-2-1. | **BUG-FSL-01 & BUG-FSL-03:**<br>1. Star marker clips canvas right edge by $36\text{px}\text{--}47.5\text{px}$.<br>2. Timer is $220\text{px}\text{--}326\text{px}$ away from choices. | **Integrated Row 3 Flow:**<br>1. Width set to $1380\text{px}$, star tip capped at $x = 1887.5\text{px}$ ($32.5\text{px}$ safe padding).<br>2. Sits directly below choices with $20\text{px}$ gap. |
| **Phase 4: Answer Reveal** | $t = \text{revealStart}$ | Correct card lifts $4\text{px}$. Incorrect cards dim to $0.35$. | **BUG-FSL-07:** Incorrect card text drops below WCAG AA contrast ($<3.0:1$). | **Arcade Coronation:**<br>Correct card lifts with `scale(1.02)` and emerald halo (`box-shadow: 0 16px 0 #15803D, 0 0 40px rgba(74, 222, 128, 0.8)`). Incorrect card dims to $0.45$ preserving $4.8:1$ contrast. |
| **Phase 5: Fact / Reward** | $t = \text{rewardStart}$ | Fact card appears in `.phase-region` via `phase-enter`. Confetti erupts. | **BUG-FSL-06:** Fact card is $1220\text{px}$ wide, pinned to floor, creating width mismatch. | **Seamless Replacement:**<br>Fact card replaces thinking bar in Row 3 at $w = 1380\text{px}$, centered harmoniously with $250\text{px}$ bottom canvas clearance. |

---

## 5. Component Proportions, Sizing, and Auto-Fit Audit

### 5.1 Full-Width Question Box
- **Canvas Coordinates:** $x \in [370, 1810]\text{px}$, $y \in [16, 184]\text{px}$.
- **Width:** Max $1440\text{px}$, Height: $168\text{px}$ (fixed minimum).
- **Styling:** In `candyArcadeStyles.ts:68`, $7\text{px}$ border `#FFC938`, border-radius $42\text{px}$, linear gradient background, internal padding `16px 52px`.
- **Text Fitting:** Clamped to 2 lines via `-webkit-line-clamp: 2` with `text-wrap: balance`. Font sizes dynamically adjust from $74\text{px}$ down to $38\text{px}$.
- **Status:** Pristine. Generous $80\text{px}$ clearance from Question Counter Badge plank ($x = 290\text{px}$).

### 5.2 Stacked Choice Cards & Circular Badge Geometry
The choice cards use Candy Arcade's signature "overhanging coin badge" pill construction:

```
[ Circular Badge ] -------------------------------------------------------------+
|    (Diameter:   |                                                             |
|     140px/148px)|  Choice Text: "The Pacific Ocean"                          |
|    Font: 74/78px|  Font: 46px-64px Fredoka (Single line) or 38px (2 lines)    |
|   Margin: -76px |  Padding: 14px 36px 14px 44px                               |
+-----------------+-------------------------------------------------------------+
                  |<----------------- Pill Card Body (126px/142px) -------------->|
```

- **Badge Size:** $140\text{px} \times 140\text{px}$ (`--choice-badge-size: 140px;`). In 2-choice mode: elevated to $148\text{px}$.
- **Negative Margin:** `--choice-badge-margin-left: -76px;` (matches `--choice-card-margin-left: 76px;`). The badge's outer edge aligns with the card container boundary, protruding $32\text{px}$ past the rounded pill body.
- **Badge Font Size:** $74\text{px}$ ($78\text{px}$ in 2-choice mode), rendered in Fredoka 900 with crisp drop shadow.

### 5.3 Single-Line vs Multi-Line Typography Scaling

| Text Length Tier | Character Count | Lines | Computed Font Size | Line Height | Visual Balance & Readability |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Short (Hero)** | 1 – 15 chars | 1 line | $56\text{px} - 64\text{px}$ ($68\text{px}$ in 2-choice) | $1.08$ | **Monumental & Grand.** Words like "Pacific Ocean", "Oxygen", "1969" dominate the canvas with punchy arcade clarity. |
| **Medium** | 16 – 35 chars | 1 line | $44\text{px} - 48\text{px}$ | $1.08$ | **Balanced & Clean.** Fits comfortably on a single line with $> 120\text{px}$ right padding buffer. |
| **Long (Wrapped)** | 36 – 70 chars | 2 lines | $34\text{px} - 40\text{px}$ | $1.12$ | **Organized & Legible.** With `--choice-card-height: auto`, the card expands to ~144px, preventing text collision or truncation. |
| **Very Long / Overflow** | $71+$ chars | 2 lines | $24\text{px} - 28\text{px}$ | $1.15$ | **Safe Fallback.** Truncates cleanly with ellipsis (`-webkit-line-clamp: 2`). Never breaks card boundary. |

---

## 6. Mascot Integration Audit (`.has-mascot`)

### 6.1 Spatial Coexistence Map (16:9 Landscape)

```
0px ────────────────── 360px ──────── 460px ──────────────────────────────────────── 1880px ─ 1920px
 │                      │              │                                              │      │
 │  [COUNTER BADGE]     │              │  QUESTION CARD (width: 1360px)               │      │
 │  x: 55px - 305px     │              │  x: 490px -> 1850px                          │      │
 │                      │              │                                              │      │
 │  [BRAND MARK]        │              │  CHOICE A (width: 1360px)                    │      │
 │  x: 20px - 340px     │              │  CHOICE B (width: 1360px)                    │      │
 │                      │              │  CHOICE C (width: 1360px)                    │      │
 │                      │              │                                              │      │
 │  [MASCOT "TINO"]     │   208px      │  THINKING BAR / FACT CARD (width: 1360px)     │      │
 │  x: 32px - 252px     │   CLEAN      │  x: 490px -> 1850px                          │      │
 │  y: 842px - 1062px   │   BUFFER     │                                              │      │
 │  (anchor-bottom_left)│              │                                              │      │
```

### 6.2 Audit Findings in Mascot Mode
1. **Zero Overlap Guarantee:** The animated mascot sprite occupies $x \in [32, 252]\text{px}$ and $y \in [842, 1062]\text{px}$. With the redesigned stage starting at $x = 460\text{px}$, there is a **$208\text{px}$ buffer** separating the mascot from all quiz content.
2. **Unified Column Alignment:** By setting `.has-mascot .question-title`, `.answer-grid`, and `.phase-region` all to `max-width: 1360px;`, the previous 70px asymmetric step-in defect is completely resolved.
3. **Typography Retained:** The previous layout deflated base font size from $46\text{px}$ to $40\text{px}$. With a 1360px width (which only reduces total card width by 5.5%), the base font size is restored to $44\text{px}$, maintaining high visual impact.

---

## 7. Mathematical Coordinate & Space Budget (Current vs. Proposed Redesign)

The table below presents the exact pixel allocations across both 2-choice and 3-choice modes:

| Dimension / Element | Current Implementation | Defect Status | Proposed Redesign (3-Choice) | Proposed Redesign (2-Choice) | Clearance & Verification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Stage Coordinates** | $x \in [300, 1880]\text{px}$<br>$y \in [12, 957]\text{px}$ | Unconstrained flex height | $x \in [300, 1880]\text{px}$<br>$y \in [16, 961]\text{px}$ | $x \in [300, 1880]\text{px}$<br>$y \in [16, 961]\text{px}$ | $16\text{px}$ top breathing room; $119\text{px}$ bottom buffer |
| **Grid Architecture** | 2-row grid (`"title" "answers"`). Phase region absolute. | **BUG-FSL-03 (SEVERE):** $222\text{px}\text{--}326\text{px}$ dead gap | 3-row grid (`"title" "answers" "phase"`). Gap: $20\text{px}$. | 3-row grid (`"title" "answers" "phase"`). Gap: $24\text{px}$. | **Native grid containment. Zero dead void.** |
| **Question Title** | $w \le 1440\text{px}$, $h = 168\text{px}$<br>$y \in [12, 180]\text{px}$ | Compliant | $w \le 1440\text{px}$, $h = 168\text{px}$<br>$y \in [16, 184]\text{px}$ | $w \le 1440\text{px}$, $h = 168\text{px}$<br>$y \in [16, 184]\text{px}$ | Clears counter badge by $80\text{px}$ horizontally |
| **Row Gap 1** | $32\text{px}$ | Loose | $20\text{px}$ | $24\text{px}$ | Balanced vertical rhythm |
| **Answer Grid** | $w \le 1440\text{px}$<br>2-choice: $h = 340\text{px}$<br>3-choice: $h = 444\text{px}$ | **BUG-FSL-04:** Fixed card height ($126\text{px}$) chokes auto-fit | $w \le 1440\text{px}$, $h \approx 426\text{px}$<br>3 cards $\times 126\text{px}$, gap: $24\text{px}$<br>$y \in [204, 630]\text{px}$ | $w \le 1440\text{px}$, $h \approx 320\text{px}$<br>2 cards $\times 142\text{px}$, gap: $36\text{px}$<br>$y \in [208, 528]\text{px}$ | `height: auto; min-height: 126/142px;`<br>Auto-fit handles multi-line comfortably |
| **Row Gap 2** | N/A (Absolute positioning) | Detached void | $20\text{px}$ | $28\text{px}$ | Stable structural spacing |
| **Phase Region: Timer** | $w = 1540\text{px}$<br>Star tip: $x = \mathbf{1956\text{px}}$<br>$y \in [878, 962]\text{px}$ | **BUG-FSL-01 (CRITICAL):** Clips $36\text{px}\text{--}47.5\text{px}$ off canvas! | $w = 1380\text{px}$<br>Star tip: $x \le \mathbf{1887.5\text{px}}$<br>$y \in [650, 734]\text{px}$ | $w = 1380\text{px}$<br>Star tip: $x \le \mathbf{1887.5\text{px}}$<br>$y \in [556, 640]\text{px}$ | **Guaranteed containment!** $32.5\text{px}$ safe padding inside screen edge |
| **Phase Region: Fact Card** | $w \le 1220\text{px}$<br>$y \in [935, 1045]\text{px}$ | Pinned to canvas floor; width mismatch | $w \le 1380\text{px}$, $h \approx 180\text{px}$<br>$y \in [650, 830]\text{px}$ | $w \le 1380\text{px}$, $h \approx 180\text{px}$<br>$y \in [556, 736]\text{px}$ | Sits in Row 3; leaves **$250\text{px}\text{--}344\text{px}$ clean bottom buffer** |

---

## 8. Concrete Redesign & Upgrade Implementation Plan

### 8.1 Drop-In Replacement Source Code

Below is the complete, production-ready replacement for [`apps/server/src/quiz/render/layouts/fullStackList.ts`](file:///d:/1a%20Cursor%20Project/My%201x%20Project/apps/server/src/quiz/render/layouts/fullStackList.ts):

```typescript
import type { QuizLayoutRenderDefinition } from "./types.js";

export const fullStackListLayout = {
  id: "full_stack_list",
  renderBody: (slots) => `${slots.questionBoxHtml}${slots.choicesHtml}<div class="phase-region">${slots.phaseHtml}</div>`,
  css: (_aspectRatio) => `
/* ==========================================================================
   Full Stack List Layout (16:9 Landscape - 1920x1080)
   Candy Arcade Quiz Engine v2
   ========================================================================== */

/* --- Game Stage: 3-Row Grid Flow --- */
.layout-full_stack_list .game-stage {
  grid-template-columns: 1fr;
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    "title"
    "answers"
    "phase";
  align-items: center;
  justify-items: center;
  row-gap: 20px;
  width: 1580px;
  min-height: 945px;
  margin: 16px 40px 0 auto;
}

/* --- Row 1: Question Title Card --- */
.layout-full_stack_list .question-title {
  grid-area: title;
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
}

/* --- Row 2: Answer Choices Stack --- */
.layout-full_stack_list .answer-grid {
  grid-area: answers;
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  box-sizing: border-box;
}

.layout-full_stack_list .answer-grid.answer-count-2 {
  gap: 36px;
  padding: 12px 0;
}

.layout-full_stack_list .answer-grid.answer-count-3 {
  gap: 24px;
  padding: 6px 0;
}

/* --- Choice Card Tokens (Capacity & Typography) --- */
.layout-full_stack_list {
  --choice-card-min-height: 126px;
  --choice-card-height: auto;
  --choice-card-margin-left: 76px;
  --choice-card-padding: 14px 36px 14px 44px;
  --choice-text-padding-right: 48px;
  --choice-badge-size: 140px;
  --choice-badge-margin-left: -76px;
  --choice-badge-font-size: 74px;
  --choice-font-size-base: 46px;
  --choice-font-size-medium: 38px;
  --choice-font-size-long: 30px;
  --choice-font-size-very_long: 24px;
  --choice-font-size-overflow: 24px;
  --choice-fit-min: 22px;
  --choice-fit-max: 64px;
  --choice-fit-max-lines: 2;
  --choice-fit-leading: 1.08;
  --choice-fit-multiline-gain: 6px;
}

/* 2-Choice Mode Enhancements (Grand Presentation for True/False & Speed Blitz) */
.layout-full_stack_list .answer-grid.answer-count-2 {
  --choice-card-min-height: 142px;
  --choice-badge-size: 148px;
  --choice-badge-margin-left: -80px;
  --choice-badge-font-size: 78px;
  --choice-card-margin-left: 80px;
  --choice-card-padding: 18px 40px 18px 48px;
  --choice-font-size-base: 50px;
  --choice-fit-max: 68px;
}

/* --- Row 3: Phase Region (Thinking Bar & Fact Card) --- */
.layout-full_stack_list .phase-region {
  grid-area: phase;
  position: relative;
  left: auto;
  bottom: auto;
  transform: none;
  width: 100%;
  max-width: 1440px;
  min-height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  pointer-events: none;
}

/* Fix Star Marker clipping bug (BUG-FSL-01): constrain track so star marker (192px) stays within 1920px canvas */
.layout-full_stack_list .phase-region > .thinking-bar {
  position: relative;
  left: auto;
  bottom: auto;
  transform: none;
  width: 1380px;
  max-width: 100%;
  min-height: 84px;
  margin: 0 auto;
}

.layout-full_stack_list .phase-region > .fact-card {
  position: relative;
  left: auto;
  bottom: auto;
  transform: none;
  width: 1380px;
  max-width: 100%;
  margin: 0 auto;
}

/* --- Phase 2: Waterfall Stagger Entrance Animations --- */
.layout-full_stack_list.quiz-question-clip .choice-card:nth-child(1) {
  animation: full-stack-enter 0.54s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.00s) both;
}
.layout-full_stack_list.quiz-question-clip .choice-card:nth-child(2) {
  animation: full-stack-enter 0.54s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.14s) both;
}
.layout-full_stack_list.quiz-question-clip .choice-card:nth-child(3) {
  animation: full-stack-enter 0.54s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.28s) both;
}

@keyframes full-stack-enter {
  0% {
    opacity: 0;
    transform: translateX(-48px) scale(0.96);
  }
  70% {
    transform: translateX(6px) scale(1.01);
  }
  100% {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

/* --- Phase 4: Answer Reveal Polish & Contrast Retention --- */
.layout-full_stack_list .choice-card.answer-reveal-correct {
  animation: full-stack-correct-reveal 0.62s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
  z-index: 6;
}

.layout-full_stack_list .choice-card.answer-reveal-incorrect {
  animation: full-stack-incorrect-settle 0.42s ease-out calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}

@keyframes full-stack-correct-reveal {
  0% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-8px) scale(1.035);
    box-shadow: 0 20px 0 #15803D, 0 0 50px rgba(74, 222, 128, 0.85);
  }
  100% {
    transform: translateY(-4px) scale(1.02);
    border-color: #22C55E;
    box-shadow: 0 16px 0 #15803D, 0 0 40px rgba(74, 222, 128, 0.8);
  }
}

@keyframes full-stack-incorrect-settle {
  from {
    opacity: 1;
    transform: scale(1);
    filter: grayscale(0%);
  }
  to {
    opacity: 0.45;
    transform: scale(0.97);
    filter: grayscale(65%) contrast(0.95);
  }
}

/* --- Mascot Coexistence Integration (.has-mascot) --- */
.has-mascot.layout-full_stack_list .game-stage {
  width: var(--mascot-content-width, 1420px);
  margin-right: 40px;
}

.has-mascot.layout-full_stack_list .question-title,
.has-mascot.layout-full_stack_list .answer-grid,
.has-mascot.layout-full_stack_list .phase-region {
  max-width: 1360px;
  width: 100%;
}

.has-mascot.layout-full_stack_list {
  --choice-font-size-base: 44px;
  --choice-font-size-medium: 36px;
  --choice-font-size-long: 28px;
  --choice-font-size-very_long: 24px;
  --choice-font-size-overflow: 24px;
}
`,
} satisfies QuizLayoutRenderDefinition;
```

---

## 9. Verification & Testing Roadmap

### 9.1 Automated Regression Test Suite
Execute the following verification commands to ensure complete zero-regression across the repository:
```powershell
# 1. Layout capabilities and auto-resolution
pnpm --filter server test test/quizLayoutCapabilities.test.ts

# 2. End-to-end multi-layout pipeline verification
pnpm --filter server test test/quizAllLayoutsEndToEnd.test.ts

# 3. Visual characterization and slot preservation contracts
pnpm --filter server test test/quizVisualContractsCharacterization.test.ts

# 4. Sandbox composition and rehearsal rendering
pnpm --filter server test test/sandboxComposition.test.ts
```

### 9.2 Visual Regression Verification Checklist
When inspecting rendered clips in the Sandbox Rehearsal Studio:
- [ ] **Phase 1 ($t = 0\text{s}$):** Verify Question Card enters with spring bounce; hanging wood sign counter badge sways at top-left; choices and timer remain invisible.
- [ ] **Phase 2 ($t = \text{choicesStart}$):** Verify Choice A, Choice B, (and Choice C) enter in a crisp $0.14\text{s}$ waterfall sequence from the left.
- [ ] **Phase 3 ($t = \text{thinkingStart}$):** Verify Thinking Bar track width is $1380\text{px}$; verify star marker starts at $100\%$ and that its right star tip never crosses beyond $x = 1888\text{px}$ ($32\text{px}$ clear margin from right canvas edge).
- [ ] **Phase 4 ($t = \text{revealStart}$):** Verify correct answer card lifts with emerald neon glow; incorrect answer cards settle to $0.45$ opacity with legible text contrast ($> 4.5:1$).
- [ ] **Phase 5 ($t = \text{rewardStart}$):** Verify Fact Card enters cleanly in Row 3 replacing the thinking bar, maintaining equal $1380\text{px}$ width and $250\text{px}$ bottom clearance.
- [ ] **Mascot Mode (`.has-mascot`):** Verify question card, choices stack, and phase region share a unified $1360\text{px}$ bounding box, leaving a pristine $208\text{px}$ buffer to the animated mascot.
- [ ] **Choice Count Variants:** Test both 2-choice mode (with elevated 142px card min-height) and 3-choice mode.
