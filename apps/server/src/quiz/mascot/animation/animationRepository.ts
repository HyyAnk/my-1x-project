import fs from "node:fs/promises";
import path from "node:path";
import {
  MascotPublishedAnimationAssetSchema,
  MascotProfileSchema,
  type AnimationState,
  type MascotPublishedAnimationAsset,
  type MascotAnimationAttempt,
  type MascotAnimationBatch,
  type MascotAnimationJob,
  type MascotProfile,
  type MascotStateVariant,
} from "@studio/shared";
import { writeJsonAtomic } from "../../../utils/fs.js";
import { withMascotWriteLock } from "../../../repository/mascot/mascotLock.js";
import {
  getBatchFromDisk,
  getJobFromDisk,
  listJobsByBatchFromDisk,
  listJobsByStyleFromDisk,
  recordAttemptStartInStore,
  saveBatchToDisk,
  saveJobToDisk,
  updateAttemptInStore,
} from "./animationJobStore.js";
import { getPublishedRecordFromDisk, listPublishedRecordsFromDisk, savePublishedRecordToDisk } from "./animationPublishStore.js";
import {
  AnimationRepositoryError,
  type AnimationRepository,
  type AnimationRepositoryOptions,
  type PublishedAnimationRecord,
} from "./animationRepositoryTypes.js";

export * from "./animationRepositoryTypes.js";

export class DefaultAnimationRepository implements AnimationRepository {
  private readonly storageRoot: string;

  constructor(options: AnimationRepositoryOptions) {
    this.storageRoot = path.resolve(options.storageRoot);
  }

  public async saveJob(job: MascotAnimationJob): Promise<MascotAnimationJob> {
    return saveJobToDisk(this.storageRoot, job);
  }

  public async getJob(mascotId: string, jobId: string): Promise<MascotAnimationJob | null> {
    return getJobFromDisk(this.storageRoot, mascotId, jobId);
  }

  public async listJobsByStyle(mascotId: string, styleId: string): Promise<MascotAnimationJob[]> {
    return listJobsByStyleFromDisk(this.storageRoot, mascotId, styleId);
  }

  public async listJobsByBatch(mascotId: string, batchId: string): Promise<MascotAnimationJob[]> {
    return listJobsByBatchFromDisk(this.storageRoot, mascotId, batchId);
  }

  public async recordAttemptStart(
    mascotId: string,
    jobId: string,
    fingerprint: string,
  ): Promise<{ job: MascotAnimationJob; attempt: MascotAnimationAttempt }> {
    return recordAttemptStartInStore(this.storageRoot, mascotId, jobId, fingerprint);
  }

  public async updateAttempt(
    mascotId: string,
    jobId: string,
    attemptNumber: number,
    patch: Partial<MascotAnimationAttempt>,
  ): Promise<MascotAnimationJob> {
    return updateAttemptInStore(this.storageRoot, mascotId, jobId, attemptNumber, patch);
  }

  public async saveBatch(batch: MascotAnimationBatch): Promise<MascotAnimationBatch> {
    return saveBatchToDisk(this.storageRoot, batch);
  }

  public async getBatch(mascotId: string, batchId: string): Promise<MascotAnimationBatch | null> {
    return getBatchFromDisk(this.storageRoot, mascotId, batchId);
  }

  public async savePublishedRecord(record: PublishedAnimationRecord): Promise<PublishedAnimationRecord> {
    return savePublishedRecordToDisk(this.storageRoot, record);
  }

  public async getPublishedRecord(
    mascotId: string,
    styleId: string,
    state: AnimationState,
    slotIndex: number,
    revision: number,
  ): Promise<PublishedAnimationRecord | null> {
    return getPublishedRecordFromDisk(this.storageRoot, mascotId, styleId, state, slotIndex, revision);
  }

  public async listPublishedRecords(
    mascotId: string,
    styleId: string,
    state: AnimationState,
    slotIndex: number,
  ): Promise<PublishedAnimationRecord[]> {
    return listPublishedRecordsFromDisk(this.storageRoot, mascotId, styleId, state, slotIndex);
  }

  public async getStyleSlots(
    mascotId: string,
    styleId: string,
  ): Promise<{ thinking: MascotStateVariant[]; celebrate: MascotStateVariant[] }> {
    const profile = await this.readMascotProfile(mascotId);
    const style = (profile.styles || []).find((s) => s.id === styleId);
    if (!style) {
      throw new AnimationRepositoryError(`Style ${styleId} not found in mascot ${mascotId}`, "STORAGE_ERROR");
    }

    const normalize = (variants: MascotStateVariant[] | undefined): MascotStateVariant[] => {
      const existing = variants || [];
      return Array.from({ length: 10 }, (_, i) => {
        const slotIndex = i + 1;
        const match = existing.find((s) => s.slot_index === slotIndex);
        if (match) {
          return {
            ...match,
            status: match.status || (match.animation ? "ready" : "not_started"),
            image_url: match.image_url ?? "",
          };
        }
        return {
          id: `slot_${slotIndex}`,
          slot_index: slotIndex,
          image_url: "",
          status: "not_started",
        };
      });
    };

    return {
      thinking: normalize(style.states?.thinking),
      celebrate: normalize(style.states?.celebrate),
    };
  }

  public async publishSlotAnimation(
    mascotId: string,
    styleId: string,
    state: AnimationState,
    slotIndex: number,
    asset: MascotPublishedAnimationAsset,
  ): Promise<{ variant: MascotStateVariant; record: PublishedAnimationRecord }> {
    const validatedAsset = MascotPublishedAnimationAssetSchema.parse(asset);

    return withMascotWriteLock(mascotId, async () => {
      const profile = await this.readMascotProfile(mascotId);
      const styles = profile.styles || [];
      const styleIndex = styles.findIndex((s) => s.id === styleId);
      if (styleIndex === -1) {
        throw new AnimationRepositoryError(`Style ${styleId} not found`, "STORAGE_ERROR");
      }

      const style = styles[styleIndex];
      const stateSlots = [...(style.states?.[state] || [])];
      const slotItemIndex = stateSlots.findIndex((s) => s.slot_index === slotIndex);
      const currentSlot = slotItemIndex >= 0 ? stateSlots[slotItemIndex] : undefined;

      const nextRevision = (currentSlot?.generation_revision ?? 0) + 1;
      const now = new Date().toISOString();

      const publishedAsset: MascotPublishedAnimationAsset = {
        ...validatedAsset,
        published_at: now,
      };

      const record: PublishedAnimationRecord = {
        mascot_id: mascotId,
        style_id: styleId,
        state,
        slot_index: slotIndex,
        revision: nextRevision,
        asset: publishedAsset,
        published_at: now,
      };

      // Write immutable record
      await savePublishedRecordToDisk(this.storageRoot, record);

      // Update slot in style profile while preserving provenance image_url
      const updatedSlot: MascotStateVariant = {
        id: currentSlot?.id ?? `slot_${slotIndex}`,
        slot_index: slotIndex,
        image_url: currentSlot?.image_url ?? "",
        status: "ready",
        generation_revision: nextRevision,
        animation: publishedAsset,
        created_at: currentSlot?.created_at ?? now,
      };

      if (slotItemIndex >= 0) {
        stateSlots[slotItemIndex] = updatedSlot;
      } else {
        stateSlots.push(updatedSlot);
        stateSlots.sort((a, b) => a.slot_index - b.slot_index);
      }

      const updatedStyle = {
        ...style,
        states: {
          ...style.states,
          [state]: stateSlots,
        },
        updated_at: now,
      };

      const updatedStyles = [...styles];
      updatedStyles[styleIndex] = updatedStyle;

      const updatedProfile: MascotProfile = {
        ...profile,
        styles: updatedStyles,
        updated_at: now,
      };

      await this.saveMascotProfile(updatedProfile);
      return { variant: updatedSlot, record };
    });
  }

  private async readMascotProfile(mascotId: string): Promise<MascotProfile> {
    const profilePath = path.join(this.storageRoot, "mascots", mascotId, "mascot.json");
    try {
      const raw = await fs.readFile(profilePath, "utf8");
      return MascotProfileSchema.parse(JSON.parse(raw));
    } catch (err) {
      throw new AnimationRepositoryError(`Failed to read mascot profile ${mascotId}: ${(err as Error).message}`, "STORAGE_ERROR");
    }
  }

  private async saveMascotProfile(profile: MascotProfile): Promise<void> {
    const profilePath = path.join(this.storageRoot, "mascots", profile.id, "mascot.json");
    await writeJsonAtomic(profilePath, profile);
  }
}

export function createAnimationRepository(options: AnimationRepositoryOptions): AnimationRepository {
  return new DefaultAnimationRepository(options);
}
