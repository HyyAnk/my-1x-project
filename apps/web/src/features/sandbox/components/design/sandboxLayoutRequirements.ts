import { getQuizImageSlotGeometry, recommendImageSizing, isResolvedQuizLayoutId, type QuizPreviewLayoutId } from "@studio/shared";
import type { SandboxImageRequirementItem } from "./SandboxImageRequirements";

export function resolveLayoutRequirements(layoutId: QuizPreviewLayoutId): SandboxImageRequirementItem[] {
  const items: SandboxImageRequirementItem[] = [];

  if (!isResolvedQuizLayoutId(layoutId)) {
    return items;
  }

  // 1. Hero Question Image
  const heroGeom = getQuizImageSlotGeometry({
    layoutId,
    purpose: "hero_question_image",
    presentation: "text",
    choiceCount: layoutId === "mystery_reveal" ? 1 : 3,
    canvasAspectRatio: "16:9",
  });

  if (heroGeom) {
    const rec = recommendImageSizing(heroGeom);
    if (rec.ok) {
      items.push({
        role: "hero",
        label: layoutId === "mystery_reveal" ? "Mystery Subject" : "Hero Media",
        aspectRatio: rec.value.aspectRatio,
        recommended: rec.value.recommended,
        fit: heroGeom.viewports[0]?.fit ?? "cover",
      });
    }
  }

  // 2. Choice Option Images
  const choiceGeom = getQuizImageSlotGeometry({
    layoutId,
    purpose: "answer_option",
    presentation: "visual",
    choiceCount: layoutId === "split_versus_two" ? 2 : 3,
    canvasAspectRatio: "16:9",
  });

  if (choiceGeom) {
    const rec = recommendImageSizing(choiceGeom);
    if (rec.ok) {
      items.push({
        role: "choice",
        label: "Choices",
        aspectRatio: rec.value.aspectRatio,
        recommended: rec.value.recommended,
        fit: choiceGeom.viewports[0]?.fit ?? "cover",
      });
    }
  }

  return items;
}
