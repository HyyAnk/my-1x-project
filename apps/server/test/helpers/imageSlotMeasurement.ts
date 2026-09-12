import type { Page } from "@playwright/test";

export interface MeasuredImageSlot {
  layoutId: string;
  role: "hero_question_image" | "answer_option";
  layerIdentity: string;
  imageViewport: { width: number; height: number };
  mediaBorderBox: { width: number; height: number };
  computedObjectFit: "cover" | "contain" | string;
  sourceNaturalDimensions: { width: number; height: number };
  currentPlannedRatio: string | null;
}

export interface MeasureLayoutSlotsOptions {
  layoutId: string;
  presentation?: "visual" | "text";
  currentPlannedChoiceRatio?: string | null;
  currentPlannedHeroRatio?: string | null;
}

/**
 * Evaluates live DOM image slots in headless Playwright.
 * Extracts image-element content dimensions, media border box, computed objectFit,
 * and source natural dimensions without depending on production modules.
 */
export async function measureLayoutImageSlots(
  page: Page,
  options: MeasureLayoutSlotsOptions,
): Promise<MeasuredImageSlot[]> {
  const { layoutId, currentPlannedChoiceRatio = null, currentPlannedHeroRatio = null } = options;

  const rawSlots = await page.evaluate((args) => {
    const { layoutId } = args;
    const slots: Array<{
      role: "hero_question_image" | "answer_option";
      layerIdentity: string;
      imageViewport: { width: number; height: number };
      mediaBorderBox: { width: number; height: number };
      computedObjectFit: string;
      sourceNaturalDimensions: { width: number; height: number };
    }> = [];

    function measureImg(
      img: HTMLImageElement,
      container: HTMLElement | null,
      role: "hero_question_image" | "answer_option",
      layerIdentity: string,
    ) {
      const imgRect = img.getBoundingClientRect();
      const imgStyle = window.getComputedStyle(img);
      const imgPaddingX = (parseFloat(imgStyle.paddingLeft) || 0) + (parseFloat(imgStyle.paddingRight) || 0);
      const imgPaddingY = (parseFloat(imgStyle.paddingTop) || 0) + (parseFloat(imgStyle.paddingBottom) || 0);
      const imgBorderX = (parseFloat(imgStyle.borderLeftWidth) || 0) + (parseFloat(imgStyle.borderRightWidth) || 0);
      const imgBorderY = (parseFloat(imgStyle.borderTopWidth) || 0) + (parseFloat(imgStyle.borderBottomWidth) || 0);

      const contentWidth = Math.round((imgRect.width - imgPaddingX - imgBorderX) * 100) / 100;
      const contentHeight = Math.round((imgRect.height - imgPaddingY - imgBorderY) * 100) / 100;

      let borderBoxWidth = contentWidth;
      let borderBoxHeight = contentHeight;

      if (container) {
        const cRect = container.getBoundingClientRect();
        borderBoxWidth = Math.round(cRect.width * 100) / 100;
        borderBoxHeight = Math.round(cRect.height * 100) / 100;
      }

      slots.push({
        role,
        layerIdentity,
        imageViewport: {
          width: contentWidth,
          height: contentHeight,
        },
        mediaBorderBox: {
          width: borderBoxWidth,
          height: borderBoxHeight,
        },
        computedObjectFit: imgStyle.objectFit || "cover",
        sourceNaturalDimensions: {
          width: img.naturalWidth || 0,
          height: img.naturalHeight || 0,
        },
      });
    }

    // 1. Hero Slots
    if (layoutId === "mystery_reveal") {
      const mosaicImg = document.querySelector<HTMLImageElement>(".mystery-mosaic-layer img");
      const mosaicContainer = document.querySelector<HTMLElement>(".mystery-mosaic-layer .hero-image");
      if (mosaicImg) {
        measureImg(mosaicImg, mosaicContainer, "hero_question_image", "mystery_mosaic");
      }

      const revealedImg = document.querySelector<HTMLImageElement>(".mystery-revealed-layer img");
      const revealedContainer = document.querySelector<HTMLElement>(".mystery-revealed-layer .hero-image");
      if (revealedImg) {
        measureImg(revealedImg, revealedContainer, "hero_question_image", "mystery_revealed");
      }
    } else if (layoutId === "clue_deduction") {
      const clueImg = document.querySelector<HTMLImageElement>(".clue-hero-frame > .hero-image img");
      const clueContainer = document.querySelector<HTMLElement>(".clue-hero-frame > .hero-image");
      if (clueImg) {
        measureImg(clueImg, clueContainer, "hero_question_image", "clue_hero");
      }
    } else if (layoutId === "media_left_choices_right" || layoutId === "verdict_true_false") {
      const heroImg = document.querySelector<HTMLImageElement>(".hero-image img");
      const heroContainer = document.querySelector<HTMLElement>(".hero-image");
      if (heroImg) {
        measureImg(heroImg, heroContainer, "hero_question_image", "hero");
      }
    }

    // 2. Choice Cards Slots
    const choiceCards = Array.from(document.querySelectorAll<HTMLElement>(".choice-card, .visual-answer-card"));
    choiceCards.forEach((card, index) => {
      const mediaContainer = card.querySelector<HTMLElement>(".choice-media, .option-image, .image-card");
      const img = mediaContainer?.querySelector<HTMLImageElement>("img") ?? null;
      if (img && mediaContainer) {
        measureImg(img, mediaContainer, "answer_option", `choice_${index + 1}`);
      }
    });

    return slots;
  }, { layoutId });

  return rawSlots.map((slot) => ({
    layoutId,
    role: slot.role,
    layerIdentity: slot.layerIdentity,
    imageViewport: slot.imageViewport,
    mediaBorderBox: slot.mediaBorderBox,
    computedObjectFit: slot.computedObjectFit,
    sourceNaturalDimensions: slot.sourceNaturalDimensions,
    currentPlannedRatio:
      slot.role === "hero_question_image" ? currentPlannedHeroRatio : currentPlannedChoiceRatio,
  }));
}
