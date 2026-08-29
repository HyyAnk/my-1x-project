import { useCallback, useEffect, useMemo, useState } from "react";
import type { MascotActionType } from "@studio/shared";
import type { StageReactionStyle, StageScenarioPhase } from "../types";
import { resolveStageTimelineState, stageBackgroundTime, STAGE_TIMELINE_DURATION_SECONDS } from "../utils/stageTimeline";

export interface UseStageTimelineDirectorProps {
  showInIntro: boolean;
  showInOutro: boolean;
  showInQuestion: boolean;
}

export function useStageTimelineDirector({ showInIntro, showInOutro, showInQuestion }: UseStageTimelineDirectorProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [scrubberTime, setScrubberTime] = useState<number>(5.0);
  const [scenarioPhase, setScenarioPhase] = useState<StageScenarioPhase>("question");
  const [reactionStyle, setReactionStyle] = useState<StageReactionStyle>("celebrate");
  const [activePose, setActivePose] = useState<MascotActionType>("thinking");

  const applyTimelineTime = useCallback(
    (timeSec: number) => {
      setScrubberTime(timeSec);
      const state = resolveStageTimelineState(timeSec, reactionStyle);
      setScenarioPhase(state.phase);
      setActivePose(state.pose);
    },
    [reactionStyle],
  );

  const isMascotVisibleInCurrentPhase = useMemo(() => {
    if (scenarioPhase === "intro") {
      return Boolean(showInIntro);
    }
    if (scenarioPhase === "outro") {
      return Boolean(showInOutro);
    }
    return showInQuestion !== false;
  }, [scenarioPhase, showInIntro, showInOutro, showInQuestion]);

  const mascotPreviewTime = isPlaying ? stageBackgroundTime(scenarioPhase) : scrubberTime;

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setScrubberTime((prev) => {
        const next = prev + 0.1;
        if (next > STAGE_TIMELINE_DURATION_SECONDS) {
          applyTimelineTime(0);
          return 0;
        }
        applyTimelineTime(next);
        return next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [applyTimelineTime, isPlaying]);

  return {
    isPlaying,
    setIsPlaying,
    scrubberTime,
    setScrubberTime,
    scenarioPhase,
    setScenarioPhase,
    reactionStyle,
    setReactionStyle,
    activePose,
    setActivePose,
    applyTimelineTime,
    isMascotVisibleInCurrentPhase,
    mascotPreviewTime,
  };
}
