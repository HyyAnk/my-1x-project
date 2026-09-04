import type { MascotProfile, ThumbnailAspectRatio } from "@studio/shared";
import { QUIZ_STYLE_CONTRACTS } from "../assets/promptCompiler.js";
import type { CompiledThumbnailPrompts, QuizThumbnailPlan } from "./thumbnailTypes.js";

/**
 * Compiles clean, modern, high-CTR AI prompts for Thumbnail Generation in 16:9 and 9:16 formats.
 * Enforces a minimalist, clutter-free aesthetic without arcade glitz, heavy metal borders, or checkmark spoilers.
 */
export function compileThumbnailPrompt(
  plan: QuizThumbnailPlan,
  aspectRatio: ThumbnailAspectRatio,
  mascotProfile?: MascotProfile | null,
): string {
  const isLandscape = aspectRatio === "16:9";
  const styleContract = QUIZ_STYLE_CONTRACTS[plan.visualStyle] || QUIZ_STYLE_CONTRACTS.pixar_3d;

  // 1. Framing & Strict Anti-Clutter Directives
  const framingSection = isLandscape
    ? "Composition: 16:9 widescreen modern YouTube thumbnail format. Clean minimalist composition with generous negative space and clear visual focus. STRICT CLUTTER RESTRICTIONS: Full-bleed borderless art (STRICT NO thick outer border or framing stroke around the image perimeter). NO heavy metallic frames, NO lightning bolts, NO explosive fireworks/sparks, NO checkmark stickers (NO ✅/❌), NO casino/arcade neon overload. Keep the bottom-right corner clean with zero text (YouTube timestamp safe zone)."
    : "Composition: 9:16 vertical portrait modern YouTube Shorts cover format. Clean minimalist stacked composition. STRICT CLUTTER RESTRICTIONS: Full-bleed borderless art (STRICT NO thick outer border). NO heavy metallic frames, NO lightning bolts, NO checkmark stickers (NO ✅/❌). Center all crucial subjects, text hooks, and mascot within the middle 60% vertical safe zone. Keep the bottom 25% clear of text to avoid Shorts UI overlay obstruction.";

  // 2. Mascot Definition (Clean, Expressive, Uncluttered)
  const mascotName = mascotProfile?.name ? `named ${mascotProfile.name}` : "";
  const mascotBasePrompt =
    mascotProfile?.master_prompt || "an adorable clever fluffy robotic fox with cyan accents and big expressive sparkling eyes";
  const mascotColor = mascotProfile?.color_theme || plan.colorTheme || "#06b6d4";

  const costumeText = plan.mascotPersona.costume
    ? `wearing a stylish ${plan.mascotPersona.costume}`
    : "wearing a stylish themed costume";
  const expressionText = plan.mascotPersona.expression
    ? `Expression: ${plan.mascotPersona.expression}.`
    : "Expression: expressive, curious, and excited.";
  const poseText = plan.mascotPersona.poseDescription
    ? `Pose & Action: ${plan.mascotPersona.poseDescription}.`
    : "Pose & Action: dynamic, natural posture engaging with the quiz challenge.";
  const propText =
    plan.mascotPersona.prop &&
    !plan.mascotPersona.prop.toLowerCase().includes("none") &&
    plan.mascotPersona.prop.trim().length > 0
      ? `Thematic Prop: interacting with ${plan.mascotPersona.prop}.`
      : "";

  const mascotDescription = `Mascot character ${mascotName}: ${mascotBasePrompt} (theme color: ${mascotColor}), ${costumeText}. ${expressionText} ${poseText} ${propText} Clean bright luminous rim lighting accentuating the character silhouette against the environment. Clean composition without cluttered extra handheld items.`;

  // 3. Clean Modern Typography & Capsule Badge
  const typographySection = `Typography & Text Hierarchy:
- Top Banner: Clean, bold modern 3D sans-serif typography in matte white and soft warm gold reading '${plan.hookText}' with a crisp, subtle drop shadow for maximum legibility.
- Curiosity Badge: A sleek, compact matte rounded pill badge reading '${plan.badgeText}', positioned cleanly near the mascot.
- STRICT NO QUESTION TEXT & NO NUMBER LABELS: DO NOT write any question sentences, body text, paragraphs, or numerical option labels (STRICT NO 1, 2, 3, 4 numbers, NO Option A/B text). Objects MUST be clean standalone 3D models floating with natural contact shadows, with ZERO white box cards, ZERO frames, and ZERO checkmarks (NO ✅/❌).`;

  // 4. Environment & Lighting Setup (Minimalist, Vibrant & Family-Friendly)
  const environmentDescription =
    plan.environmentAtmosphere ||
    `Clean minimalist vibrant Pixar 3D studio background tailored to ${plan.topicTitle} with heavy soft bokeh blur, smooth warm gradient, generous negative space, and zero busy background clutter`;

  const lightingDescription =
    plan.lightingPalette ||
    "Soft warm cinematic studio lighting, bright luminous rim lighting on foreground subjects, soft contact shadows, zero visual noise";

  // 5. Layout Specific Composition (Clean & Minimalist)
  let layoutSection = "";
  switch (plan.layout) {
    case "split_vs":
      layoutSection = isLandscape
        ? `Layout: Clean horizontal side-by-side comparison in a clean minimalist environment. Left side shows clean isolated 3D artwork of ${plan.subjectAnchors[0]?.visualPrompt || "Option A"}. Right side shows clean isolated 3D artwork of ${plan.subjectAnchors[1]?.visualPrompt || "Option B"}. Centered in the middle is a sleek bold 3D 'VS' emblem with ${mascotDescription} in the foreground. Clean, spacious, floating without cards or numbers.`
        : `Layout: Clean vertical top-and-bottom comparison. Top shows clean 3D artwork of ${plan.subjectAnchors[0]?.visualPrompt || "Option A"}. Bottom shows clean 3D artwork of ${plan.subjectAnchors[1]?.visualPrompt || "Option B"}. Centered between them is a sleek 3D 'VS' badge with ${mascotDescription}.`;
      break;

    case "mystery_silhouette":
      layoutSection = isLandscape
        ? `Layout: Minimalist mystery reveal in a clean soft-focus environment. In the center, a clean dark silhouette of ${plan.subjectAnchors[0]?.visualPrompt || "a mystery subject"} with ONE single sleek glowing cyan question mark '?' (STRICT: only one question mark, NO multiple floating question marks in background). On the left side, ${mascotDescription}. Below/beside are the clean floating 3D candidate objects without any card boxes or numbers. Clean background with heavy soft bokeh.`
        : `Layout: Vertical mystery composition. Center displays a clean dark silhouette of ${plan.subjectAnchors[0]?.visualPrompt || "a mystery subject"} with ONE single glowing cyan question mark '?'. Lower safe zone features ${mascotDescription} and clean floating 3D candidate models without cards or numbers.`;
      break;

    case "odd_one_out":
      layoutSection = isLandscape
        ? `Layout: On the right side, a clean floating 3x3 matrix of matching 3D objects with one subtle odd item. On the left side, ${mascotDescription} observing with a clever curious expression. Zero distracting lines, zero card borders, zero numbers.`
        : `Layout: Center safe zone features a clean floating matrix of matching 3D objects with one odd item. Directly below, ${mascotDescription}.`;
      break;

    case "difficulty_tier":
      layoutSection = isLandscape
        ? `Layout: 4 clean vertical progression columns (Level 1 Easy to Level 4 Impossible). Beside Level 4, ${mascotDescription} with a mind-blown expression. Minimalist, sleek, and uncluttered without distracting boxes.`
        : `Layout: 4 clean stacked horizontal tier cards (Level 1 to Level 4). Placed cleanly in the lower safe area, ${mascotDescription}.`;
      break;

    case "true_false":
      layoutSection = isLandscape
        ? `Layout: Upper center showcases clean 3D artwork of ${plan.subjectAnchors[0]?.visualPrompt || "a trivia paradox visual"}. Below are two clean modern tactile buttons: green 'TRUE' and red 'FALSE'. Beside them, ${mascotDescription}. Clean spacious composition.`
        : `Layout: Upper safe zone shows clean 3D visual of ${plan.subjectAnchors[0]?.visualPrompt || "a trivia paradox visual"}. Middle displays tactile 'TRUE' and 'FALSE' buttons with ${mascotDescription}.`;
      break;

    case "mega_grid":
    default: {
      const gridItems = plan.subjectAnchors
        .map((a) => `clean 3D model of ${a.visualPrompt}`)
        .join("; ");
      layoutSection = isLandscape
        ? `Layout: On the left side, seamlessly integrated into the clean soft-focus 3D environment, ${mascotDescription}. On the right side, a clean 2x2 floating presentation of four isolated 3D objects (${gridItems}). Objects float cleanly and naturally in 3D space with soft contact shadows. STRICT: ZERO number badges (NO 1, 2, 3, 4 numbers), ZERO card boxes, ZERO white frames, ZERO borders.`
        : `Layout: In the center safe zone, a clean 2x2 floating arrangement of four isolated 3D objects (${gridItems}) with zero numbers and zero card frames. Anchoring the bottom safe zone against the cheerful soft-focus backdrop, ${mascotDescription}.`;
      break;
    }
  }

  // 6. Aesthetic Quality & Cinematic Lighting
  const aestheticSection = `Style: ${styleContract.name} (${styleContract.renderingMedium}). Quality: Pixar / Disney feature animation benchmark quality, smooth subsurface scattering on character skin/scales, clean matte materials on props. Lighting: ${lightingDescription}. Environment: ${environmentDescription}. Color palette: Rich, saturated, warm, inviting, and cheerful for family/kids audience. Clean spacious negative space, zero background clutter, zero numerical labels on objects. Ultra-clean, modern, non-cluttered YouTube thumbnail masterpiece.`;


  return [framingSection, typographySection, layoutSection, aestheticSection].join(" \n\n");
}



/**
 * Compiles both 16:9 and 9:16 thumbnail prompts simultaneously.
 */
export function compileDualThumbnailPrompts(
  plan: QuizThumbnailPlan,
  mascotProfile?: MascotProfile | null,
): CompiledThumbnailPrompts {
  return {
    plan,
    prompt_16_9: compileThumbnailPrompt(plan, "16:9", mascotProfile),
    prompt_9_16: compileThumbnailPrompt(plan, "9:16", mascotProfile),
  };
}

