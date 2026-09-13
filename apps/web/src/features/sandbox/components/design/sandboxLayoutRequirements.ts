import { getQuizPreviewLayoutCapability, type QuizPreviewLayoutId } from "@studio/shared";
import type { SandboxImageRequirementItem } from "./SandboxImageRequirements";

export function resolveLayoutRequirements(layoutId: QuizPreviewLayoutId): SandboxImageRequirementItem[] {
  const { question, choice } = getQuizPreviewLayoutCapability(layoutId).metrics.assets;
  const items: SandboxImageRequirementItem[] = [];

  if (question) {
    items.push({
      role: "hero",
      label: "Hero Media",
      aspectRatio: question.aspectRatio ?? "16:9",
      recommended: { width: question.maxWidth, height: question.maxHeight },
      fit: "cover",
    });
  }

  if (choice) {
    items.push({
      role: "choice",
      label: "Choices",
      aspectRatio: choice.aspectRatio ?? "1:1",
      recommended: { width: choice.maxWidth, height: choice.maxHeight },
      fit: "cover",
    });
  }

  return items;
}
