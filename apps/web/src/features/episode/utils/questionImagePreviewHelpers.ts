import type { PreviewImageData } from "../types";
import type { QuestionImageItem } from "../types/questionImages.types";

/**
 * Builds an ordered list of previewable images across all questions and slots in an episode.
 */
export function buildQuestionImagePreviewList(
  items: QuestionImageItem[],
  getImageUrl: (questionNumber: number, slotId?: string) => string | null,
): PreviewImageData[] {
  const previews: PreviewImageData[] = [];

  for (const item of items) {
    const hasMultipleSlots = Array.isArray(item.slots) && item.slots.length > 1;

    if (hasMultipleSlots) {
      item.slots.forEach((slot, slotIndex) => {
        const url = getImageUrl(item.question_number, slot.slot_id) ?? slot.image_url;
        if (!url || slot.status === "missing") return;

        previews.push({
          url,
          filename: slot.filename ?? `q${item.question_number}-${slot.slot_id}.png`,
          bundleId: `Q#${item.question_number} [${slot.label}]`,
          title: slot.choice_text ? `${slot.label}: ${slot.choice_text}` : slot.label,
          subtitle: item.question_text,
          prompt: slot.prompt || item.prompt || "",
          aspectRatio: slot.aspect_ratio || item.aspect_ratio || "1:1",
          priceVnd: slot.price_vnd ?? item.price_vnd,
          model: slot.model ?? item.model,
          counter: `Choice ${slotIndex + 1} of ${item.slots.length}`,
        });
      });
    } else {
      const url = getImageUrl(item.question_number) ?? item.image_url;
      if (!url || item.status === "missing") continue;

      previews.push({
        url,
        filename: item.filename ?? `q${item.question_number}.png`,
        bundleId: `Q#${item.question_number}`,
        title: item.question_text || `Question #${item.question_number}`,
        prompt: item.prompt || "",
        aspectRatio: item.aspect_ratio || "16:9",
        priceVnd: item.price_vnd,
        model: item.model,
        counter: `Question #${item.question_number}`,
      });
    }
  }

  return previews;
}

/**
 * Finds the index of a selected image within the preview list by matching URL or bundle ID.
 */
export function findPreviewIndex(previews: PreviewImageData[], target: PreviewImageData | null): number {
  if (!target) return -1;
  return previews.findIndex((p) => p.url === target.url || p.bundleId === target.bundleId);
}
