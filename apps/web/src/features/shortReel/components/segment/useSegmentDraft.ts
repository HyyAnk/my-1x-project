import { useState } from "react";
import type { ReelSegment, SegmentIndex } from "@studio/shared";
import { clampDuration, clampCueTiming } from "./SegmentTimingControls";

export function useSegmentDraft(
  segments: ReelSegment[],
  onChangeSegmentDraft: (updatedSegments: ReelSegment[]) => void,
) {
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<SegmentIndex>(1);
  const activeSegment = segments.find((s) => s.index === activeSegmentIndex) || segments[0];

  const updateField = <K extends keyof ReelSegment>(field: K, value: ReelSegment[K]) => {
    if (!activeSegment) return;
    const updatedSegments = segments.map((seg) =>
      seg.index === activeSegment.index ? { ...seg, [field]: value } : seg,
    );
    onChangeSegmentDraft(updatedSegments);
  };

  const updateDuration = (raw: string) => {
    if (!activeSegment) return;
    const clampedDuration = clampDuration(raw);
    if (clampedDuration === null) return;

    const updatedSegments = segments.map((seg) => {
      if (seg.index === activeSegment.index) {
        const clampedCues = seg.text_cues.map((cue) => {
          const end_seconds = Math.min(cue.end_seconds, clampedDuration);
          const start_seconds = Math.min(cue.start_seconds, end_seconds);
          return {
            ...cue,
            start_seconds: Number(start_seconds.toFixed(2)),
            end_seconds: Number(end_seconds.toFixed(2)),
          };
        });
        return {
          ...seg,
          duration_seconds: clampedDuration,
          text_cues: clampedCues,
        };
      }
      return seg;
    });
    onChangeSegmentDraft(updatedSegments);
  };

  const updateCueText = (cueIndex: number, text: string) => {
    if (!activeSegment) return;
    const updatedCues = [...activeSegment.text_cues];
    if (updatedCues[cueIndex]) {
      updatedCues[cueIndex] = { ...updatedCues[cueIndex], text };
      updateField("text_cues", updatedCues);
    }
  };

  const updateCueTiming = (cueIndex: number, field: "start_seconds" | "end_seconds", rawVal: string) => {
    if (!activeSegment) return;
    const targetCue = activeSegment.text_cues[cueIndex];
    if (!targetCue) return;

    const clamped = clampCueTiming(field, rawVal, targetCue, activeSegment.duration_seconds);
    if (!clamped) return;

    const updatedCues = [...activeSegment.text_cues];
    updatedCues[cueIndex] = { ...targetCue, ...clamped };
    updateField("text_cues", updatedCues);
  };

  return {
    activeSegmentIndex,
    setActiveSegmentIndex,
    activeSegment,
    updateField,
    updateDuration,
    updateCueText,
    updateCueTiming,
  };
}
