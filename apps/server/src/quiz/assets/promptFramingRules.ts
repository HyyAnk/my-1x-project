import type { QuizAssetRequirement } from "@studio/shared";

export function framingRules(aspectRatio: QuizAssetRequirement["aspect_ratio"], _purpose: QuizAssetRequirement["purpose"]): string {
  if (aspectRatio === "1:1") {
    return "Composition: 1:1 square canvas. Center the focal subject perfectly with balanced breathing room and safe margins on all sides to avoid edge-clipping, so it fits cleanly inside an answer card box.";
  }
  if (aspectRatio === "9:16") {
    return "Composition: 9:16 vertical portrait framing. Position the primary subject centrally with generous vertical headroom, safe margins, and no edge-clipping or horizontal cutoffs.";
  }
  if (aspectRatio === "16:9") {
    return "Composition: 16:9 widescreen landscape framing. Broad horizontal perspective with centered focal subject, balanced breathing room, and generous margins on all sides to avoid edge-clipping, suited for video background, header, or hero illustration.";
  }
  if (aspectRatio === "4:3") {
    return "Composition: 4:3 standard horizontal canvas. Center the focal subject with balanced breathing room and ample margins on all sides to avoid edge-clipping, optimized for split-column and media-left quiz containers.";
  }
  if (aspectRatio === "3:4") {
    return "Composition: 3:4 portrait card canvas. Center the focal subject vertically and horizontally with balanced top/bottom and side margins to avoid edge-clipping, tailored for card containers.";
  }
  return `Composition: ${aspectRatio} aspect ratio canvas. Center the focal subject with balanced breathing room and safe margins on all sides to avoid edge-clipping.`;
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
