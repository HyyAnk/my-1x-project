import { TOTAL_ANIMATION_SLOTS, type MascotProfile } from "@studio/shared";
import {
  applyStyleRolloutPublish,
  evaluateStyleVideoReadiness,
  type AllStylesRolloutReport,
  type PublishStyleVideoAnimationsResult,
  type StyleBatchRolloutReport,
  type StyleVideoReadinessResult,
  type VideoRolloutService,
  type VideoRolloutServiceDeps,
} from "./rollout/index.js";

export * from "./rollout/index.js";

/**
 * Creates VideoRolloutService coordinating slot readiness checks, rollout reports,
 * and publishing active animation revisions to mascot styles.
 */
export function createVideoRolloutService(deps: VideoRolloutServiceDeps): VideoRolloutService {
  const { videoProcessingRepository: repo } = deps;

  async function getStyleReadiness(mascotId: string, styleId: string): Promise<StyleVideoReadinessResult> {
    const projections = await repo.listSlotProjections(mascotId, styleId);
    return evaluateStyleVideoReadiness(projections);
  }

  async function getStyleRolloutReport(mascotId: string, styleId: string): Promise<StyleBatchRolloutReport> {
    const projections = await repo.listSlotProjections(mascotId, styleId);
    const readiness = evaluateStyleVideoReadiness(projections);

    const processingCount = projections.filter(
      (p) => p.status === "uploading" || p.status === "processing" || p.status === "retrying" || p.status === "replacing",
    ).length;

    return {
      mascotId,
      styleId,
      totalSlots: TOTAL_ANIMATION_SLOTS,
      readySlots: readiness.readyCount,
      failedSlots: readiness.failedCount,
      emptySlots: readiness.emptyCount,
      processingSlots: processingCount,
      slots: projections,
      isPublishEligible: readiness.eligible,
      published: false,
    };
  }

  async function getAllStylesRolloutReport(mascot: MascotProfile): Promise<AllStylesRolloutReport> {
    const styles = mascot.styles || [];
    const styleReports: Record<string, StyleBatchRolloutReport> = {};
    let completedCount = 0;

    for (const style of styles) {
      const report = await getStyleRolloutReport(mascot.id, style.id);
      styleReports[style.id] = report;
      if (report.isPublishEligible) {
        completedCount += 1;
      }
    }

    const allEligible = styles.length > 0 && completedCount === styles.length;

    return {
      mascotId: mascot.id,
      totalStyles: styles.length,
      completedStyles: completedCount,
      styleReports,
      allEligible,
      allPublished: false,
    };
  }

  async function publishStyleVideoAnimations(mascot: MascotProfile, styleId: string): Promise<PublishStyleVideoAnimationsResult> {
    return applyStyleRolloutPublish(deps, mascot, styleId);
  }

  return {
    getStyleReadiness,
    getStyleRolloutReport,
    getAllStylesRolloutReport,
    publishStyleVideoAnimations,
  };
}
