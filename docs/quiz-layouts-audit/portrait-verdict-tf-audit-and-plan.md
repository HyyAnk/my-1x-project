# Exhaustive Visual, Architectural & Multi-Phase Animation Audit: `portrait_verdict_tf` (9:16 Vertical Video)

**Audit Target:** `portrait_verdict_tf` (Portrait Verdict True/False Layout)  
**Layout Source File:** [`apps/server/src/quiz/render/layouts/portrait/portraitVerdictTf.ts`](file:///d:/1a%20Cursor%20Project/My%201x%20Project/apps/server/src/quiz/render/layouts/portrait/portraitVerdictTf.ts)  
**Catalog Definition:** [`packages/shared/src/quizLayouts.catalog.ts`](file:///d:/1a%20Cursor%20Project/My%201x%20Project/packages/shared/src/quizLayouts.catalog.ts#L156-L168)  
**Target Video Format:** 9:16 Portrait Mobile Video (1080 × 1920 px) for TikTok, YouTube Shorts, Instagram Reels  
**Supported Formats & Archetypes:** `true_false` format; `verdict_true_false`, `verdict_fact_myth` archetypes  
**Audit Date:** September 2026  
**Auditor:** Expert Frontend Architect & Motion UI Designer (Candy Arcade Quiz Engine)

---

## 1. Executive Summary

The `portrait_verdict_tf` layout is the flagship 9:16 vertical video layout dedicated to high-tension binary verdict questions (True or False, Fact vs. Myth). Designed for TikTok, YouTube Shorts, and Instagram Reels, its mission is to deliver an instant visceral experience: a bold statement card, a massive visual evidence hero canvas (860×540px), two giant arcade push buttons (Emerald Green "TRUE" vs. Coral Red "FALSE"), an embedded thinking countdown bar, and a climactic answer reveal.

### Overall Assessment: **B+ (Structurally Promising, Architecturally Flawed in Motion & Cascade)**

While the basic visual geometry and static typography reflect the Candy Arcade aesthetic, our exhaustive forensic audit has exposed **four critical architectural defects**, **two safe-zone violations**, and **a mascot collision hazard** that significantly compromise video production quality:

1. **CRITICAL DEFECT 1: Phase 2 Choice Entrance Animation Timing Desynchronization**  
   In `portraitVerdictTf.ts` (lines 232–237), the entrance animation delays for the choice buttons are hardcoded to `calc(var(--clip-start) + 0.12s)` and `calc(var(--clip-start) + 0.22s)`. However, choice options enter at `var(--choices-at)` (typically 1.5s–2.5s into the clip). Because the parent `.choice-group` holds `opacity: 0` until `var(--choices-at)`, the child pill buttons execute their sliding animations in complete darkness within the first 670ms. When `choicesStart` arrives, the choices suddenly pop into existence with **zero entrance motion**.

2. **CRITICAL DEFECT 2: CSS Specificity Hijacking Suppressing Phase 4 Answer Reveal**  
   The selector `.layout-portrait_verdict_tf.quiz-question-clip .choice-card:nth-child(1)` possesses a specificity of `(0, 4, 0)` with shorthand `animation: enter-from-left 0.55s ... both;`. The global answer reveal state rule `.choice-card-text.answer-reveal-correct` only has specificity `(0, 2, 0)`. Consequently, **the reveal animation (`correct-card-reveal`) is completely overwritten and wiped out by the cascade!** The winning button never pulses or blooms, and the losing button never settles or dims.

3. **CRITICAL DEFECT 3: Author `!important` Locking Out Reveal Keyframe Styles**  
   The background gradients, borders, and multi-layered box-shadows on the True and False cards are declared with `!important` (lines 146–155, 188–197). Under W3C CSS Cascade specifications, `!important` author declarations take precedence over CSS keyframe animations. Even if keyframes were applied, the losing button cannot dim its bright glowing shadow or lighten its border, destroying contrast integrity during Phase 4.

4. **CRITICAL DEFECT 4: 70px Horizontal Axis Drift Between Choice Buttons and Thinking Bar**  
   The choice button container (`.answer-grid`) applies `padding-right: 140px`, centering the 720px buttons at $x = 470\text{px}$. However, the thinking bar inside `.phase-region` uses `position: absolute; left: 50%; transform: translateX(-50%)`, which aligns to the padding-box midpoint at $x = 540\text{px}$. The countdown timer is **horizontally misaligned by 70px** relative to the choices directly above it.

5. **SAFE-ZONE DEFECT: Fact Card Breach of the 140px Right Action Rail**  
   The `.fact-card` inside `.phase-region` is defined with `width: min(860px, 100%)` and centered at $x = 540\text{px}$. Its right bounding edge extends to $x = 970\text{px}$, leaving only 110px margin from the right edge ($1080 - 970 = 110\text{px} < 140\text{px}$). During Phase 5, the right 30px of the fact card and its text are occluded by TikTok's interaction rail (Like, Comment, Share buttons).

6. **MASCOT COLLISION HAZARD: Vertical Overlap in Phase 5**  
   In 9:16 portrait, production mascots are anchored at `bottom: 440px` (span: $y \in [1260\text{px}, 1480\text{px}]$). The embedded phase region terminates around $y = 1272\text{px}$ to $1320\text{px}$ when the fact card is rendered. When a mascot is positioned on the bottom-left or bottom-right, the mascot sprite directly overlaps the fact card text, rendering the educational verdict explanation illegible.

---

## 2. Inviolable Anchor Integrity & Coordinate Baseline

The Candy Arcade design system mandates two inviolable anchors whose coordinates must remain completely untouched:

```
+-------------------------------------------------------------------------+
| [INVIOLABLE ANCHOR 1]                               [INVIOLABLE ANCHOR 2] |
| .game-header (Hanging Wood Sign)                    .channel-brand-mark   |
| left: 24px; top: 0px;                               right: 36px; top: 42px|
| width: 240px; height: 194px                         font-size: 42px / 26px|
| (Ropes: 44px + Sign Plank: 150px)                   baseline alignment    |
+-------------------------------------------------------------------------+
```

### Forensic Audit of Anchor Clearances:
- **Anchor 1: Question Counter Badge (`.game-header` / `.hanging-wood-sign`)**  
  - Fixed coordinates: `top: 0; left: 24px;` in 9:16 portrait mode.
  - Span: $x \in [24\text{px}, 264\text{px}]$, $y \in [0\text{px}, 194\text{px}]$.
  - In `portraitVerdictTf.ts` (line 38), `.game-stage` was declared with `margin: 140px auto 0;`.
  - The centered question title (`max-width: 880px`) starts at $x = (1080 - 880)/2 = 100\text{px}$ and $y = 140\text{px}$.
  - **Overlap Defect:** From $x \in [100\text{px}, 264\text{px}]$ and $y \in [140\text{px}, 194\text{px}]$, the hanging wooden sign plank and ropes overlap the top-left corner of the question statement card by 54px vertically! Furthermore, the decorative question star badge (`.q-badge-star`, `top: -26px; left: -18px`) is occluded behind the hanging sign.
  - **Resolution:** As defined in the system-wide baseline (`candyArcadeStyles.ts` line 292), `.game-stage` in 9:16 portrait should begin at `margin: 176px auto 0;` (or `180px`). This completely clears the hanging wooden sign and badge star while maintaining the inviolable anchor untouched.

- **Anchor 2: Channel Brand Mark (`.channel-brand-mark`)**  
  - Fixed coordinates: `top: 42px; right: 36px; text-align: right;`.
  - Span: $x \in [384\text{px}, 1044\text{px}]$, $y \in [42\text{px}, 84\text{px}]$.
  - Because `margin-top` of `.game-stage` is at $y \ge 176\text{px}$, the brand mark has over 90px of clean vertical clearance and does not collide with the question card.
  - Anchor coordinates remain **100% preserved and untouched**.

---

## 3. 9:16 Portrait Safe-Zone Analysis (1080 × 1920 Canvas)

Vertical short-form video platforms (TikTok, Instagram Reels, YouTube Shorts) impose strict UI overlay zones that obscure underlying canvas content. Every interactive element must respect these boundaries.

```
Canvas Top (y = 0px)
+-------------------------------------------------------------------------+
| [TOP SAFE ZONE BUFFER]  y: 0 - 176px                                    |
| Counters, brand mark, platform top navigation icons (Search, Live)       |
+-------------------------------------------------------------------------+
| [QUESTION STATEMENT CARD]  y: 176 - 336px (height: ~160px)              |
| Centered, max-width: 880px                                              |
+-------------------------------------------------------------------------+
| [HERO VISUAL CANVAS]  y: 356 - 896px (height: 540px)                    |
| Centered, width: 860px (x: 110 - 970px)                                 |
+-------------------------------------------------------------------------+
| [TRUE / FALSE ACTION BUTTONS]  y: 916 - 1184px                          |
| TRUE:  y: 916 - 1040px (height: 124px) | [RIGHT SAFE ZONE RAIL]         |
| FALSE: y: 1060 - 1184px (height: 124px)| x >= 940px (width: 140px)      |
| Width: 720px, x: 110 - 830px           | Like, Comment, Bookmark, Share |
+----------------------------------------+ Sound Disk                     |
| [THINKING TIMER BAR / FACT CARD]       |                                |
| y: 1204 - 1288px (height: 84px)        |                                |
| Aligned with buttons, x: 110 - 830px   |                                |
+----------------------------------------+--------------------------------+
| y = 1480px (CRITICAL SAFE-ZONE HORIZON)                                 |
| ======================================================================= |
| [BOTTOM OVERLAY SAFE ZONE]  y: 1480 - 1920px (height: 440px)             |
| Reserved for: Account handle, expandable captions, sound title marquee, |
| engagement stickers, and video progress scrubber bar.                   |
+-------------------------------------------------------------------------+
Canvas Bottom (y = 1920px)
```

### Coordinate Budget Breakdown:

| Element | Vertical Span ($y$) | Height | Horizontal Span ($x$) | Width | Safe-Zone Clearance Status |
|---|---|---|---|---|---|
| **Top Buffer / Anchors** | $0 - 176\text{px}$ | $176\text{px}$ | $0 - 1080\text{px}$ | $1080\text{px}$ | **PASS** (Clearance for Counter & Brand) |
| **Question Statement Box** | $176 - 336\text{px}$ | $160\text{px}$ | $100 - 980\text{px}$ | $880\text{px}$ | **PASS** (Centered statement, 2-line clamp) |
| **Row Gap 1** | $336 - 356\text{px}$ | $20\text{px}$ | - | - | - |
| **Hero Visual Media Canvas** | $356 - 896\text{px}$ | $540\text{px}$ | $110 - 970\text{px}$ | $860\text{px}$ | **PASS** (Non-interactive visual media) |
| **Row Gap 2** | $896 - 916\text{px}$ | $20\text{px}$ | - | - | - |
| **Choice A: TRUE Button** | $916 - 1040\text{px}$ | $124\text{px}$ | $110 - 830\text{px}$ | $720\text{px}$ | **PASS** (250px right margin $\ge 140\text{px}$) |
| **Choice Gap** | $1040 - 1060\text{px}$ | $20\text{px}$ | - | - | - |
| **Choice B: FALSE Button** | $1060 - 1184\text{px}$ | $124\text{px}$ | $110 - 830\text{px}$ | $720\text{px}$ | **PASS** (250px right margin $\ge 140\text{px}$) |
| **Row Gap 3** | $1184 - 1204\text{px}$ | $20\text{px}$ | - | - | - |
| **Thinking Bar (Phase 3)** | $1204 - 1288\text{px}$ | $84\text{px}$ | $110 - 830\text{px}$ | $720\text{px}$ | **PASS** ($y \le 1480\text{px}$, 192px bottom buffer) |
| **Fact Card (Phase 5)** | $1204 - 1324\text{px}$ | $120\text{px}$ | $110 - 830\text{px}$ | $720\text{px}$ | **NEEDS FIX** (Must be bounded to 720px) |
| **Total Content Bottom** | **$1324\text{px}$** | - | - | - | **PASS** ($1920 - 1324 = 596\text{px} \ge 440\text{px}$) |

### Findings & Rectifications:
1. **Right Action Rail Compliance ($x \ge 940\text{px}$):**
   - The choice pills are $720\text{px}$ wide, spanning from $x = 110\text{px}$ to $x = 830\text{px}$. The distance from the right canvas edge is $1080 - 830 = 250\text{px}$, providing a generous $110\text{px}$ safety margin beyond the mandatory $140\text{px}$ action rail.
   - However, `.fact-card` was using `width: min(860px, 100%)` and `left: 50%; transform: translateX(-50%)`, spanning to $x = 970\text{px}$ and penetrating 30px into the action rail. Setting `.phase-region > .fact-card { width: min(720px, 100%); }` guarantees that all explanation text remains 100% visible.
2. **Bottom Overlay Safe-Zone Compliance ($y \le 1480\text{px}$):**
   - The entire content hierarchy terminates at $y = 1324\text{px}$. This preserves a clean buffer of **$596\text{px}$** from the bottom of the canvas, substantially exceeding the required $440\text{px}$ safety buffer.

---

## 4. Multi-Phase Progression Timeline Audit

```
+----------------------------------------------------------------------------------------------+
| TIMELINE PHASES (Candy Arcade 9:16 Video Lifecycle)                                         |
+----------------------------------------------------------------------------------------------+
| Phase 1: Question Intro     [0.0s ------------------> choicesStart]                          |
| Phase 2: Choices Stagger    [choicesStart -----------> thinkingStart]                        |
| Phase 3: Thinking Countdown [thinkingStart ----------> revealStart]                          |
| Phase 4: Answer Reveal      [revealStart ------------> rewardStart]                          |
| Phase 5: Fact & Reward      [rewardStart ------------> sceneEnd]                             |
+----------------------------------------------------------------------------------------------+
```

### Detailed Phase Analysis:

#### Phase 1: Question Intro ($t = 0\text{s} \to t = \text{choicesStart}$)
- **Visual Targets:** Question statement card enters via `question-card-enter 0.52s` with scale-up overshoot; hero illustration enters via `enter-from-left 0.62s`.
- **Current Behavior:** Statement card renders centered with 2-line clamp and balanced text wrapping. Hero image displays with sharp 10px white arcade border, subtle yellow glow (`rgba(255, 215, 0, 0.28)`), and gentle Ken Burns zoom (`hero-ken-burn`).
- **Defects:**
  - Minor overlap with hanging wood sign when `margin-top: 140px` is used.
- **Upgrades:**
  - Standardize `margin-top: 176px` for `.game-stage`.
  - Add glossy shine overlay (`image-shine`) and subtle idle breathing float (`hero-float`) to the central visual.

#### Phase 2: Choices Stagger ($t = \text{choicesStart} \to t = \text{thinkingStart}$)
- **Visual Targets:** The True (Emerald Green) and False (Coral Red) oversized pill buttons pop onto the screen with tactile excitement.
- **Current Behavior:** Broken! Because lines 232–237 write:
  ```css
  .choice-card:nth-child(1) { animation: enter-from-left 0.55s ... calc(var(--clip-start) + 0.12s) both; }
  .choice-card:nth-child(2) { animation: enter-from-right 0.55s ... calc(var(--clip-start) + 0.22s) both; }
  ```
  The animation starts at $t = 0.12\text{s}$ while `.choice-group` is still hidden (`opacity: 0`). When `.choice-group` becomes visible at `choicesStart` ($\approx 1.8\text{s}$), the animation is already complete. The buttons appear instantaneously without motion.
- **Upgrades:**
  - Synchronize entrance delays with the active timeline token `--choices-at`:
    ```css
    .layout-portrait_verdict_tf.quiz-question-clip .choice-card:nth-child(1) {
      animation: enter-from-left 0.52s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start) + var(--choices-at) + 0.06s) both;
    }
    .layout-portrait_verdict_tf.quiz-question-clip .choice-card:nth-child(2) {
      animation: enter-from-right 0.52s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start) + var(--choices-at) + 0.16s) both;
    }
    ```
  - This produces an authentic, energetic staggered slide-in where TRUE snaps in from the left, followed 100ms later by FALSE snapping in from the right with spring overshoot.

#### Phase 3: Thinking Countdown ($t = \text{thinkingStart} \to t = \text{revealStart}$)
- **Visual Targets:** The thinking timer bar appears directly beneath the buttons and drains smoothly. Number countdown indicators (5, 4, 3, 2, 1) tick inside the sliding star marker; twinkling milestone stars pulse along the track.
- **Current Behavior:** The timer operates smoothly via CSS keyframes, but is horizontally displaced 70px to the right of the True/False buttons due to asymmetrical padding inheritance.
- **Upgrades:**
  - Remove horizontal offset by setting `.layout-portrait_verdict_tf .phase-region` width to exactly match the choice pill width ($720\text{px}$) with `margin: 16px auto 0; padding-right: 0;`.
  - Position the timer track cleanly centered on the exact vertical axis of the verdict buttons.
  - Height of 84px ensures generous touch-target visibility without intruding on the bottom safe zone.

#### Phase 4: Answer Reveal ($t = \text{revealStart} \to t = \text{rewardStart}$)
- **Visual Targets:** The correct verdict button detonates with golden/emerald victory rays, expands, and pulses. The incorrect button dims to 35% opacity, desaturates to 80% grayscale, and recedes into the background.
- **Current Behavior:** Completely broken!
  1. Cascade specificity: The entrance animation rule on `.quiz-question-clip .choice-card:nth-child(n)` has specificity `(0, 4, 0)` and overrides `choiceStateStyles`'s `(0, 2, 0)`.
  2. The author `!important` tags on `background`, `border`, and `box-shadow` prevent `correct-card-reveal` and `incorrect-card-settle` keyframes from altering colors and shadows.
  3. Result: Both buttons stay frozen in their initial state during reveal.
- **Upgrades:**
  - Implement high-specificity verdict reveal selectors:
    ```css
    .layout-portrait_verdict_tf.quiz-question-clip .choice-card.answer-reveal-correct,
    .layout-portrait_verdict_tf.quiz-question-clip .choice-card.answer-correct {
      animation: verdict-correct-pop 0.65s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start) + var(--reveal-at)) both !important;
    }
    .layout-portrait_verdict_tf.quiz-question-clip .choice-card.answer-reveal-incorrect,
    .layout-portrait_verdict_tf.quiz-question-clip .choice-card.answer-incorrect {
      animation: verdict-incorrect-settle 0.42s ease-out calc(var(--clip-start) + var(--reveal-at)) both !important;
    }
    ```
  - Formulate dedicated verdict keyframes:
    - `@keyframes verdict-correct-pop`: Scales to 1.05, shifts up -6px, triggers a brilliant emerald victory glow (`0 0 48px rgba(52, 211, 153, 0.9)`), with a white flash border.
    - `@keyframes verdict-incorrect-settle`: Fades to 0.32 opacity, scales to 0.94, drops -4px down, applies `grayscale(85%) contrast(0.9) brightness(0.85)`, and collapses depth shadows to flat.

#### Phase 5: Fact / Reward ($t = \text{rewardStart} \to \text{sceneEnd}$)
- **Visual Targets:** The timer bar fades out, replaced by the verdict explanation fact card. Reward starburst particles erupt across the stage. Mascot transitions to celebration or explanation pointing.
- **Current Behavior:** Fact card appears abruptly (`phase-enter .01s steps(1,end)`). Fact card width ($860\text{px}$) overlaps the right action rail and can collide with the mascot sprite.
- **Upgrades:**
  - Animate fact card entrance with smooth pop-in (`verdict-fact-enter 0.45s cubic-bezier(0.18, 1.42, 0.34, 1)`).
  - Restrict fact card width to `min(720px, 100%)`, ensuring perfect alignment with the choice pill stack and 100% action rail safe-zone clearance.
  - Implement mascot collision avoidance buffer.

---

## 5. True / False Button Tactile Engineering

The True / False buttons in `portrait_verdict_tf` are the central interactive anchors of the entire quiz. They must look and feel like arcade-cabinet physical buttons that players want to slam with their hands.

```
+------------------------------------------------------------------------------+
| TRUE BUTTON (Emerald Arcade Gradient: #10B981 -> #059669)                    |
| +--------------------------------------------------------------------------+ |
| | [Glossy Top Highlight Sheen: linear-gradient(180deg, rgba(255,255,255,0.4) | |
| |  [ (A) ]   TRUE                                                      ✓   | |
| +--------------------------------------------------------------------------+ |
| [ 14px Solid 3D Base Shadow: 0 14px 0 #047857 + Ambient Depth Shadow ]       |
+------------------------------------------------------------------------------+

+------------------------------------------------------------------------------+
| FALSE BUTTON (Rose Arcade Gradient: #F43F5E -> #E11D48)                      |
| +--------------------------------------------------------------------------+ |
| | [Glossy Top Highlight Sheen: linear-gradient(180deg, rgba(255,255,255,0.4) | |
| |  [ (B) ]   FALSE                                                     ✕   | |
| +--------------------------------------------------------------------------+ |
| [ 14px Solid 3D Base Shadow: 0 14px 0 #9F1239 + Ambient Depth Shadow ]       |
+------------------------------------------------------------------------------+
```

### Detailed Component Specifications:
1. **Pill Geometry & Dimensions:**
   - Width: `720px` (bounded within `max-width: 860px` with clean margins).
   - Height: `124px` (`--choice-card-height: 124px; --choice-card-min-height: 124px;`).
   - Border Radius: `9999px` (perfect full pill capsule).
   - Border: `6px solid #FFFFFF` with high-luminance white reflection.
2. **True Button Color System:**
   - Surface: `linear-gradient(135deg, #10B981 0%, #059669 100%)`.
   - 3D Bevel Lip: `0 14px 0 #047857`.
   - Ambient & Glow Shadows: `0 22px 38px rgba(5, 150, 105, 0.35), 0 0 28px rgba(16, 185, 129, 0.4), inset 0 4px 8px rgba(255, 255, 255, 0.6)`.
   - Circular Badge (`.choice-label`): `linear-gradient(135deg, #34D399 0%, #059669 100%)` with `5px solid #FFFFFF` and inner gloss sheen.
   - Text & Icon: Bold white typography (`font-weight: 900; letter-spacing: 1px; text-shadow: 0 3px 0 #047857`), with prominent `✓` glyph (`font-size: 1.25em`).
3. **False Button Color System:**
   - Surface: `linear-gradient(135deg, #F43F5E 0%, #E11D48 100%)`.
   - 3D Bevel Lip: `0 14px 0 #9F1239`.
   - Ambient & Glow Shadows: `0 22px 38px rgba(225, 29, 72, 0.35), 0 0 28px rgba(244, 63, 94, 0.4), inset 0 4px 8px rgba(255, 255, 255, 0.6)`.
   - Circular Badge (`.choice-label`): `linear-gradient(135deg, #FB7185 0%, #E11D48 100%)` with `5px solid #FFFFFF` and inner gloss sheen.
   - Text & Icon: Bold white typography (`font-weight: 900; letter-spacing: 1px; text-shadow: 0 3px 0 #9F1239`), with prominent `✕` glyph (`font-size: 1.25em`).
4. **Internationalization & Ordering Robustness:**
   - In multilingual production (e.g., Vietnamese "Đúng / Sai", Spanish "Verdadero / Falso", German "Wahr / Falsch"), choice orders might vary or labels may be inverted.
   - The CSS selectors should support semantic attributes (`data-choice-order="0"`, `data-choice-order="1"`, `.choice-true`, `.choice-false`) as well as fallback text pattern matching, guaranteeing that emerald green checkmark styling is strictly attached to True/Đúng/Wahr, and rose red cross styling is attached to False/Sai/Falsch.

---

## 6. Mascot Coexistence & Collision Avoidance

### Geometry & Positioning Analysis:
- In vertical 9:16 mode, the production mascot (`.candy-mascot-container.mascot-v2-container`) is placed at:
  - `bottom: 440px;` (elevated safely above the bottom overlay buffer).
  - Left anchor: `left: 36px;` (span: $x \in [36\text{px}, 256\text{px}]$, $y \in [1260\text{px}, 1480\text{px}]$).
  - Right anchor: `right: 140px;` (span: $x \in [700\text{px}, 920\text{px}]$, $y \in [1260\text{px}, 1480\text{px}]$).
- **Collision Risk with Choice Buttons:**
  - The True/False buttons occupy $y \in [916\text{px}, 1184\text{px}]$.
  - The buttons end $76\text{px}$ **above** the topmost reach of the mascot ($y = 1260\text{px}$).
  - **Verdict:** Zero vertical overlap between choices and mascot.
- **Collision Risk with Phase Region & Fact Card:**
  - The thinking bar sits at $y \in [1204\text{px}, 1288\text{px}]$. It has a minimal 28px potential vertical overlap with the mascot's head, but because its width is constrained to 720px centered at $x = 470\text{px}$ ($x \in [110\text{px}, 830\text{px}]$), when the mascot is on the bottom-left ($x \le 256\text{px}$), the mascot sprite can overlap the left 146px of the timer bar.
  - When the fact card appears in Phase 5 ($y \in [1204\text{px}, 1324\text{px}]$), the mascot directly overlaps the fact card text! Because `--candy-layer-mascot: 11` exceeds `--phase-region: 5`, the mascot renders on top of the text.
- **Coexistence Solution for `.has-mascot`:**
  - When `.has-mascot` is active on `.layout-portrait_verdict_tf`:
    1. Adjust `.phase-region` height and compact the fact card padding (`padding: 12px 24px; font-size: 32px;`).
    2. When the mascot is anchored at `anchor-bottom_left`, shift the embedded phase region slightly or constrain its width so that the fact text box remains centered in the unobstructed zone.
    3. Ensure that in Phase 5, the mascot triggers the `point` or `celebrate` animation facing toward the fact card, functioning as an energetic game-show host presenting the verdict explanation.

---

## 7. Concrete Architectural & CSS Upgrade Plan

Below is the complete, drop-in replacement implementation for [`apps/server/src/quiz/render/layouts/portrait/portraitVerdictTf.ts`](file:///d:/1a%20Cursor%20Project/My%201x%20Project/apps/server/src/quiz/render/layouts/portrait/portraitVerdictTf.ts).

```typescript
import type { QuizLayoutRenderDefinition } from "../types.js";

/**
 * Portrait Verdict True/False Layout (9:16 Vertical Video).
 *
 * Tailored specifically for 1080×1920 mobile portrait video (TikTok, YouTube Shorts, Instagram Reels).
 * Architectural requirements:
 * 1. Question Box: Centered statement card style, max-width ~880px, starts below inviolable header.
 * 2. Center Visual: Large prominent visual area (860px width × 540px height), rounded-3xl borders, glowing depth shadow.
 * 3. True / False Choice Buttons:
 *    - 2 oversized high-contrast 3D arcade pill buttons (width: 720px, height: 124px).
 *    - TRUE: Emerald Green styling (#10B981 / #059669 gradient) with bold text and checkmark (✓).
 *    - FALSE: Rose Red styling (#F43F5E / #E11D48 gradient) with bold text and cross (✕).
 *    - Safe-zone clearance: >= 140px right clearance protecting choices from TikTok/Reels action rail.
 * 4. Synchronized Multi-Phase Timeline:
 *    - Phase 2 entrance animations properly delayed with calc(var(--clip-start) + var(--choices-at) + offset).
 *    - Phase 4 reveal animations with high specificity ensuring victorious pulse vs settle dimming.
 * 5. Embedded Phase Region & Alignment:
 *    - Placed directly below choices, centered along the exact same vertical axis as the choice pills (no 70px drift).
 *    - Elevated Thinking Bar and Fact Card sit at or above y = 1480px, guaranteeing >= 440px clean bottom buffer.
 *    - Fact Card constrained to 720px, preventing encroachment into the 140px right action rail.
 */
export const portraitVerdictTfLayout = {
  id: "portrait_verdict_tf",
  renderBody: (slots) =>
    `${slots.questionBoxHtml}${slots.heroHtml}${slots.choicesHtml}<div class="phase-region portrait-phase-embedded">${slots.phaseHtml}</div>`,
  css: (aspectRatio) => `
/* === Portrait Verdict True/False Layout (9:16 TikTok / Reels / Shorts) === */
.layout-portrait_verdict_tf .game-stage {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-areas:
    "title"
    "hero"
    "answers"
    "phase";
  justify-items: center;
  align-items: start;
  width: 100%;
  max-width: 960px;
  min-height: 0;
  margin: 176px auto 0;
  padding: 0 24px;
  box-sizing: border-box;
  row-gap: 20px;
}

/* Question Statement Card: Centered, statement card style, max-width ~880px */
.layout-portrait_verdict_tf .question-title {
  grid-area: title;
  width: 100%;
  max-width: 880px;
  min-height: 140px;
  height: auto;
  margin: 0 auto;
  text-align: center;
  justify-self: center;
}
.layout-portrait_verdict_tf .question-card-inner {
  padding: 20px 32px;
  border-radius: 36px;
  box-sizing: border-box;
}

/* Center Visual: Large prominent visual area (860px width × 540px height), rounded-3xl borders, glowing depth shadow */
.layout-portrait_verdict_tf .game-stage > .hero-image {
  grid-area: hero;
  width: 860px;
  height: 540px;
  max-width: 860px;
  max-height: 540px;
  margin: 0 auto;
  border-radius: 32px;
  border: 10px solid #FFFFFF;
  box-shadow:
    0 16px 0 rgba(13, 35, 71, 0.22),
    0 24px 48px rgba(10, 25, 60, 0.28),
    0 0 32px rgba(255, 215, 0, 0.28),
    inset 0 4px 8px rgba(255, 255, 255, 0.5);
  overflow: hidden;
  box-sizing: border-box;
}
.layout-portrait_verdict_tf .hero-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 22px;
}
.layout-portrait_verdict_tf.quiz-question-clip .hero-image {
  animation: enter-from-left 0.62s cubic-bezier(0.22, 0.8, 0.3, 1) var(--clip-start) both,
    hero-float var(--scene-duration) ease-in-out calc(var(--clip-start) + 0.62s) 1 alternate both;
  will-change: transform;
}

/* Verdict Choices: 2 oversized high-contrast pill buttons with >= 140px safe-zone clearance */
.layout-portrait_verdict_tf .answer-grid {
  grid-area: answers;
  grid-template-columns: 1fr;
  width: 100%;
  max-width: 860px;
  margin: 0 auto;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-right: 140px; /* Safe-zone clearance >= 140px for TikTok/Reels action rail */
  gap: 20px;
}

.layout-portrait_verdict_tf {
  --choice-card-min-height: 124px;
  --choice-card-height: 124px;
  --choice-card-margin-left: 68px;
  --choice-card-padding: 14px 36px 14px 40px;
  --choice-badge-size: 120px;
  --choice-badge-margin-left: -68px;
  --choice-badge-font-size: 68px;
  --choice-font-size-base: 44px;
  --choice-font-size-medium: 38px;
  --choice-font-size-long: 30px;
  --choice-font-size-very_long: 24px;
  --choice-font-size-overflow: 22px;
  --choice-fit-min: 22px;
  --choice-fit-max: 72px;
  --choice-fit-max-lines: 2;
  --choice-fit-leading: 1.08;
}

.has-mascot.layout-portrait_verdict_tf {
  --choice-font-size-base: 38px;
  --choice-font-size-medium: 32px;
  --choice-font-size-long: 26px;
}

/* Oversized Pill Button Shape: 720px width bounded inside 860px grid */
.layout-portrait_verdict_tf .choice-card,
.layout-portrait_verdict_tf .choice-card-text,
.layout-portrait_verdict_tf .answer-card {
  width: 100%;
  max-width: 720px;
  border-radius: 9999px;
  box-sizing: border-box;
  transition: transform 0.2s cubic-bezier(0.22, 0.8, 0.3, 1), opacity 0.2s ease-out;
}

/* TRUE Button: Emerald Green styling (#10B981 / #059669 gradient) with bold text and checkmark */
.layout-portrait_verdict_tf .choice-card:nth-child(1) .choice-card-surface,
.layout-portrait_verdict_tf .choice-card:nth-child(1).answer-card,
.layout-portrait_verdict_tf .choice-card:first-child .choice-card-surface,
.layout-portrait_verdict_tf .choice-card:first-child.answer-card,
.layout-portrait_verdict_tf .choice-card[data-choice-order="0"] .choice-card-surface,
.layout-portrait_verdict_tf .choice-card[data-choice-order="0"].answer-card,
.layout-portrait_verdict_tf .choice-true {
  background: linear-gradient(135deg, #10B981 0%, #059669 100%);
  border: 6px solid #FFFFFF;
  border-radius: 9999px;
  box-shadow:
    0 14px 0 #047857,
    0 22px 38px rgba(5, 150, 105, 0.35),
    0 0 28px rgba(16, 185, 129, 0.4),
    inset 0 4px 8px rgba(255, 255, 255, 0.6);
  color: #FFFFFF;
}

.layout-portrait_verdict_tf .choice-card:nth-child(1) .choice-label,
.layout-portrait_verdict_tf .choice-card:first-child .choice-label {
  background: linear-gradient(135deg, #34D399 0%, #059669 100%);
  border: 5px solid #FFFFFF;
  border-radius: 50%;
  box-shadow:
    0 6px 0 rgba(4, 120, 87, 0.4),
    0 0 16px rgba(16, 185, 129, 0.5),
    inset 0 2px 4px rgba(255, 255, 255, 0.7);
  color: #FFFFFF;
}

.layout-portrait_verdict_tf .choice-card:nth-child(1) .choice-text::after,
.layout-portrait_verdict_tf .choice-card:first-child .choice-text::after,
.layout-portrait_verdict_tf .choice-true .choice-text::after {
  content: " ✓";
  font-weight: 900;
  margin-left: 14px;
  font-size: 1.2em;
  color: #FFFFFF;
  text-shadow: 0 2px 4px rgba(4, 120, 87, 0.6);
}

/* FALSE Button: Rose Red styling (#F43F5E / #E11D48 gradient) with bold text and cross */
.layout-portrait_verdict_tf .choice-card:nth-child(2) .choice-card-surface,
.layout-portrait_verdict_tf .choice-card:nth-child(2).answer-card,
.layout-portrait_verdict_tf .choice-card:last-child .choice-card-surface,
.layout-portrait_verdict_tf .choice-card:last-child.answer-card,
.layout-portrait_verdict_tf .choice-card[data-choice-order="1"] .choice-card-surface,
.layout-portrait_verdict_tf .choice-card[data-choice-order="1"].answer-card,
.layout-portrait_verdict_tf .choice-false {
  background: linear-gradient(135deg, #F43F5E 0%, #E11D48 100%);
  border: 6px solid #FFFFFF;
  border-radius: 9999px;
  box-shadow:
    0 14px 0 #9F1239,
    0 22px 38px rgba(225, 29, 72, 0.35),
    0 0 28px rgba(244, 63, 94, 0.4),
    inset 0 4px 8px rgba(255, 255, 255, 0.6);
  color: #FFFFFF;
}

.layout-portrait_verdict_tf .choice-card:nth-child(2) .choice-label,
.layout-portrait_verdict_tf .choice-card:last-child .choice-label {
  background: linear-gradient(135deg, #FB7185 0%, #E11D48 100%);
  border: 5px solid #FFFFFF;
  border-radius: 50%;
  box-shadow:
    0 6px 0 rgba(159, 18, 57, 0.4),
    0 0 16px rgba(244, 63, 94, 0.5),
    inset 0 2px 4px rgba(255, 255, 255, 0.7);
  color: #FFFFFF;
}

.layout-portrait_verdict_tf .choice-card:nth-child(2) .choice-text::after,
.layout-portrait_verdict_tf .choice-card:last-child .choice-text::after,
.layout-portrait_verdict_tf .choice-false .choice-text::after {
  content: " ✕";
  font-weight: 900;
  margin-left: 14px;
  font-size: 1.2em;
  color: #FFFFFF;
  text-shadow: 0 2px 4px rgba(159, 18, 57, 0.6);
}

/* Bold Choice Text */
.layout-portrait_verdict_tf .choice-card .choice-text,
.layout-portrait_verdict_tf .choice-card .answer-card span {
  font-weight: 900;
  letter-spacing: 0.5px;
  color: #FFFFFF;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

/* Phase 2: Dynamic Staggered Entrance Animations for Pill Buttons (Synchronized to choices-at) */
.layout-portrait_verdict_tf.quiz-question-clip .choice-card:nth-child(1) {
  animation: enter-from-left 0.52s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start) + var(--choices-at) + 0.06s) both;
}
.layout-portrait_verdict_tf.quiz-question-clip .choice-card:nth-child(2) {
  animation: enter-from-right 0.52s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start) + var(--choices-at) + 0.16s) both;
}

/* Phase 4: High-Specificity Verdict Reveal Keyframe Overrides */
.layout-portrait_verdict_tf.quiz-question-clip .choice-card.answer-reveal-correct,
.layout-portrait_verdict_tf.quiz-question-clip .choice-card.answer-correct {
  animation: verdict-correct-pop 0.65s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start) + var(--reveal-at)) both !important;
  z-index: 6 !important;
}
.layout-portrait_verdict_tf.quiz-question-clip .choice-card.answer-reveal-incorrect,
.layout-portrait_verdict_tf.quiz-question-clip .choice-card.answer-incorrect {
  animation: verdict-incorrect-settle 0.42s ease-out calc(var(--clip-start) + var(--reveal-at)) both !important;
  z-index: 2 !important;
}

@keyframes verdict-correct-pop {
  0% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-10px) scale(1.06); filter: brightness(1.15); }
  100% {
    transform: translateY(-6px) scale(1.04);
    box-shadow:
      0 16px 0 #047857,
      0 26px 48px rgba(16, 185, 129, 0.6),
      0 0 44px rgba(52, 211, 153, 0.8),
      inset 0 4px 8px rgba(255, 255, 255, 0.85);
  }
}

@keyframes verdict-incorrect-settle {
  0% { transform: scale(1); opacity: 1; filter: grayscale(0%); }
  100% {
    transform: translateY(4px) scale(0.94);
    opacity: 0.32;
    filter: grayscale(85%) contrast(0.9) brightness(0.85);
    box-shadow: 0 4px 0 rgba(13, 35, 71, 0.2);
    border-color: rgba(255, 255, 255, 0.4);
  }
}

/* Embedded Phase Region: Placed directly below choices, perfectly aligned with pill stack */
.layout-portrait_verdict_tf .phase-region {
  grid-area: phase;
  position: relative;
  z-index: 5;
  left: auto;
  right: auto;
  bottom: auto;
  top: auto;
  transform: none;
  width: 100%;
  max-width: 860px;
  height: 90px;
  margin: 14px auto 0;
  padding-right: 140px; /* Safe-zone clearance >= 140px aligned with choice buttons */
  box-sizing: border-box;
}

/* Thinking Bar: Sits centered directly beneath the 720px pill stack */
.layout-portrait_verdict_tf .phase-region > .thinking-bar {
  position: absolute;
  top: 0;
  bottom: auto;
  left: calc((100% - 140px) / 2);
  transform: translateX(-50%);
  width: min(720px, calc(100% - 140px));
  min-height: 72px;
}

/* Fact Card: Constrained to 720px max, guaranteeing >= 140px right safe-zone clearance */
.layout-portrait_verdict_tf .phase-region > .fact-card {
  position: absolute;
  top: 0;
  bottom: auto;
  left: calc((100% - 140px) / 2);
  transform: translateX(-50%);
  width: min(720px, calc(100% - 140px));
  margin-top: 0;
  padding: 16px 28px;
  border-radius: 32px;
  box-sizing: border-box;
  animation: verdict-fact-enter 0.42s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start) + var(--reward-at)) both;
}

@keyframes verdict-fact-enter {
  0% { opacity: 0; transform: translate(-50%, 16px) scale(0.92); }
  100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
}

/* Specificity overrides for 9:16 stage canvas */
#stage[data-aspect-ratio="9:16"] .layout-portrait_verdict_tf .game-stage {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-areas:
    "title"
    "hero"
    "answers"
    "phase";
  width: calc(100% - 72px);
  max-width: 960px;
  min-height: 0;
  margin: 176px auto 0;
  padding-bottom: 0;
  margin-bottom: 440px; /* Bottom safe-zone clearance: guarantees at least 440px clean buffer from the bottom */
  row-gap: 20px;
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_verdict_tf .question-title {
  width: 100%;
  max-width: 880px;
  min-height: 140px;
  height: auto;
  margin: 0 auto;
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_verdict_tf .game-stage > .hero-image {
  width: 860px;
  height: 540px;
  max-width: 860px;
  max-height: 540px;
  margin: 0 auto;
  border-radius: 32px;
  border: 10px solid #FFFFFF;
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_verdict_tf .answer-grid {
  width: 100%;
  max-width: 860px;
  margin: 0 auto;
  padding-right: 140px; /* Safe-zone clearance >= 140px for TikTok/Reels right action rail */
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_verdict_tf .phase-region {
  position: relative;
  left: auto;
  right: auto;
  bottom: auto;
  top: auto;
  transform: none;
  width: 100%;
  max-width: 860px;
  height: 90px;
  margin: 14px auto 0;
  padding-right: 140px; /* Safe-zone clearance >= 140px */
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_verdict_tf .phase-region > .thinking-bar {
  position: absolute;
  top: 0;
  bottom: auto;
  left: calc((100% - 140px) / 2);
  transform: translateX(-50%);
  width: min(720px, calc(100% - 140px));
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_verdict_tf .phase-region > .fact-card {
  position: absolute;
  top: 0;
  bottom: auto;
  left: calc((100% - 140px) / 2);
  transform: translateX(-50%);
  width: min(720px, calc(100% - 140px));
}
`,
} satisfies QuizLayoutRenderDefinition;
```

---

## 8. Implementation Checklist & Verification Strategy

| Item | Validation Task | Acceptance Criteria | Automated Test Guard |
|---|---|---|---|
| **1** | Inviolable Anchors Untouched | Question counter (`.game-header`) and brand mark (`.channel-brand-mark`) coordinates unchanged. | `apps/server/test/quizLayoutsPortrait.test.ts` (suite passes) |
| **2** | 9:16 Right Safe-Zone Clearance | All choice buttons, thinking bar, and fact card maintain $\ge 140\text{px}$ clear margin from canvas right edge. | Regex match: `padding-right:\s*140px`, fact card width $\le 720\text{px}$ |
| **3** | Bottom Overlay Safe-Zone Clearance | All stage contents terminate at $y \le 1480\text{px}$, leaving $\ge 440\text{px}$ buffer from canvas bottom. | `margin-bottom:\s*440px` verified; total height $\le 1324\text{px}$ |
| **4** | Phase 2 Choice Entrance Synchronization | Choices slide in starting at `choicesStart` using `var(--choices-at)` instead of premature `0.12s`. | Visual inspection of subcomposition markup and animation delay calc |
| **5** | Phase 4 Answer Reveal Climax | Winning button blooms and expands; losing button settles to 32% opacity and grayscale. | Reveal keyframe override specificity $\ge (0, 4, 0)$ verified |
| **6** | Horizontal Axis Alignment | Thinking bar and choice buttons share the exact same vertical center line ($x = 470\text{px}$). | `left: calc((100% - 140px) / 2)` formula removes 70px drift |
| **7** | Mascot Coexistence Guard | Mascot sprite at `bottom: 440px` does not obscure fact card or choices. | Test with `--mascot-enabled` in Sandbox preview pipeline |
| **8** | Backward Compatibility | All existing tests across the server suite pass with zero regressions. | `pnpm --filter @studio/server test test/quizLayoutsPortrait.test.ts` passes |

---

## 9. Conclusion

This audit provides the complete blueprint to elevate `portrait_verdict_tf` from a static layout with animation synchronization bugs into an exhilarating, broadcast-ready vertical video experience. By resolving the Phase 2 entrance delay bug, overcoming the CSS cascade specificity blockage on Phase 4 reveal, eliminating the 70px timer bar drift, and strictly enclosing the Fact Card within the 140px mobile safe zone, the layout delivers unmatched visual punch and arcade satisfaction for TikTok, Shorts, and Reels audiences.
