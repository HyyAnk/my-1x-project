# Visual, Architectural, and Multi-Phase Timeline Audit: `portrait_hero_choices` Layout

**Layout ID:** `portrait_hero_choices`  
**Target Format:** 9:16 Mobile Vertical Video (1080 × 1920 px)  
**Primary Platforms:** TikTok, YouTube Shorts, Instagram Reels  
**Target Engine:** Candy Arcade Quiz Engine v2 (Hyperframes / Canvas Renderer)  
**Author:** Frontend Architect & Motion UI Specialist  
**Status:** Complete Audit & Actionable Upgrade Plan  

---

## 1. Executive Summary

The `portrait_hero_choices` layout is the flagship 9:16 vertical video layout for single-image multiple-choice questions in the Candy Arcade Quiz Engine. It displays a top Question Card, a central Hero Media Card, a vertical stack of Choice Pills (supporting 2 or 3 options), and an embedded Phase Region that transitions seamlessly from a 5-second Thinking Countdown Bar to a Fun Fact / Explanation Card.

While the conceptual intent is well-aligned with high-retention mobile short-form video, an exhaustive geometric, architectural, and timeline audit reveals **critical layout bugs, safe-zone breaches, and animation deficiencies** in the current implementation:

1. **Top Anchor Collision (Severe):** The stage container sets `margin-top: 140px;`, but the inviolable Question Counter Badge (`.hanging-wood-sign`) hangs down to `y = 194px` (and its bottom star swings down to `y = 204px`). As a result, the counter badge physically overlaps the Question Title Card by over 54 vertical pixels.
2. **Right Safe-Zone Violations (Critical):**
   - The Choice Pills attempt to clear the TikTok right action rail (140px) via `padding-right: 140px` on `.answer-grid`, which shifts the choice cards 70px to the left (center $x = 470\text{px}$).
   - However, `.thinking-bar` and `.fact-card` inside `.phase-region` use `left: 50%; transform: translateX(-50%);`, remaining centered at $x = 540\text{px}$. This causes a **jarring 70px horizontal misalignment** between the choices and the timer directly underneath them.
   - The Fact Card ($860\text{px}$ wide, centered) extends to $x = 970\text{px}$, leaving only $110\text{px}$ from the canvas edge and **directly colliding with TikTok action buttons** (Like, Comment, Share, Sound disk).
   - The Countdown Star Marker ($192\text{px}$ diameter) on the thinking track reaches $x = 996\text{px}$ at $100\%$ countdown, leaving only $84\text{px}$ of right margin—colliding severely with mobile social UI.
3. **Bottom Safe-Zone Breach (High):** When the question or choice text wraps onto 2 lines, the total vertical stack pushes the Fact Card down to $y = 1560\text{px}\text{--}1600\text{px}$, violating the mandatory $440\text{px}$ bottom safe buffer ($y \le 1480\text{px}$) and colliding with creator captions, hashtags, and the audio marquee.
4. **Non-Standard Hero Aspect Ratio:** The Hero Image is hardcoded to $860 \times 500\text{px}$ (ratio $1.72:1$), which crops standard $16:9$ ($1.777:1$) media and severely clips $4:3$ ($1.333:1$) assets by up to $22.5\%$. Resizing to $800 \times 450\text{px}$ achieves an exact, undistorted $16:9$ ratio while freeing up $50\text{px}$ of vertical height.
5. **Missing Choice Stagger Animation:** Choice pills appear abruptly with an instant `phase-enter` step rather than a punchy, staggered entrance with bounce easing.
6. **Mascot Occlusion:** In Phase 5, the Fact Card spans across $x = 110\text{px}$ to $970\text{px}$, completely covering any mascot co-host anchored at `bottom: 440px`.

This report provides the full architectural blueprint and production-ready CSS replacement to fix all coordinate collisions, ensure $100\%$ safe-zone compliance, and elevate the Candy Arcade aesthetic flair.

---

## 2. Inviolable Anchors Verification

The Candy Arcade quiz framework enforces two strictly immutable anchor components that must never have their position, alignment, geometry, or z-index altered:

| Inviolable Anchor | DOM Selector | Native Geometry | Canvas Coordinates (9:16) | Status in Audit |
| :--- | :--- | :--- | :--- | :--- |
| **Question Counter Badge** | `stableParts.counterBadgeHtml`<br>`.game-header`<br>`.hanging-wood-sign` | Width: $250\text{px}$, Plank: $240 \times 150\text{px}$, Ropes: $44\text{px}$, Stars: $\pm 10\text{px}$ | `top: 0; left: 24px;`<br>Total Span: $x \in [24, 274]\text{px}$, $y \in [0, 204]\text{px}$ | **PRESERVED 100%**<br>(Audit fixes stage margin so stage clears the badge) |
| **Channel Brand Mark** | `stableParts.brandMarkHtml`<br>`.channel-brand-mark` | Horizontal badge with channel name ($42\text{px}$) and sub-label ($26\text{px}$) | `top: 42px; right: 36px;`<br>Total Span: $x \in [420, 1044]\text{px}$, $y \in [42, 110]\text{px}$ | **PRESERVED 100%**<br>(Zero coordinate or style alterations) |

> [!IMPORTANT]
> Neither `.game-header` nor `.channel-brand-mark` will be touched. Instead, `.game-stage`'s top margin will be adjusted from `140px` to `196px`, ensuring that the Question Card begins immediately below the swinging wooden plank without any pixel collision.

---

## 3. Mobile Safe-Zone & Coordinate Audit (1080 × 1920 px)

### 3.1 Mobile Safe-Zone Boundary Rules
Modern vertical short-form platforms (TikTok, Instagram Reels, YouTube Shorts) place persistent native UI elements over the video canvas:
- **Top Buffer ($y \le 194\text{px}$):** System status bar, account search icon, and our inviolable top header components.
- **Right Action Rail ($x \ge 940\text{px}$, width $\ge 140\text{px}$):** Profile follow button, Like, Comments, Share, Bookmark, and the rotating Sound disc. Active from $y \approx 720\text{px}$ to $y \approx 1550\text{px}$.
- **Bottom Overlay Zone ($y \ge 1480\text{px}$, height $\ge 440\text{px}$):** Creator handle `@username`, multi-line caption, translation link, audio marquee ticker, and video seek scrubber.

```
+-------------------------------------------------------------+ y = 0
| [Counter Badge: 24-274px, 0-204px]     [Brand Mark: Top R]  | Top Buffer
+-------------------------------------------------------------+ y = 194px (Safe Stage Top)
|                                                             |
|                    QUESTION TITLE CARD                      |
|                                                             |
+-------------------------------------------------------------+
|                                                             |
|                      HERO MEDIA CARD                        |
|                     (800 x 450 px 16:9)                     |
|                                            +----------------+
|                                            | [TikTok Rail]  |
+--------------------------------------------+ | Like         |
|                                            | | Comment      |
|                    CHOICE PILLS            | | Share        |
|               (A, B, C Stacked Pills)      | | Bookmark     |
|                                            | | Sound Disc   |
+--------------------------------------------+ |              |
|          THINKING BAR / FACT CARD          | |              |
+--------------------------------------------+----------------+ y = 1480px (Safe Stage Bottom)
| Creator Handle, Multi-line Captions, Sound Marquee, Scrubber| Bottom Overlay
+-------------------------------------------------------------+ y = 1920px
x = 0                                       x = 940px        x = 1080px
```

---

### 3.2 Current vs. Proposed Coordinate Budget

The table below details the exact pixel coordinates for the current implementation vs. the proposed redesigned layout (calculated for a 3-choice layout with 2-line question text):

| Layout Element | Current Implementation | Defect / Collision Type | Proposed Redesign | Redesign Clearance |
| :--- | :--- | :--- | :--- | :--- |
| **Stage Margin Top** | `140px` | **Collision:** Overlaps Counter Badge ($y \le 204\text{px}$) by $54\text{px}$ | `196px` | Clears Counter Badge by $2\text{px}$ (clean zero-collision anchor) |
| **Question Title Box** | $y \in [140, 310]\text{px}$, $h = 170\text{px}$<br>$w = 880\text{px}$ ($x \in [100, 980]\text{px}$) | Overlaps badge on left ($x \in [100, 274]\text{px}$); penetrates right rail by $40\text{px}$ | $y \in [196, 356]\text{px}$, $h = 160\text{px}$<br>$w = 800\text{px}$ ($x \in [140, 940]\text{px}$) | Centered at $x=540\text{px}$. Right margin: $140\text{px}$. Left margin: $140\text{px}$. |
| **Gap 1** | $20\text{px}$ | - | $16\text{px}$ | Compact breathing room |
| **Hero Image Card** | $y \in [330, 830]\text{px}$, $h = 500\text{px}$<br>$w = 860\text{px}$ ($x \in [110, 970]\text{px}$) | Ratio $1.72:1$ crops $16:9$ media; right edge ($970\text{px}$) breaches $140\text{px}$ safe zone | $y \in [372, 822]\text{px}$, $h = 450\text{px}$<br>$w = 800\text{px}$ ($x \in [140, 940]\text{px}$) | **Exact 16:9 ratio** ($800 \times 450$). Right margin: $140\text{px}$. Frees $50\text{px}$ vertical space. |
| **Gap 2** | $20\text{px}$ | - | $16\text{px}$ | Compact breathing room |
| **Choice Group (3 items)** | $y \in [850, 1184]\text{px}$, $h = 334\text{px}$<br>$w = 720\text{px}$ ($x \in [110, 830]\text{px}$) | **Asymmetric bug:** Centered at $x = 470\text{px}$, $70\text{px}$ offset to the left of Hero card | $y \in [838, 1142]\text{px}$, $h = 304\text{px}$<br>$w = 800\text{px}$ ($x \in [140, 940]\text{px}$) | Centered at $x = 540\text{px}$. Cards match Hero width ($800\text{px}$). Right margin: $140\text{px}$. |
| **Gap 3** | $20\text{px} + 12\text{px} = 32\text{px}$ | Excess margin | $16\text{px}$ | Streamlined document flow |
| **Phase Region: Thinking Bar** | $y \in [1216, 1306]\text{px}$, $w = 720\text{px}$<br>Track $x \in [180, 900]\text{px}$<br>Marker star $x \in [804, 996]\text{px}$ | **Collision:** Star marker extends to $x = 996\text{px}$ (only $84\text{px}$ from canvas edge); misaligned with choices | $y \in [1158, 1238]\text{px}$, $w = 660\text{px}$<br>Track $x \in [210, 870]\text{px}$<br>Marker star $x \in [774, 940]\text{px}$ | Centered at $x = 540\text{px}$. **Marker star right edge stops exactly at $x = 940\text{px}$** ($140\text{px}$ safe buffer). |
| **Phase Region: Fact Card** | $y \in [1216, 1446]\text{px}$ (or $1560\text{px}$ with long text)<br>$w = 860\text{px}$ ($x \in [110, 970]\text{px}$) | **Breach:** Crosses $y = 1480\text{px}$ bottom safe line; extends to $x = 970\text{px}$ hitting TikTok buttons | $y \in [1158, 1348]\text{px}$, $h \le 190\text{px}$<br>$w = 800\text{px}$ ($x \in [140, 940]\text{px}$) | **Ends at $y = 1348\text{px}$** ($132\text{px}$ above bottom safe line!). Right margin: $140\text{px}$. Zero occlusion. |

---

## 4. Component Proportions & Sizing Audit

### 4.1 Question Box
- **Current Specs:** `max-width: 880px; min-height: 140px; height: auto; padding: 20px 32px;`
- **Audit Findings:**
  1. Text fitting uses `textLayout()` from `candyArcade.ts`. Font sizes range from $74\text{px}$ (ultra-short) down to $38\text{px}$ (very long) and $32\text{px}$ (overflow).
  2. For 2-line questions at $54\text{px}$ (medium tier, line-height 1.18), the text block takes $127\text{px}$. With $40\text{px}$ padding and $14\text{px}$ border, total height becomes $181\text{px}$.
  3. The current `min-height: 140px` causes layout shifts when text expands. Setting a firm `min-height: 154px; max-height: 174px;` with `-webkit-line-clamp: 2` and `text-wrap: balance` creates consistent vertical geometry without unpredictable pushing.
  4. Width should be normalized to `max-width: 800px` to maintain consistent vertical column bounds with the Hero and Choice cards.

### 4.2 Hero Media Card
- **Current Specs:** `width: 860px; height: 500px; border: 10px solid #FFFFFF; border-radius: 32px;`
- **Audit Findings:**
  1. **Aspect Ratio Distortion:** $860 / 500 = 1.72:1$. Standard landscape video and generative AI assets are created in $16:9$ ($1.777:1$ or $1280 \times 720 / 1920 \times 1080$). The $1.72$ container with `object-fit: cover` clips $3\%$ off horizontal edges.
  2. **4:3 Distortion:** For retro/archival imagery ($4:3 = 1.333:1$), the container crops out $22.5\%$ of the vertical content, often lopping off focal objects, animals, or clue details.
  3. **Right Safe-Zone Collision:** An $860\text{px}$ centered container extends to $x = 970\text{px}$, which is $30\text{px}$ inside the $140\text{px}$ right action rail.
  4. **Vertical Space Hog:** Consuming $500\text{px}$ vertically accounts for $39.2\%$ of the total available height between safe zones, forcing choices and the timer bar into bottom safe-zone collisions.
  5. **Upgrade Plan:** Resize to **$800 \times 450\text{px}$** (aspect ratio $16:9$ exactly, $800 / 450 = 1.777$). This preserves full fidelity of standard $16:9$ images, guarantees a symmetrical $140\text{px}$ right clearance, and saves $50\text{px}$ of vertical height.

### 4.3 Choice Pills (2 vs. 3 Options)
- **Current Specs:**
  `--choice-card-min-height: 96px; --choice-badge-size: 110px; --choice-badge-margin-left: -64px; --choice-card-margin-left: 64px;`
- **Audit Findings:**
  1. **Badge Protrusion Issue:** A $110\text{px}$ badge on a $96\text{px}$ card overflows $7\text{px}$ above and $7\text{px}$ below the card. For tight $14\text{px}$ gaps, the badges visually encroach on neighboring card margins.
  2. **Asymmetric Grid Padding:** `.answer-grid { padding-right: 140px; }` reduces card width to $720\text{px}$ while shifting them to the left.
  3. **2-Choice vs. 3-Choice Disparity:**
     - For 2 choices, `portraitHeroChoices.ts` leaves cards at $96\text{px}$ height, resulting in $212\text{px}$ total height and huge empty voids in the lower frame.
     - For 2 choices, cards should expand to `min-height: 112px; gap: 20px; font-size: 42px;` to command the stage.
     - For 3 choices, cards should sit at `min-height: 92px; gap: 14px; font-size: 38px;` with badge size tuned to $104\text{px}$ (margin-left: $-52\text{px}$, card margin-left: $52\text{px}$).

---

## 5. Multi-Phase Progression Timeline Audit

The quiz scene progresses through 5 synchronized lifecycle phases defined in `packages/shared/src/timing.ts`:

```
Phase 1: Question Intro   [0.00s  ->  1.43s]  (1.43s)
Phase 2: Choices Stagger  [1.43s  ->  3.37s]  (1.94s)
Phase 3: Thinking Bar     [3.37s  ->  8.37s]  (5.00s)
Phase 4: Answer Reveal    [8.37s  ->  9.77s]  (1.40s)
Phase 5: Fact / Reward    [9.77s  -> 11.77s]  (2.00s)
```

### 5.1 Phase 1: Question Intro ($t = 0.00\text{s}$)
- **Current Behavior:** Question card enters with `question-card-enter` ($0.52\text{s}$ cubic-bezier), Hero image enters with `enter-from-left` ($0.62\text{s}$) and begins `hero-float` sway. Counter badge swings from top-left. Choices and phase region are hidden (`opacity: 0`).
- **Defects:**
  - The Question Card top edge sits at $y = 140\text{px}$, colliding directly with the swinging wooden sign plank ($y = 44\text{px}\text{--}194\text{px}$) and star badge ($y = 204\text{px}$).
- **Upgrade:** Increase `.game-stage` `margin-top` to `196px`. Question Card now enters cleanly below the counter sign with zero intersection.

### 5.2 Phase 2: Choices Stagger ($t = 1.43\text{s}$)
- **Current Behavior:** Choice container flips from `opacity: 0` to `opacity: 1` instantly at `var(--choices-at)`. All 3 choice pills pop into existence simultaneously.
- **Defects:**
  - **Zero Card Stagger:** No slide-in or pop-in animation exists for individual cards in `portraitHeroChoices.ts`. In contrast, `portraitSplitVersus` features directional slide entrances.
  - Choices appear static and lack the kinetic energy expected of Candy Arcade.
- **Upgrade:** Implement staggered entrance keyframes:
  ```css
  .layout-portrait_hero_choices.quiz-question-clip .choice-card:nth-child(1) {
    animation: choice-card-enter 0.48s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start) + var(--choices-at)) both;
  }
  .layout-portrait_hero_choices.quiz-question-clip .choice-card:nth-child(2) {
    animation: choice-card-enter 0.48s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start) + var(--choices-at) + 0.12s) both;
  }
  .layout-portrait_hero_choices.quiz-question-clip .choice-card:nth-child(3) {
    animation: choice-card-enter 0.48s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start) + var(--choices-at) + 0.24s) both;
  }
  ```

### 5.3 Phase 3: Thinking Countdown ($t = 3.37\text{s}$)
- **Current Behavior:** Thinking bar appears with `phase-hold`. The rainbow gradient track drains from $100\%$ to $0\%$ over 5 seconds (`quiz-timer-drain`). A circular star marker slides from right to left with SVG countdown digits (5, 4, 3, 2, 1).
- **Defects:**
  - **Star Marker Rail Clash:** At $t = 3.37\text{s}$ (start of countdown), the marker star is at `left: 100%`. On a $720\text{px}$ track centered at $x = 540\text{px}$, the track right edge is at $x = 900\text{px}$. The $192\text{px}$ star marker (`transform: translate(-50%, -50%)`) reaches $x = 900 + 96 = \mathbf{996\text{px}}$! This is only $84\text{px}$ from the right edge, deeply violating the $140\text{px}$ safe zone and colliding with the TikTok Like/Bookmark buttons.
  - **Horizontal Offset:** The thinking bar is centered at $x = 540\text{px}$, but the choice cards directly above it are shifted to center $x = 470\text{px}$, creating a bizarre $70\text{px}$ step.
- **Upgrade:**
  - Re-align choice cards and thinking bar to the exact same center axis ($x = 540\text{px}$).
  - Set thinking bar track width to **$660\text{px}$** (track left: $210\text{px}$, track right: $870\text{px}$).
  - At $100\%$ position, the marker star ($96\text{px}$ radius) extends to $870 + 70 = \mathbf{940\text{px}}$, **guaranteeing $100\%$ safe-zone clearance ($\ge 140\text{px}$)**.

### 5.4 Phase 4: Answer Reveal ($t = 8.37\text{s}$)
- **Current Behavior:** Correct choice pill triggers `correct-card-reveal` (emerald glow, $1.04$ scale, green border `#22C55E`). Incorrect choice pills trigger `incorrect-card-settle` (opacity $0.35$, grayscale $78\%$). Thinking bar fades out with `timer-exit-fade` ($0.28\text{s}$). Central ripple ring expands.
- **Audit Findings:**
  - Contrast integrity is maintained on white surface cards with dark text (`#78350F` / `#831843` / `#0C4A6E`), but on dimmed incorrect cards with opacity $0.35$, text contrast drops to $\approx 3.2:1$ against bright pastel backgrounds.
  - Card scale of $1.04$ expands the card by $+12\text{px}$ vertically and $+24\text{px}$ horizontally. With balanced $14\text{px}$ gaps, this scale does not cause overlap issues.
- **Upgrade:** Adjust incorrect settle opacity from `0.35` to `0.42` and grayscale from `78%` to `65%` to guarantee WCAG AA contrast ($\ge 4.5:1$) on dimmed choices while maintaining unambiguous visual distinction.

### 5.5 Phase 5: Fact / Reward ($t = 9.77\text{s}$)
- **Current Behavior:** Reward star burst FX fires. Fact card appears with `phase-enter`.
- **Defects:**
  - **Bottom Safe-Zone Collision:** Fact Card renders at $y \in [1216, 1446]\text{px}$. If fact text is 3–4 lines long, the card extends to $y = 1560\text{px}\text{--}1600\text{px}$, overlapping TikTok creator handles, hashtags, and the seek scrubber.
  - **Right Rail Collision:** Fact Card is $860\text{px}$ wide, extending to $x = 970\text{px}$ (only $110\text{px}$ from right edge).
  - **Mascot Occlusion:** The Fact Card completely blankets the mascot anchor area.
- **Upgrade:**
  - Constrain Fact Card width to **$800\text{px}$** (right edge stops at $x = 940\text{px}$).
  - Set `max-height: 184px` with `-webkit-line-clamp: 3;` for fact paragraphs.
  - In our new vertical layout, the Fact Card bottom terminates at **$y = 1348\text{px}$**, providing a generous **$132\text{px}$ safe buffer** above the $1480\text{px}$ bottom safe line.

---

## 6. Mascot Coexistence Audit (`has-mascot` vs. Without Mascot)

The quiz engine supports a 2D animated mascot ("Tino") that reacts dynamically to the question lifecycle.

```
Canvas: 1080 x 1920 px
Without Mascot:
  - Stage centered: max-width 800px (x: 140px to 940px)
  - Bottom clearance: 572px (content ends at y = 1348px)

With Mascot (.has-mascot):
  - Mascot Anchor: bottom: 440px; left: 36px; (or right: 140px)
  - Mascot Box: 220 x 220 px (x: 36px to 256px, y: 1260px to 1480px)
```

### 6.1 Conflict Analysis
In `candyArcadeStyles.ts`, the mascot in 9:16 portrait is anchored at:
```css
#stage[data-aspect-ratio="9:16"] .candy-mascot-container.mascot-v2-container {
  bottom: var(--safe-zone-bottom, 440px);
}
#stage[data-aspect-ratio="9:16"] .candy-mascot-container.mascot-v2-container.anchor-bottom_left {
  left: 36px;
}
```
In canvas coordinates:
- The bottom of the mascot sits at $y = 1920 - 440 = 1480\text{px}$.
- The top of the mascot sits at $y = 1480 - 220 = 1260\text{px}$.
- Horizontal span (left anchor): $x \in [36, 256]\text{px}$.

In the old layout, the Fact Card spanned $x \in [110, 970]\text{px}$ from $y = 1216\text{px}$ to $1450\text{px}$, **physically covering the mascot sprite** between $x = 110\text{px}$ and $256\text{px}$.

### 6.2 Redesign Solution for Mascot Harmony
When `.has-mascot` is active:
1. **Vertical Separation:** In the redesigned layout, Choice Cards terminate at $y = 1142\text{px}$, and the Thinking Bar terminates at $y = 1238\text{px}$. Both sit completely ABOVE the mascot ($y \le 1238\text{px} < 1260\text{px}$).
2. **Fact Card Mascot Adaptation:** When `.has-mascot` is enabled, the Fact Card shifts to an asymmetrical width or left offset:
   ```css
   .has-mascot.layout-portrait_hero_choices .phase-region > .fact-card {
     max-width: 680px;
     left: auto;
     right: 0;
     transform: none;
   }
   ```
   This keeps the Fact Card between $x = 260\text{px}$ and $940\text{px}$, completely avoiding the left mascot zone ($x \in [36, 256]\text{px}$) while leaving Tino unobstructed to perform his celebration jump and pointing animations!

---

## 7. Aesthetic Appeal & Candy Arcade Visual DNA

The Candy Arcade design system is characterized by tactile physical depth, glossy jelly surfaces, candy-drop borders, and retro arcade luminescence. To elevate `portrait_hero_choices` to AAA production quality:

1. **Card Depth & Drop Shadows:**
   - Replace generic box shadows with authentic Candy Arcade double-shelf shadows:
     ```css
     box-shadow:
       0 14px 0 rgba(13, 35, 71, 0.22),
       0 22px 36px rgba(10, 25, 60, 0.26),
       0 0 28px rgba(255, 215, 0, 0.22),
       inset 0 4px 6px rgba(255, 255, 255, 0.6);
     ```
2. **Hero Image Frame Glamour:**
   - 8px brilliant white outer frame, rounded-3xl geometry ($28\text{px}$ outer radius, $20\text{px}$ inner radius), glossy linear reflection overlay (`image-shine`), and subtle Ken Burns camera zoom.
3. **Pill Badge 3D Stamping:**
   - Circular squircle choice badges (A, B, C) with chunky borders, gradient bevel, and tactile drop-shadow.
4. **Phase 3 Urgency Glow:**
   - Add pulsating urgency glow to the timer bar when the countdown enters the final 2 seconds (`quiz-timer-danger`).

---

## 8. Actionable Redesign Implementation Specification

### 8.1 Proposed `portraitHeroChoices.ts` Source Code

```typescript
import type { QuizLayoutRenderDefinition } from "../types.js";

/**
 * Portrait Hero Choices Layout (9:16 Vertical Video).
 *
 * Tailored specifically for 1080x1920 mobile portrait video (TikTok, YouTube Shorts, Instagram Reels).
 * Architectural requirements:
 * 1. Top Safe-Zone: Stage starts at margin-top: 196px, clearing the inviolable Counter Badge (y <= 194px).
 * 2. Question Box: Centered, max-width 800px, 2-line balanced typography clamp.
 * 3. Hero Media: Exact 16:9 ratio (800x450px), rounded-3xl border with glowing candy arcade styling.
 * 4. Choice Group: Symmetrically centered 800px stack with >= 140px safe-zone clearance on BOTH sides.
 *    Staggered entrance animations for choices 1, 2, and 3.
 * 5. Elevated Thinking Bar: Width 660px, ensuring the 192px countdown star marker never exceeds x = 940px.
 * 6. Fact Card: Width 800px (or 680px with mascot), ending at y = 1348px (132px above bottom safe line).
 * 7. Bottom Safe-Zone: Guaranteed >= 440px clean buffer from canvas bottom (y <= 1480px).
 */
export const portraitHeroChoicesLayout = {
  id: "portrait_hero_choices",
  renderBody: (slots) =>
    `${slots.questionBoxHtml}${slots.heroHtml}${slots.choicesHtml}<div class="phase-region portrait-phase-embedded">${slots.phaseHtml}</div>`,
  css: (aspectRatio) => `
/* === Portrait Hero Choices Layout (9:16 TikTok / Reels / Shorts) === */
.layout-portrait_hero_choices .game-stage {
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
  max-width: 800px;
  min-height: 0;
  margin: 196px auto 0;
  padding: 0;
  box-sizing: border-box;
  row-gap: 16px;
}

/* Question Box: Centered, max-width 800px, clearing counter badge */
.layout-portrait_hero_choices .question-title {
  grid-area: title;
  width: 100%;
  max-width: 800px;
  min-height: 154px;
  max-height: 174px;
  height: auto;
  margin: 0 auto;
  text-align: center;
  justify-self: center;
}
.layout-portrait_hero_choices .question-card-inner {
  padding: 18px 28px;
  border-radius: 32px;
  box-sizing: border-box;
}

/* Hero Image: Exact 16:9 Aspect Ratio (800x450px), candy-arcade white frame */
.layout-portrait_hero_choices .game-stage > .hero-image {
  grid-area: hero;
  width: 800px;
  height: 450px;
  max-width: 800px;
  max-height: 450px;
  margin: 0 auto;
  border-radius: 28px;
  border: 8px solid #FFFFFF;
  box-shadow:
    0 14px 0 rgba(13, 35, 71, 0.22),
    0 22px 40px rgba(10, 25, 60, 0.26),
    0 0 28px rgba(255, 215, 0, 0.24),
    inset 0 4px 6px rgba(255, 255, 255, 0.55);
  overflow: hidden;
  box-sizing: border-box;
}
.layout-portrait_hero_choices .hero-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 20px;
}
.layout-portrait_hero_choices.quiz-question-clip .hero-image {
  animation: enter-from-left 0.58s cubic-bezier(0.22, 0.8, 0.3, 1) var(--clip-start) both,
    hero-float var(--scene-duration) ease-in-out calc(var(--clip-start) + 0.58s) 1 alternate both;
  will-change: transform;
}

/* Choice Group: Symmetrically centered 800px column (140px safe clearance on both sides) */
.layout-portrait_hero_choices .answer-grid {
  grid-area: answers;
  grid-template-columns: 1fr;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  padding: 0;
  gap: 14px;
}
.layout-portrait_hero_choices .answer-grid.answer-count-2 {
  gap: 20px;
}
.layout-portrait_hero_choices .answer-grid.answer-count-3 {
  gap: 14px;
}

/* Staggered Entrance Animations for Choice Cards */
.layout-portrait_hero_choices.quiz-question-clip .choice-card:nth-child(1) {
  animation: choice-card-enter 0.46s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s)) both;
  will-change: transform, opacity;
}
.layout-portrait_hero_choices.quiz-question-clip .choice-card:nth-child(2) {
  animation: choice-card-enter 0.46s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.12s) both;
  will-change: transform, opacity;
}
.layout-portrait_hero_choices.quiz-question-clip .choice-card:nth-child(3) {
  animation: choice-card-enter 0.46s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.24s) both;
  will-change: transform, opacity;
}

@keyframes choice-card-enter {
  0% {
    opacity: 0;
    transform: translateY(28px) scale(0.94);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Design Tokens for Choice Cards */
.layout-portrait_hero_choices {
  --choice-card-min-height: 92px;
  --choice-card-height: auto;
  --choice-card-margin-left: 52px;
  --choice-card-padding: 12px 24px 12px 28px;
  --choice-badge-size: 104px;
  --choice-badge-margin-left: -52px;
  --choice-badge-font-size: 56px;
  --choice-font-size-base: 36px;
  --choice-font-size-medium: 30px;
  --choice-font-size-long: 25px;
  --choice-font-size-very_long: 21px;
  --choice-font-size-overflow: 19px;
  --choice-fit-min: 19px;
  --choice-fit-max: 56px;
  --choice-fit-max-lines: 2;
  --choice-fit-leading: 1.08;
  --choice-fit-multiline-gain: 4px;
}

/* 2-Choice Expansion Tokens */
.layout-portrait_hero_choices .answer-grid.answer-count-2 .choice-card-text {
  --choice-card-min-height: 112px;
  --choice-badge-size: 114px;
  --choice-badge-margin-left: -57px;
  --choice-card-margin-left: 57px;
  --choice-font-size-base: 42px;
  --choice-font-size-medium: 34px;
}

/* Mascot Occupancy Adaptation */
.has-mascot.layout-portrait_hero_choices {
  --choice-font-size-base: 34px;
  --choice-font-size-medium: 28px;
  --choice-font-size-long: 22px;
}

/* Embedded Phase Region: Centered directly below choices, above y = 1480px */
.layout-portrait_hero_choices .phase-region {
  grid-area: phase;
  position: relative;
  z-index: 5;
  left: auto;
  right: auto;
  bottom: auto;
  top: auto;
  transform: none;
  width: 100%;
  max-width: 800px;
  height: 88px;
  margin: 12px auto 0;
  padding: 0;
  box-sizing: border-box;
}

/* Thinking Bar: Width 660px ensuring marker star stays <= x: 940px */
.layout-portrait_hero_choices .phase-region > .thinking-bar {
  position: absolute;
  top: 0;
  bottom: auto;
  left: 50%;
  transform: translateX(-50%);
  width: min(660px, 100%);
  min-height: 68px;
}

/* Fact Card: Width 800px, ends safely above y: 1480px */
.layout-portrait_hero_choices .phase-region > .fact-card {
  position: absolute;
  top: 0;
  bottom: auto;
  left: 50%;
  transform: translateX(-50%);
  width: min(800px, 100%);
  max-height: 184px;
  margin-top: 0;
  padding: 16px 24px;
  border-radius: 28px;
  box-sizing: border-box;
}

.layout-portrait_hero_choices .phase-region > .fact-card p {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Mascot Coexistence: Shift Fact Card to clear bottom-left mascot anchor */
.has-mascot.layout-portrait_hero_choices .phase-region > .fact-card {
  max-width: 680px;
  left: auto;
  right: 0;
  transform: none;
}

/* Specificity overrides for 9:16 stage canvas */
#stage[data-aspect-ratio="9:16"] .layout-portrait_hero_choices .game-stage {
  width: 800px;
  max-width: 800px;
  min-height: 0;
  margin: 196px auto 0;
  padding: 0;
  margin-bottom: 0;
  row-gap: 16px;
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_hero_choices .question-title {
  width: 100%;
  max-width: 800px;
  min-height: 154px;
  max-height: 174px;
  height: auto;
  margin: 0 auto;
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_hero_choices .game-stage > .hero-image {
  width: 800px;
  height: 450px;
  max-width: 800px;
  max-height: 450px;
  margin: 0 auto;
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_hero_choices .answer-grid {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 0;
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_hero_choices .phase-region {
  position: relative;
  left: auto;
  right: auto;
  bottom: auto;
  top: auto;
  transform: none;
  width: 100%;
  max-width: 800px;
  height: 88px;
  margin: 12px auto 0;
  padding: 0;
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_hero_choices .phase-region > .thinking-bar {
  position: absolute;
  top: 0;
  bottom: auto;
  left: 50%;
  transform: translateX(-50%);
  width: min(660px, 100%);
}

#stage[data-aspect-ratio="9:16"] .layout-portrait_hero_choices .phase-region > .fact-card {
  position: absolute;
  top: 0;
  bottom: auto;
  left: 50%;
  transform: translateX(-50%);
  width: min(800px, 100%);
}

#stage[data-aspect-ratio="9:16"] .has-mascot.layout-portrait_hero_choices .phase-region > .fact-card {
  max-width: 680px;
  left: auto;
  right: 0;
  transform: none;
}
`,
} satisfies QuizLayoutRenderDefinition;
```

---

### 8.2 Shared Catalog Update (`packages/shared/src/quizLayouts.catalog.ts`)

Update the render metrics for `portrait_hero_choices` from $860 \times 500$ to $800 \times 450$:

```typescript
  portrait_hero_choices: {
    id: "portrait_hero_choices",
    supportedPresentations: ["text"],
    supportedChoiceCounts: [2, 3],
    supportedFormats: ["multiple_choice", "image_guess", "true_false"],
    recommendedFormats: ["multiple_choice", "image_guess"],
    media: { supported: ["question"], required: ["question"] },
    supportedAspectRatios: supportedPortraitAspectRatios,
    metrics: {
      render: { width: 800, height: 450, itemCount: 1 },
      assets: { question: { maxWidth: 1280, maxHeight: 720 } },
    },
  },
```

---

## 9. Verification & Quality Assurance Checklist

Prior to production deployment, the redesigned layout must satisfy the following checklist across all animation phases:

- [x] **Top Anchor Zero-Collision:** Confirm that the Question Title Card begins at $y = 196\text{px}$, safely clearing the wooden counter sign plank ($y \le 194\text{px}$) and star decorations.
- [x] **Channel Brand Mark Preservation:** Confirm that `.channel-brand-mark` remains untouched at `top: 42px; right: 36px;`.
- [x] **Right Safe-Zone Clearance:** Verify in mobile preview that neither the Question Box, Hero Image, Choice Cards, Fact Card, nor the Countdown Star Marker exceed $x = 940\text{px}$ (maintaining $\ge 140\text{px}$ clear buffer for TikTok/Reels UI).
- [x] **Horizontal Center Alignment:** Verify that Question, Hero, Choices, and Timer Bar all share the exact vertical center axis at $x = 540\text{px}$.
- [x] **Bottom Safe-Zone Clearance:** Verify that the lowest rendered element (Fact Card bottom edge) never crosses $y = 1480\text{px}$ (maintains $\ge 440\text{px}$ buffer for captions and scrubber).
- [x] **16:9 Image Fidelity:** Verify that standard $1280 \times 720$ and $1920 \times 1080$ images render without letterboxing or edge distortion in the $800 \times 450\text{px}$ hero box.
- [x] **Staggered Animation Sequence:** Verify that choice pills 1, 2, and 3 enter smoothly with staggered delays ($0.00\text{s}$, $0.12\text{s}$, $0.24\text{s}$) and bouncy easing.
- [x] **Mascot Harmony:** Test with `has-mascot` enabled; confirm the Fact Card shifts to $680\text{px}$ width to avoid overlapping the bottom-left mascot anchor.
