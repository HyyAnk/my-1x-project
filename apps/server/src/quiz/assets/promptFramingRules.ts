import type { QuizAssetRequirement } from "@studio/shared";

export interface FramingRulesOptions {
  layoutId?: string;
}

export function framingRules(
  aspectRatio: QuizAssetRequirement["aspect_ratio"],
  purpose: QuizAssetRequirement["purpose"],
  options?: FramingRulesOptions,
): string {
  const layoutId = options?.layoutId;

  if (layoutId === "media_left_choices_right" || (purpose === "hero_question_image" && aspectRatio === "4:3" && !layoutId?.startsWith("verdict"))) {
    return [
      "Output aspect ratio: 4:3.",
      "Create one large, clearly recognizable subject with a complete silhouette.",
      "Keep critical identifying details centered inside the safe region with comfortable breathing room, avoiding borders and edges.",
      "The image will be displayed in a landscape hero card on the left side of the quiz frame.",
      "Do not draw card borders, guidelines, measurement markings, frames, badges, answer text, letters, captions, watermarks, or interface elements.",
    ].join("\n");
  }

  if (layoutId === "visual_choices_three" || (purpose === "answer_option" && aspectRatio === "1:1")) {
    return [
      "Output aspect ratio: 1:1.",
      "Create one large, clearly recognizable subject with a complete silhouette.",
      "Keep critical identifying details centered inside the safe region with balanced breathing room on all sides.",
      "The image will be displayed in a square visual choice card with an answer label below it.",
      "Do not draw card borders, guidelines, measurement markings, frames, badges, answer text, letters, captions, watermarks, or interface elements.",
    ].join("\n");
  }

  if (layoutId === "visual_choices_three_pure" || (purpose === "answer_option" && aspectRatio === "3:4")) {
    return [
      "Output aspect ratio: 3:4.",
      "Create one large, clearly recognizable subject with a complete silhouette.",
      "Keep critical identifying details inside the safe region, keeping the focal subject in the upper and middle area with generous bottom margin.",
      "The image will be displayed in a portrait choice card with a badge overlapping its lower center.",
      "Do not draw card borders, guidelines, measurement markings, frames, badges, answer text, letters, captions, watermarks, or interface elements.",
    ].join("\n");
  }

  if (layoutId === "split_versus_two" || (purpose === "answer_option" && aspectRatio === "16:9")) {
    return [
      "Output aspect ratio: 16:9.",
      "Create one large, clearly recognizable subject with a complete silhouette.",
      "Keep critical identifying details centered inside the safe region with generous side margins and clear space along all edges.",
      "The image will be displayed in a split-versus competition card with a central VS emblem.",
      "Do not draw card borders, guidelines, measurement markings, frames, badges, answer text, letters, captions, watermarks, or interface elements.",
    ].join("\n");
  }

  if (layoutId === "verdict_true_false") {
    return [
      "Output aspect ratio: 4:3.",
      "Create one large, clearly recognizable subject with a complete silhouette.",
      "Keep critical identifying details centered inside the safe region with comfortable breathing room, avoiding borders and edges.",
      "The image will be displayed in a verdict question card on the left side of the quiz frame.",
      "Do not draw card borders, guidelines, measurement markings, frames, badges, answer text, letters, captions, watermarks, or interface elements.",
    ].join("\n");
  }

  if (layoutId === "mystery_reveal" || (purpose === "hero_question_image" && aspectRatio === "16:9")) {
    return [
      "Output aspect ratio: 16:9.",
      "Create one large, clearly recognizable subject with a complete silhouette on a clean background.",
      "Keep critical identifying details centered inside the safe region with clear breathing room from all edges.",
      "The image will be displayed in a centered mystery stage. Concealment, mosaic blurring, and reveal are runtime effects; do not generate a pre-blurred, pixelated, or mosaic image.",
      "Do not draw card borders, guidelines, measurement markings, frames, badges, answer text, letters, captions, watermarks, or interface elements.",
    ].join("\n");
  }

  if (aspectRatio === "9:16") {
    return [
      "Output aspect ratio: 9:16.",
      "Create one large, clearly recognizable subject with a complete silhouette.",
      "Keep critical identifying details centered inside the safe region with generous vertical and horizontal breathing room.",
      "Do not draw card borders, guidelines, measurement markings, frames, captions, watermarks, or interface elements.",
    ].join("\n");
  }

  return [
    `Output aspect ratio: ${aspectRatio}.`,
    "Create one large, clearly recognizable subject with a complete silhouette.",
    "Keep critical identifying details centered inside the safe region with comfortable breathing room from all edges.",
    "Do not draw card borders, guidelines, measurement markings, frames, captions, watermarks, or interface elements.",
  ].join("\n");
}

export function purposeRules(purpose: QuizAssetRequirement["purpose"]): string {
  if (purpose === "hero_question_image" || purpose === "question_illustration") {
    return "Hero question image. Keep one clear focal subject, with room around it for the quiz card and no distracting details.";
  }
  if (purpose === "answer_option") {
    return "One centered, instantly recognizable subject. Keep lighting, scale, framing, and background complexity consistent with the other answer options so the style does not reveal the answer.";
  }
  if (purpose === "answer_reveal") {
    return "Create a celebratory but controlled reveal image with one clear subject and room for a green answer frame.";
  }
  return "Clean simple composition suitable as a supporting quiz visual.";
}
