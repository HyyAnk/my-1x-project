import { useMemo, useState } from "react";
import type { Scene } from "@studio/shared";

export function useEpisodeSceneFiltering(scenes: Scene[]) {
  const [selectedSequenceId, setSelectedSequenceId] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const sequences = useMemo(() => {
    const map = new Map<string, { id: string; title: string; count: number }>();
    for (const s of scenes) {
      const existing = map.get(s.sequence_id);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(s.sequence_id, { id: s.sequence_id, title: s.sequence_title || s.sequence_id, count: 1 });
      }
    }
    return Array.from(map.values());
  }, [scenes]);

  const filterCounts = useMemo(() => {
    let missingAudio = 0;
    let audioMismatch = 0;
    let hasOverlay = 0;
    let multiCut = 0;
    for (const s of scenes) {
      if (!s.audio_asset_path) missingAudio += 1;
      if (
        s.audio_duration_seconds !== null &&
        s.audio_duration_seconds !== undefined &&
        Math.abs(s.audio_duration_seconds - s.duration_seconds) > Math.max(1, s.duration_seconds * 0.15)
      ) {
        audioMismatch += 1;
      }
      if (s.editorial_overlay && s.editorial_overlay.kind !== "none") hasOverlay += 1;
      if (s.visual_prompt.trim() && s.visual_prompt.split(/^\s*(?:CUT|HARD CUT)\s*$/m).length > 1) multiCut += 1;
    }
    return { missingAudio, audioMismatch, hasOverlay, multiCut };
  }, [scenes]);

  const filteredScenes = useMemo(() => {
    return scenes.filter((scene) => {
      if (selectedSequenceId !== "all" && scene.sequence_id !== selectedSequenceId) return false;
      if (selectedStatusFilter === "missing_audio" && scene.audio_asset_path) return false;
      if (selectedStatusFilter === "audio_mismatch") {
        const isMismatch =
          scene.audio_duration_seconds !== null &&
          scene.audio_duration_seconds !== undefined &&
          Math.abs(scene.audio_duration_seconds - scene.duration_seconds) > Math.max(1, scene.duration_seconds * 0.15);
        if (!isMismatch) return false;
      }
      if (selectedStatusFilter === "has_overlay" && (!scene.editorial_overlay || scene.editorial_overlay.kind === "none")) return false;
      if (selectedStatusFilter === "multi_cut") {
        const cuts = scene.visual_prompt.trim() ? scene.visual_prompt.split(/^\s*(?:CUT|HARD CUT)\s*$/m).length : 0;
        if (cuts <= 1) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNumber = String(scene.scene_number).includes(q);
        const matchDialogue = scene.dialogue.toLowerCase().includes(q);
        const matchPrompt = scene.visual_prompt.toLowerCase().includes(q);
        const matchSeq = scene.sequence_title.toLowerCase().includes(q);
        const matchOverlay = scene.editorial_overlay?.text?.toLowerCase().includes(q);
        if (!matchNumber && !matchDialogue && !matchPrompt && !matchSeq && !matchOverlay) return false;
      }
      return true;
    });
  }, [scenes, selectedSequenceId, selectedStatusFilter, searchQuery]);

  const filteredTotalSeconds = useMemo(() => {
    return filteredScenes.reduce((sum, s) => sum + s.duration_seconds, 0);
  }, [filteredScenes]);

  return {
    selectedSequenceId,
    setSelectedSequenceId,
    selectedStatusFilter,
    setSelectedStatusFilter,
    searchQuery,
    setSearchQuery,
    sequences,
    filterCounts,
    filteredScenes,
    filteredTotalSeconds,
  };
}
