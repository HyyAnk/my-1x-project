/**
 * Type definitions for the Transition Preview Player feature.
 */

export type TransitionAspectRatio = "16:9" | "9:16";

export interface TransitionThemeColors {
  from?: string;
  to?: string;
}

export interface TransitionPreviewPlayerProps {
  /** Transition identifier (e.g. "stinger_swipe", "crossfade", "cut", "bubble_splash") */
  transitionType: string;
  /** Duration of the transition in seconds */
  durationSeconds: number;
  /** Aspect ratio of the preview viewport. Default: "16:9" */
  aspectRatio?: TransitionAspectRatio;
  /** Whether the animation automatically plays upon mounting. Default: false */
  autoPlay?: boolean;
  /** Whether playback loops indefinitely. Default: false */
  isLooping?: boolean;
  /** Whether to show the bottom playback controls bar. Default: true */
  showControls?: boolean;
  /** Optional theme gradient colors */
  themeColors?: TransitionThemeColors;
  /** Callback fired when transition animation completes forward play */
  onComplete?: () => void;
  /** Optional additional CSS class for outer container */
  className?: string;
  /** Optional trigger counter to restart/replay playback externally */
  playTrigger?: number;
  /** Optional externally controlled playback progress (0 to 1) */
  progress?: number;
  /** Optional callback when playback progress updates */
  onProgressChange?: (progress: number) => void;
  /** Optional externally controlled playing state */
  isPlaying?: boolean;
  /** Optional callback when playing state changes */
  onPlayingChange?: (isPlaying: boolean) => void;
  /** Optional callback when looping state changes */
  onLoopingChange?: (isLooping: boolean) => void;
  /** Optional external toggle play handler */
  onTogglePlay?: () => void;
  /** Optional external replay handler */
  onReplay?: () => void;
  /** Optional external toggle loop handler */
  onToggleLoop?: () => void;
}

export interface UseTransitionPlaybackOptions {
  durationSeconds: number;
  autoPlay?: boolean;
  isLooping?: boolean;
  onComplete?: () => void;
  /** Optional trigger counter to restart/replay playback externally */
  playTrigger?: number;
  /** Optional externally controlled playback progress (0 to 1) */
  progress?: number;
  /** Optional callback when playback progress updates */
  onProgressChange?: (progress: number) => void;
  /** Optional externally controlled playing state */
  isPlaying?: boolean;
  /** Optional callback when playing state changes */
  onPlayingChange?: (isPlaying: boolean) => void;
  /** Optional callback when looping state changes */
  onLoopingChange?: (isLooping: boolean) => void;
}

export interface TransitionPlaybackState {
  isPlaying: boolean;
  progress: number;
  currentTime: number;
  isLooping: boolean;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  replay: () => void;
  seek: (progress: number) => void;
  toggleLoop: () => void;
}
