import { useEffect, useMemo, useState } from "react";
import {
  MASCOT_RECOMMENDED_PLACEMENT,
  type AnimationState,
  type MascotPublishedAnimationAsset,
  type MascotAnimationRevision,
  type MascotPlacementV2,
  type MascotSlotProjection,
} from "@studio/shared";
import { mascotAnimationApi } from "../services/mascotAnimationApi";
import { useManifestFramePlayback } from "./useManifestFramePlayback";

export interface UseStep4AnimationPreviewOptions {
  mascotId?: string | null;
  styleId?: string | null;
  initialState?: AnimationState;
  initialSlotIndex?: number;
}

export function createAnimationAssetFromRevision(revision: MascotAnimationRevision): MascotPublishedAnimationAsset {
  const frameCount = revision.frame_count ?? 12;
  const fps = revision.playback_fps ?? 8;
  const frameDurationMs = Math.round(1000 / fps);
  const durationMs = revision.duration_ms ?? Math.round((frameCount / fps) * 1000);

  const cols = 4;
  const cellWidth = revision.registration.source_width || 200;
  const cellHeight = revision.registration.source_height || 150;

  const frames = Array.from({ length: frameCount }, (_, i) => ({
    index: i,
    x: (i % cols) * cellWidth,
    y: Math.floor(i / cols) * cellHeight,
    width: cellWidth,
    height: cellHeight,
    duration_ms: frameDurationMs,
  }));

  return {
    version: 1,
    state: revision.state,
    atlas_url: revision.atlas_url,
    manifest_url: revision.manifest_url,
    frame_count: frameCount,
    fps: fps,
    duration_ms: durationMs,
    loop: revision.loop_mode === "loop" || revision.state === "thinking",
    loop_policy: revision.loop_mode,
    frames,
    registration: revision.registration,
    content_fingerprint: revision.processing_fingerprint,
    source_fingerprint: revision.source_fingerprint,
    qa_report_url: revision.qa_report_url,
    slot_index: revision.slot_index,
    recipe_id: `${revision.style_id}_${revision.state}_${revision.slot_index}`,
    ...(revision.transparent_video_url ? { transparent_video_url: revision.transparent_video_url } : {}),
    ...(revision.alpha_codec ? { alpha_codec: revision.alpha_codec } : {}),
  };
}

export function useStep4AnimationPreview(options: UseStep4AnimationPreviewOptions) {
  const { mascotId, styleId = "core" } = options;

  const [activeState, setActiveState] = useState<AnimationState>(options.initialState ?? "thinking");
  const [activeSlotIndex, setActiveSlotIndex] = useState<number>(options.initialSlotIndex ?? 1);
  const [slotsData, setSlotsData] = useState<{
    thinking: MascotSlotProjection[];
    celebrate: MascotSlotProjection[];
  }>({
    thinking: [],
    celebrate: [],
  });
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [previewMode, setPreviewMode] = useState<"canvas" | "stage">("canvas");
  const [placement, setPlacement] = useState<MascotPlacementV2>({ ...MASCOT_RECOMMENDED_PLACEMENT });
  const [showGuides, setShowGuides] = useState(false);
  const [showContactSheet, setShowContactSheet] = useState(false);

  // Load slot projections for active mascot and style
  useEffect(() => {
    if (!mascotId || !styleId) return;

    let isMounted = true;
    setIsLoadingSlots(true);

    mascotAnimationApi
      .getStyleAnimationSlots(mascotId, styleId)
      .then((res) => {
        if (isMounted && res.ok && res.slots) {
          setSlotsData(res.slots);
        }
      })
      .catch(() => {
        // Handled silently; slots remain empty
      })
      .finally(() => {
        if (isMounted) setIsLoadingSlots(false);
      });

    return () => {
      isMounted = false;
    };
  }, [mascotId, styleId]);

  const activeSlot = useMemo<MascotSlotProjection | undefined>(() => {
    const list = activeState === "thinking" ? slotsData.thinking : slotsData.celebrate;
    return list.find((s) => s.slot_index === activeSlotIndex);
  }, [activeState, activeSlotIndex, slotsData]);

  const activeAnimationAsset = useMemo<MascotPublishedAnimationAsset | null>(() => {
    if (!activeSlot?.active_revision) return null;
    return createAnimationAssetFromRevision(activeSlot.active_revision);
  }, [activeSlot]);

  const readyCount = useMemo(() => {
    const thinkingReady = slotsData.thinking.filter((s) => s.status === "ready").length;
    const celebrateReady = slotsData.celebrate.filter((s) => s.status === "ready").length;
    return thinkingReady + celebrateReady;
  }, [slotsData]);

  const playback = useManifestFramePlayback({
    animation: activeAnimationAsset,
  });

  return {
    activeState,
    setActiveState,
    activeSlotIndex,
    setActiveSlotIndex,
    slotsData,
    isLoadingSlots,
    activeSlot,
    activeAnimationAsset,
    readyCount,
    previewMode,
    setPreviewMode,
    placement,
    setPlacement,
    showGuides,
    setShowGuides,
    showContactSheet,
    setShowContactSheet,
    playback,
  };
}
