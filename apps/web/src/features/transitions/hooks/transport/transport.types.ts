import type React from "react";
import type { LoadedArtifact } from "../../types/transitionPlayer.types";

export interface UseTransitionTransportOptions {
  artifact: LoadedArtifact | null;
  autoPlay?: boolean;
  isLooping?: boolean;
  onComplete?: () => void;
  playTrigger?: number;
}

export interface UseTransitionTransportResult {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isPlaying: boolean;
  isLooping: boolean;
  currentFrameIndex: number;
  totalFrames: number;
  formattedTime: string;
  authoritativePngUrl: string | null;
  isLoadingFrame: boolean;
  play: () => Promise<void>;
  pause: () => void;
  togglePlay: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  seekToFrame: (index: number) => void;
  replay: () => void;
  toggleLoop: () => void;
  reviewWindow: { firstFrame: number; lastFrameInclusive: number; boundaryFrame: number } | null;
}

export interface UseAuthoritativeFrameLoaderOptions {
  onFrameLoaded?: (frameIndex: number) => void;
}

export interface UseAuthoritativeFrameLoaderResult {
  authoritativePngUrl: string | null;
  isLoadingFrame: boolean;
  loadAuthoritativeFrame: (frameIndex: number, artifactId: string) => Promise<void>;
  clearAuthoritativeFrame: () => void;
}

export interface UseScrubbingControlsOptions {
  artifact: LoadedArtifact | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  currentFrameIndex: number;
  pause: () => void;
  loadAuthoritativeFrame: (frameIndex: number, artifactId: string) => Promise<void>;
}

export interface UseScrubbingControlsResult {
  seekToFrame: (index: number) => void;
  stepForward: () => void;
  stepBackward: () => void;
}

export interface UsePlaybackControlsOptions {
  artifact: LoadedArtifact | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  currentFrameIndex: number;
  initialLooping?: boolean;
  loadAuthoritativeFrame: (frameIndex: number, artifactId: string) => Promise<void>;
  seekToFrame?: (frameIndex: number) => void;
}

export interface UsePlaybackControlsResult {
  isPlaying: boolean;
  isLooping: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  play: () => Promise<void>;
  pause: () => void;
  togglePlay: () => void;
  replay: () => void;
  toggleLoop: () => void;
}

export interface UseVideoPlaybackSyncOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  artifact: LoadedArtifact | null;
  isPlaying: boolean;
  isLooping: boolean;
  pause: () => void;
  replay: () => void;
  onComplete?: () => void;
  onFrameChange: (index: number) => void;
}
