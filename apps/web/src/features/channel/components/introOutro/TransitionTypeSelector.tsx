import React, { useMemo } from "react";
import { getTransition, type IntroOutroTransitionType, type TransitionCategory, type TransitionDefinition } from "@studio/shared";
import { TransitionAudioModeControls } from "./TransitionAudioModeControls";
import { TransitionDropdown } from "./TransitionDropdown";
import { TransitionDurationControls } from "./TransitionDurationControls";

export interface TransitionTypeSelectorProps<T extends string = IntroOutroTransitionType> {
  transitionType: T;
  onChangeTransition: (type: T) => void;
  durationSeconds: number;
  onChangeDuration: (duration: number) => void;
  audioMode: "use_video_audio" | "overlay_bgm";
  onChangeAudioMode: (mode: "use_video_audio" | "overlay_bgm") => void;
  disabled?: boolean;
  onPreview?: (transitionId: string) => void;
  category?: TransitionCategory;
}

export function TransitionTypeSelector<T extends string = IntroOutroTransitionType>({
  transitionType,
  onChangeTransition,
  durationSeconds,
  onChangeDuration,
  audioMode,
  onChangeAudioMode,
  disabled = false,
  onPreview,
  category = "intro_outro",
}: TransitionTypeSelectorProps<T>) {
  const currentDef = useMemo(() => {
    return getTransition(transitionType);
  }, [transitionType]);

  const handleTransitionChange = (newId: string, def?: TransitionDefinition) => {
    const targetDef = def ?? getTransition(newId);

    if (newId === "cut" || (targetDef && targetDef.maxDuration === 0)) {
      onChangeDuration(0.0);
    } else if (targetDef) {
      if (durationSeconds < targetDef.minDuration || durationSeconds > targetDef.maxDuration || durationSeconds === 0) {
        onChangeDuration(targetDef.defaultDuration);
      }
    }

    onChangeTransition(newId as T);
  };

  return (
    <div className="transition-selector-section">
      <div className="transition-selector-label">
        <span>Transition into Question 1</span>
      </div>

      {/* Scalable Dynamic Transition Dropdown */}
      <TransitionDropdown
        value={transitionType}
        onChange={handleTransitionChange}
        category={category}
        disabled={disabled}
        onPreview={onPreview}
        label="Transition into Question 1"
      />

      {/* Duration and Audio Settings Bar */}
      <div className="transition-settings-bar">
        <TransitionDurationControls
          durationSeconds={durationSeconds}
          onChangeDuration={onChangeDuration}
          disabled={disabled}
          transitionDef={currentDef}
        />

        <TransitionAudioModeControls audioMode={audioMode} onChangeAudioMode={onChangeAudioMode} disabled={disabled} />
      </div>
    </div>
  );
}
