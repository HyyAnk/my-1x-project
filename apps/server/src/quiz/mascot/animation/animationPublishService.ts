import { isStyleAnimationPublishEligible, type AnimationState, type MascotStateVariant } from "@studio/shared";
import type { AnimationRepository, PublishedAnimationRecord } from "./animationRepositoryTypes.js";

export class PublishGateError extends Error {
  public readonly code: string = "PUBLISH_GATE_REJECTED";
  public readonly readyCount: number;
  public readonly totalRequired: number;
  public readonly missingSlots: { state: AnimationState; slot_index: number }[];

  constructor(
    message: string,
    details: {
      readyCount: number;
      totalRequired: number;
      missingSlots: { state: AnimationState; slot_index: number }[];
    },
  ) {
    super(message);
    this.name = "PublishGateError";
    this.readyCount = details.readyCount;
    this.totalRequired = details.totalRequired;
    this.missingSlots = details.missingSlots;
  }
}

export interface PublishStyleResult {
  ok: true;
  mascotId: string;
  styleId: string;
  publishedAt: string;
  publishedSlotsCount: number;
  thinking: MascotStateVariant[];
  celebrate: MascotStateVariant[];
  records: PublishedAnimationRecord[];
}

export interface AnimationPublishServiceOptions {
  repository: AnimationRepository;
}

export class AnimationPublishService {
  private readonly repository: AnimationRepository;

  constructor(options: AnimationPublishServiceOptions) {
    this.repository = options.repository;
  }

  public async publishStyleAnimations(mascotId: string, styleId: string): Promise<PublishStyleResult> {
    const slots = await this.repository.getStyleSlots(mascotId, styleId);
    const eligibility = isStyleAnimationPublishEligible(slots.thinking, slots.celebrate);

    if (!eligibility.eligible) {
      const missingDetails = eligibility.missingSlots.map((s) => `${s.state}[${s.slot_index}]`).join(", ");
      throw new PublishGateError(
        `Publish gate rejected: only ${eligibility.readyCount} of ${eligibility.totalRequired} slots are ready. Missing slots: ${missingDetails}`,
        eligibility,
      );
    }

    const records: PublishedAnimationRecord[] = [];
    const publishedThinking: MascotStateVariant[] = [];
    const publishedCelebrate: MascotStateVariant[] = [];

    // Publish all 10 thinking slots
    for (const slot of slots.thinking) {
      const result = await this.repository.publishSlotAnimation(mascotId, styleId, "thinking", slot.slot_index, slot.animation!);
      records.push(result.record);
      publishedThinking.push(result.variant);
    }

    // Publish all 10 celebrate slots
    for (const slot of slots.celebrate) {
      const result = await this.repository.publishSlotAnimation(mascotId, styleId, "celebrate", slot.slot_index, slot.animation!);
      records.push(result.record);
      publishedCelebrate.push(result.variant);
    }

    const publishedAt = records[0]?.published_at || new Date().toISOString();

    return {
      ok: true,
      mascotId,
      styleId,
      publishedAt,
      publishedSlotsCount: records.length,
      thinking: publishedThinking,
      celebrate: publishedCelebrate,
      records,
    };
  }
}

export function createAnimationPublishService(options: AnimationPublishServiceOptions): AnimationPublishService {
  return new AnimationPublishService(options);
}
