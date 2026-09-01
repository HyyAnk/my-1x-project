import { Pause, Play, SpeakerHigh, SpeakerSlash } from "@phosphor-icons/react";
import { computeSandboxPhaseTimeline, getSandboxPhaseAtTime, getSandboxPhaseTimestamps } from "@studio/shared";
import { useTranslation } from "../../../../i18n";

export type SandboxTimelineControlsProps = {
  phase: string;
  useScrubber: boolean;
  timelineSeconds: number;
  handlePhaseChange: (phase: "question" | "choices" | "thinking" | "reveal" | "explain") => void;
  isPlaying: boolean;
  setIsPlaying: (updater: (prev: boolean) => boolean) => void;
  handleTogglePlay?: () => void;
  setUseScrubber: (use: boolean) => void;
  handleScrubberChange: (value: number) => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
  totalDuration?: number;
};

export function SandboxTimelineControls({
  phase,
  useScrubber,
  timelineSeconds,
  handlePhaseChange,
  isPlaying,
  setIsPlaying,
  handleTogglePlay,
  setUseScrubber,
  handleScrubberChange,
  isMuted = false,
  onToggleMute,
  totalDuration: customTotalDuration,
}: SandboxTimelineControlsProps) {
  const { t } = useTranslation();
  const timeline = computeSandboxPhaseTimeline();
  const totalDuration = customTotalDuration ?? timeline.totalDuration;
  const timestamps = getSandboxPhaseTimestamps();
  const currentScrubberPhase = getSandboxPhaseAtTime(timelineSeconds);

  const onPlayButtonClick = () => {
    setUseScrubber(true);
    if (handleTogglePlay) {
      handleTogglePlay();
    } else {
      setIsPlaying((p) => !p);
    }
  };

  return (
    <div
      className="panel"
      style={{
        padding: "10px 16px",
        borderRadius: "14px",
        background: "var(--surface)",
        border: "1px solid var(--line)",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        flexShrink: 0,
      }}
    >
      {/* Top row of Timeline: Phase buttons + Play/Scrub + Mute Toggle */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginRight: "2px" }}>
            {t("visualSandbox.phaseLabel")}
          </span>
          {(
            [
              { id: "question", label: t("visualSandbox.phaseQuestion") },
              { id: "choices", label: t("visualSandbox.phaseChoices") },
              { id: "thinking", label: t("visualSandbox.phaseThinking") },
              { id: "reveal", label: t("visualSandbox.phaseReveal") },
              { id: "explain", label: t("visualSandbox.phaseExplain") },
            ] as const
          ).map((p) => {
            const isActive = !useScrubber && phase === p.id;
            return (
              <button
                key={p.id}
                type="button"
                className={isActive ? "primary-button compact" : "quiet-button compact"}
                style={{
                  fontSize: "11px",
                  padding: "4px 10px",
                  borderRadius: "8px",
                  fontWeight: isActive ? 700 : 500,
                }}
                onClick={() => handlePhaseChange(p.id)}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Play / Pause Toggle, Mute Button & Live Timecode */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {onToggleMute && (
            <button
              type="button"
              className={isMuted ? "quiet-button compact" : "primary-button compact"}
              style={{
                padding: "5px 8px",
                borderRadius: "8px",
                display: "inline-flex",
                alignItems: "center",
                fontSize: "12px",
              }}
              onClick={onToggleMute}
              title={isMuted ? "Unmute rehearsal SFX" : "Mute rehearsal SFX"}
            >
              {isMuted ? <SpeakerSlash size={14} weight="bold" /> : <SpeakerHigh size={14} weight="fill" />}
            </button>
          )}

          <button
            type="button"
            className={isPlaying ? "primary-button compact" : "quiet-button compact"}
            style={{
              padding: "4px 12px",
              borderRadius: "8px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "11.5px",
              fontWeight: 600,
            }}
            onClick={onPlayButtonClick}
          >
            {isPlaying ? <Pause size={13} weight="fill" /> : <Play size={13} weight="fill" />}
            <span>{isPlaying ? t("visualSandbox.pauseBtn") : t("visualSandbox.playRehearsal")}</span>
          </button>

          <span
            style={{
              fontFamily: "monospace",
              fontSize: "12px",
              fontWeight: 700,
              color: isPlaying ? "var(--notice-good)" : "var(--ink)",
              background: "var(--surface-strong)",
              padding: "3px 8px",
              borderRadius: "6px",
              border: "1px solid var(--line)",
            }}
          >
            {timelineSeconds.toFixed(1)}s / {totalDuration.toFixed(1)}s
          </span>
        </div>
      </div>

      {/* Bottom row: Interactive Time Scrubber Slider with Phase Markers */}
      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
        <div style={{ position: "relative", width: "100%", display: "flex", alignItems: "center" }}>
          <input
            type="range"
            min="0"
            max={totalDuration}
            step="0.05"
            value={timelineSeconds}
            onChange={(e) => handleScrubberChange(parseFloat(e.target.value))}
            style={{
              width: "100%",
              accentColor: "#38BDF8",
              cursor: "pointer",
              height: "6px",
              borderRadius: "4px",
            }}
          />
        </div>

        {/* Phase timestamp badges beneath the scrubber */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "9.5px",
            color: "var(--muted)",
            fontWeight: 600,
            padding: "0 2px",
          }}
        >
          {timestamps.map((marker) => {
            const isMarkerActive = currentScrubberPhase === marker.id;
            const labels: Record<string, string> = {
              question: "Ques",
              choices: "Choices",
              thinking: "Timer",
              reveal: "Reveal",
              explain: "Explain",
            };
            const label = labels[marker.id] || marker.id;
            return (
              <span
                key={marker.id}
                style={{
                  cursor: "pointer",
                  color: isMarkerActive ? "#38BDF8" : undefined,
                  fontWeight: isMarkerActive ? 800 : undefined,
                }}
                onClick={() => handleScrubberChange(marker.time)}
                title={`Jump to ${marker.id} (${marker.time.toFixed(1)}s)`}
              >
                {label} ({marker.time.toFixed(1)}s)
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
