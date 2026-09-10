import { useCallback, useMemo, useRef, useState } from "react";
import { CORE_TRANSITIONS, getTransition, listTransitions, type TransitionDefinition } from "@studio/shared";

export const DEFAULT_TRANSITION_ID = "stinger_swipe";
export const DEFAULT_TRANSITION_DURATION = 0.5;
export const DEFAULT_TRANSITION_CATEGORY: "intro_outro" | "scene" = "intro_outro";
export const DEFAULT_TRANSITION_PROGRESS = 0.0;
export const DEFAULT_IS_TRANSITION_ACTIVE = false;
export const DEFAULT_IS_PLAYING = false;
export const DEFAULT_IS_LOOPING = false;
export const DEFAULT_PLAY_TRIGGER = 0;

export interface ChannelTransitionConfigInput {
  transition_type?: string;
  transition_duration_seconds?: number;
  default_intro_outro_style_id?: string | null;
  [key: string]: unknown;
}

export interface PresetTransitionConfigInput {
  transitionId?: string;
  transition_id?: string;
  transitionDuration?: number;
  transition_duration?: number;
  transition_type?: string;
  transition_duration_seconds?: number;
  [key: string]: unknown;
}

export interface UseSandboxTransitionStateOptions {
  defaultTransitionId?: string;
  defaultTransitionDuration?: number;
  defaultTransitionCategory?: "intro_outro" | "scene";
  defaultIsActive?: boolean;
}

export function useSandboxTransitionState(options?: UseSandboxTransitionStateOptions) {
  const initialId = options?.defaultTransitionId ?? DEFAULT_TRANSITION_ID;
  const initialDef = getTransition(initialId);
  const initialCategory = options?.defaultTransitionCategory ?? (initialDef?.category === "scene" ? "scene" : "intro_outro");
  const initialDuration = options?.defaultTransitionDuration ?? initialDef?.defaultDuration ?? DEFAULT_TRANSITION_DURATION;

  const [transitionId, setTransitionIdState] = useState(initialId);
  const [transitionDuration, setTransitionDurationState] = useState(initialDuration);
  const [transitionCategory, setTransitionCategoryState] = useState<"intro_outro" | "scene">(initialCategory);
  const [transitionProgress, setTransitionProgressState] = useState(DEFAULT_TRANSITION_PROGRESS);
  const [isTransitionActive, setIsTransitionActive] = useState(options?.defaultIsActive ?? DEFAULT_IS_TRANSITION_ACTIVE);
  const [isPlaying, setIsPlaying] = useState(DEFAULT_IS_PLAYING);
  const [isLooping, setIsLooping] = useState(DEFAULT_IS_LOOPING);
  const [playTrigger, setPlayTrigger] = useState(DEFAULT_PLAY_TRIGGER);

  const transitionIdRef = useRef(transitionId);
  transitionIdRef.current = transitionId;

  const transitionDurationRef = useRef(transitionDuration);
  transitionDurationRef.current = transitionDuration;

  const setTransitionId = useCallback((id: string) => {
    const currentId = transitionIdRef.current;
    const currentDuration = transitionDurationRef.current;
    transitionIdRef.current = id;
    setTransitionIdState(id);
    const def = getTransition(id);
    if (!def) return;

    if (def.category === "intro_outro" || def.category === "scene") {
      setTransitionCategoryState(def.category);
    }

    const prevDef = getTransition(currentId);
    const wasDefaultDuration = prevDef ? currentDuration === prevDef.defaultDuration : false;

    if (id === "cut") {
      transitionDurationRef.current = def.defaultDuration;
      setTransitionDurationState(def.defaultDuration);
    } else if (wasDefaultDuration || currentDuration < def.minDuration || currentDuration > def.maxDuration) {
      transitionDurationRef.current = def.defaultDuration;
      setTransitionDurationState(def.defaultDuration);
    }
  }, []);

  const setTransitionDuration = useCallback((sec: number) => {
    const currentId = transitionIdRef.current;
    const def = getTransition(currentId);
    const clamped = def ? Math.max(def.minDuration, Math.min(def.maxDuration, sec)) : Math.max(0, sec);
    const rounded = Number(clamped.toFixed(2));
    transitionDurationRef.current = rounded;
    setTransitionDurationState(rounded);
  }, []);

  const setTransitionCategory = useCallback((cat: "intro_outro" | "scene") => {
    setTransitionCategoryState(cat);
    const validList = listTransitions(cat);
    if (validList.length > 0) {
      const firstDef = validList[0];
      transitionIdRef.current = firstDef.id;
      setTransitionIdState(firstDef.id);
      transitionDurationRef.current = firstDef.defaultDuration;
      setTransitionDurationState(firstDef.defaultDuration);
    }
  }, []);

  const setTransitionProgress = useCallback((p: number) => {
    const safeVal = Number.isFinite(p) ? p : 0;
    const clamped = Math.max(0, Math.min(1, safeVal));
    setTransitionProgressState(Number(clamped.toFixed(4)));
  }, []);

  const triggerPlay = useCallback(() => {
    setPlayTrigger((prev) => prev + 1);
    setIsPlaying(true);
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const toggleLoop = useCallback(() => {
    setIsLooping((prev) => !prev);
  }, []);

  const resetTransition = useCallback(() => {
    transitionIdRef.current = DEFAULT_TRANSITION_ID;
    transitionDurationRef.current = DEFAULT_TRANSITION_DURATION;
    setTransitionIdState(DEFAULT_TRANSITION_ID);
    setTransitionDurationState(DEFAULT_TRANSITION_DURATION);
    setTransitionCategoryState(DEFAULT_TRANSITION_CATEGORY);
    setTransitionProgressState(DEFAULT_TRANSITION_PROGRESS);
    setIsTransitionActive(DEFAULT_IS_TRANSITION_ACTIVE);
    setIsPlaying(DEFAULT_IS_PLAYING);
    setIsLooping(DEFAULT_IS_LOOPING);
    setPlayTrigger(DEFAULT_PLAY_TRIGGER);
  }, []);

  const syncFromChannel = useCallback(
    (channel?: ChannelTransitionConfigInput | null) => {
      if (!channel) return;
      if (channel.transition_type && typeof channel.transition_type === "string") {
        setTransitionId(channel.transition_type);
        if (typeof channel.transition_duration_seconds === "number") {
          setTransitionDuration(channel.transition_duration_seconds);
        }
      }
    },
    [setTransitionId, setTransitionDuration],
  );

  const syncFromPreset = useCallback(
    (preset?: PresetTransitionConfigInput | null) => {
      if (!preset) return;
      const transId = preset.transitionId ?? preset.transition_id ?? preset.transition_type;
      if (transId && typeof transId === "string") {
        setTransitionId(transId);
        const duration = preset.transitionDuration ?? preset.transition_duration ?? preset.transition_duration_seconds;
        if (typeof duration === "number") {
          setTransitionDuration(duration);
        }
      }
    },
    [setTransitionId, setTransitionDuration],
  );

  const activeTransitionDefinition = useMemo(() => getTransition(transitionId), [transitionId]);
  const availableTransitions = useMemo(() => listTransitions(transitionCategory), [transitionCategory]);

  return {
    transitionId,
    transitionDuration,
    transitionCategory,
    transitionProgress,
    isTransitionActive,
    isPlaying,
    isLooping,
    playTrigger,
    setTransitionId,
    setTransitionDuration,
    setTransitionCategory,
    setTransitionProgress,
    setIsTransitionActive,
    setIsPlaying,
    setIsLooping,
    triggerPlay,
    togglePlay,
    toggleLoop,
    resetTransition,
    syncFromChannel,
    syncFromPreset,
    activeTransitionDefinition,
    availableTransitions,
    allTransitions: CORE_TRANSITIONS,
  };
}

export type SandboxTransitionState = ReturnType<typeof useSandboxTransitionState>;
