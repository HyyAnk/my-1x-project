import type { MascotProfile, ThumbnailAspectRatio } from "@studio/shared";
import { QUIZ_STYLE_CONTRACTS } from "../assets/promptCompiler.js";
import type { CompiledThumbnailPrompts, QuizThumbnailPlan } from "./thumbnailTypes.js";

/**
 * Compiles high-CTR AI prompts for Thumbnail Generation in 16:9 and 9:16 formats.
 */
export function compileThumbnailPrompt(
  plan: QuizThumbnailPlan,
  aspectRatio: ThumbnailAspectRatio,
  mascotProfile?: MascotProfile | null,
): string {
  const isLandscape = aspectRatio === "16:9";
  const styleContract = QUIZ_STYLE_CONTRACTS[plan.visualStyle] || QUIZ_STYLE_CONTRACTS.pixar_3d;

  // 1. Framing & Safe Zone Instructions
  const framingSection = isLandscape
    ? "Composition: 16:9 widescreen YouTube thumbnail format. Horizontal layout hierarchy. Important: Keep the bottom-right corner clean with minimal details and zero text (YouTube timestamp safe zone)."
    : "Composition: 9:16 vertical portrait YouTube Shorts and TikTok cover format. Vertical stacked hierarchy. Important: Center all crucial subjects, text hooks, and mascot within the middle 60% vertical safe zone. Keep the bottom 25% clear of text to avoid Shorts UI overlay obstruction.";

  // 2. Mascot Definition & Contextual Adaptation
  const mascotName = mascotProfile?.name ? `named ${mascotProfile.name}` : "";
  const mascotBasePrompt = mascotProfile?.master_prompt || "an adorable clever fluffy robotic fox with cyan accents and big expressive sparkling eyes";
  const mascotColor = mascotProfile?.color_theme || plan.colorTheme || "#06b6d4";
  const mascotDescription = `Mascot character ${mascotName}: ${mascotBasePrompt} (theme color: ${mascotColor}), dressed in ${plan.mascotPersona.costume}, holding ${plan.mascotPersona.prop}, with an ${plan.mascotPersona.expression} facial expression, ${plan.mascotPersona.poseDescription}. Keep the character face and distinctive traits consistent with the reference character.`;

  // 3. Typography & Banner Section
  const typographySection = `Typography & Badges: Prominent top banner with bold 3D extruded text reading '${plan.hookText}' in high-contrast yellow and white with thick dark outline. Prominent rounded badge pill reading '${plan.badgeText}'.`;

  // 4. Layout Specific Composition
  let layoutSection = "";
  switch (plan.layout) {
    case "split_vs":
      layoutSection = isLandscape
        ? `Layout: Split-screen divided by a crackling golden electric lightning bolt with a fiery 3D 'VS' emblem in the center. Left half shows ${plan.subjectAnchors[0]?.visualPrompt || "Option A"}. Right half shows ${plan.subjectAnchors[1]?.visualPrompt || "Option B"}. In the foreground center, ${mascotDescription}.`
        : `Layout: Vertical split-screen with top-and-bottom contrast zones, divided by a crackling golden electric lightning bolt with a fiery 3D 'VS' emblem in the middle. Top section shows ${plan.subjectAnchors[0]?.visualPrompt || "Option A"}. Bottom section shows ${plan.subjectAnchors[1]?.visualPrompt || "Option B"}. Centered in the middle safe area, ${mascotDescription}.`;
      break;

    case "mystery_silhouette":
      layoutSection = isLandscape
        ? `Layout: Dramatic mystery reveal. In the center, ${plan.subjectAnchors[0]?.visualPrompt || "pitch-black mysterious character silhouette"} with a glowing electric-cyan question mark '?' pulsating over the face. On the right side, ${mascotDescription}.`
        : `Layout: Vertical mystery composition. Dominating the center, ${plan.subjectAnchors[0]?.visualPrompt || "pitch-black mysterious character silhouette"} with a glowing electric-cyan question mark '?'. Positioned in the lower-middle safe zone, ${mascotDescription}.`;
      break;

    case "odd_one_out":
      layoutSection = isLandscape
        ? `Layout: On the right side, ${plan.subjectAnchors[0]?.visualPrompt || "a 3x3 matrix grid of objects with one odd highlighted item"}. On the left side, ${mascotDescription}.`
        : `Layout: In the center safe zone, ${plan.subjectAnchors[0]?.visualPrompt || "a neat matrix grid of objects with one odd highlighted item"}. Positioned right below the grid, ${mascotDescription}.`;
      break;

    case "difficulty_tier":
      layoutSection = isLandscape
        ? `Layout: 4 progression tier columns from left to right: Level 1 (Green Easy), Level 2 (Yellow Medium), Level 3 (Orange Hard), Level 4 (Purple Impossible 🔥). Next to Level 4, ${mascotDescription}.`
        : `Layout: 4 stacked progression tier cards from top to bottom (Level 1 Easy to Level 4 Impossible 🔥). Placed prominently in the center-right safe zone, ${mascotDescription}.`;
      break;

    case "true_false":
      layoutSection = isLandscape
        ? `Layout: In the upper center, ${plan.subjectAnchors[0]?.visualPrompt || "a shocking trivia paradox visual"}. Flanked below by two giant 3D tactile arcade buttons: glowing green 'TRUE ✅' and glowing red 'FALSE ❌'. In the center, ${mascotDescription}.`
        : `Layout: In the upper safe zone, ${plan.subjectAnchors[0]?.visualPrompt || "a shocking trivia paradox visual"}. In the middle, two large tactile arcade buttons: 'TRUE ✅' and 'FALSE ❌'. Right beside them, ${mascotDescription}.`;
      break;

    case "mega_grid":
    default: {
      const gridItems = plan.subjectAnchors.map((a, i) => `Card ${i + 1}: ${a.visualPrompt}${a.badge ? ` with ${a.badge} badge` : ""}`).join("; ");
      layoutSection = isLandscape
        ? `Layout: On the left side with a vibrant radial sunburst backdrop, giant 3D glossy white numbers '${plan.badgeText.split(" ")[0] || "100"}' above a red badge, accompanied by ${mascotDescription}. On the right side, a clean 2x2 grid of four rounded-corner cards with subtle borders: ${gridItems}.`
        : `Layout: At the top-middle, giant 3D glossy numbers '${plan.badgeText.split(" ")[0] || "100"}' and red badge. In the center safe zone, a clean 2x2 grid of four rounded-corner cards: ${gridItems}. Anchoring the bottom-middle safe zone, ${mascotDescription}.`;
      break;
    }
  }

  // 5. Aesthetic Quality & Lighting
  const aestheticSection = `Style: ${styleContract.name} (${styleContract.renderingMedium}). Lighting: ${styleContract.lighting}. Color grading: High saturation, ultra-high contrast, vivid primary colors (cyan, crimson red, radiant gold). Sharp focus, 8k resolution, masterpiece viral YouTube thumbnail standard.`;

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
