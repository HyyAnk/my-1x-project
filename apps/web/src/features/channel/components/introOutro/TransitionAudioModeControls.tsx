import React from "react";
import { SpeakerHigh, SpeakerSlash } from "@phosphor-icons/react";

export interface TransitionAudioModeControlsProps {
  audioMode: "use_video_audio" | "overlay_bgm";
  onChangeAudioMode: (mode: "use_video_audio" | "overlay_bgm") => void;
  disabled?: boolean;
}

export const TransitionAudioModeControls: React.FC<TransitionAudioModeControlsProps> = ({
  audioMode,
  onChangeAudioMode,
  disabled = false,
}) => {
  return (
    <div className="settings-bar-group">
      <div className="settings-bar-label">Clip Audio Mode</div>
      <div className="audio-mode-chips">
        <button
          type="button"
          className={`audio-mode-chip ${audioMode === "use_video_audio" ? "is-active" : ""}`}
          onClick={() => onChangeAudioMode("use_video_audio")}
          disabled={disabled}
        >
          <SpeakerHigh size={13} weight="fill" />
          <span>Preserve Clip Audio</span>
        </button>
        <button
          type="button"
          className={`audio-mode-chip ${audioMode === "overlay_bgm" ? "is-active" : ""}`}
          onClick={() => onChangeAudioMode("overlay_bgm")}
          disabled={disabled}
        >
          <SpeakerSlash size={13} weight="fill" />
          <span>Mute Clip Audio</span>
        </button>
      </div>
    </div>
  );
};
