import { Pause, Play } from "@phosphor-icons/react";
import type { useStageStudio } from "../hooks/useStageStudio";

type StageTimelineBarProps = {
  studio: ReturnType<typeof useStageStudio>;
};

export function StageTimelineBar({ studio }: StageTimelineBarProps) {
  const { t, isPlaying, setIsPlaying, scrubberTime, scenarioPhase, reactionStyle, setReactionStyle, applyTimelineTime, setActivePose } =
    studio;

  const PHASES = [
    { id: "intro", label: t("stageStudio.phases.intro"), time: 1.0 },
    { id: "question", label: t("stageStudio.phases.question"), time: 3.5 },
    { id: "thinking", label: t("stageStudio.phases.thinking"), time: 6.0 },
    { id: "reveal", label: t("stageStudio.phases.reveal"), time: 10.5 },
    { id: "outro", label: t("stageStudio.phases.outro"), time: 14.0 },
  ];

  return (
    <div className="stage-timeline-bar">
      {/* Top Row: Play button, Phase selector, Reactions, Timecode */}
      <div className="stage-timeline-header-row">
        {/* Left: Play/Pause & Phase Buttons */}
        <div className="stage-timeline-actions-left">
          <button
            type="button"
            className={`stage-timeline-play-btn ${isPlaying ? "is-playing" : ""}`}
            onClick={() => setIsPlaying((p) => !p)}
            title={isPlaying ? t("stageStudio.pauseTooltip") : t("stageStudio.playTooltip")}
          >
            {isPlaying ? <Pause size={13} weight="fill" /> : <Play size={13} weight="fill" />}
            <span>{isPlaying ? t("stageStudio.pause") : t("stageStudio.play")}</span>
          </button>

          <div className="stage-phase-pills-row">
            {PHASES.map((p) => {
              const isActive =
                p.id === scenarioPhase ||
                (p.id === "question" && scenarioPhase === "question") ||
                (p.id === "thinking" && scenarioPhase === "thinking");

              return (
                <button
                  key={p.id}
                  type="button"
                  className={`stage-phase-pill-btn ${isActive ? "is-active" : ""}`}
                  onClick={() => applyTimelineTime(p.time)}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Reaction & Timecode */}
        <div className="stage-timeline-actions-right">
          {/* Reaction Toggle */}
          <div className="stage-reaction-pill-group">
            <button
              type="button"
              className={`stage-rx-btn ${reactionStyle === "celebrate" ? "is-active is-celebrate" : ""}`}
              onClick={() => {
                setReactionStyle("celebrate");
                if (scenarioPhase === "reveal") setActivePose("celebrate");
              }}
              title={t("stageStudio.correctReactionTooltip")}
            >
              <span>{t("stageStudio.correctReaction")}</span>
            </button>
            <button
              type="button"
              className={`stage-rx-btn ${reactionStyle === "oops" ? "is-active is-oops" : ""}`}
              onClick={() => {
                setReactionStyle("oops");
                if (scenarioPhase === "reveal") setActivePose("oops");
              }}
              title={t("stageStudio.oopsReactionTooltip")}
            >
              <span>{t("stageStudio.oopsReaction")}</span>
            </button>
          </div>

          {/* Timecode Badge */}
          <div className="stage-timecode-pill">
            <span className="current-time">{scrubberTime.toFixed(1)}s</span>
            <span className="total-time">/ 16.0s</span>
          </div>
        </div>
      </div>

      {/* Bottom Row: Scrubber Range Slider */}
      <div className="stage-timeline-slider-row">
        <input
          type="range"
          min={0}
          max={16}
          step={0.1}
          value={scrubberTime}
          className="stage-timeline-scrubber"
          onChange={(e) => applyTimelineTime(Number(e.target.value))}
        />
      </div>
    </div>
  );
}
