/**
 * Web Audio Engine for Visual Sandbox Rehearsal.
 * Preloads, caches, and triggers synchronized SFX cues during playback.
 */

import { computeSandboxPhaseTimeline, type SandboxPhaseTimeline } from "@studio/shared";

export type SfxCue = {
  id: string;
  timeSeconds: number;
  filename: string;
  volume: number;
};

export class SandboxAudioEngine {
  private audioContext: AudioContext | null = null;
  private readonly bufferCache = new Map<string, AudioBuffer>();
  private readonly activeSourceNodes: AudioBufferSourceNode[] = [];
  private isMuted = false;
  private masterVolume = 0.8;

  constructor() {
    // Lazy AudioContext initialization on user interaction
  }

  getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
      }
    }
    if (this.audioContext && this.audioContext.state === "suspended") {
      void this.audioContext.resume();
    }
    return this.audioContext;
  }

  async preloadSfx(filenames: string[]): Promise<void> {
    const ctx = this.getContext();
    if (!ctx) return;

    await Promise.all(
      filenames.map(async (filename) => {
        if (this.bufferCache.has(filename)) return;
        try {
          const response = await fetch(`/api/quiz/sfx/${encodeURIComponent(filename)}`);
          if (!response.ok) return;
          const arrayBuffer = await response.arrayBuffer();
          const decoded = await ctx.decodeAudioData(arrayBuffer);
          this.bufferCache.set(filename, decoded);
        } catch {
          // Graceful fallback if asset cannot be decoded
        }
      }),
    );
  }

  playSfx(filename: string, volume = 0.7): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const buffer = this.bufferCache.get(filename);
    if (!buffer) {
      void this.preloadSfx([filename]).then(() => {
        const freshBuffer = this.bufferCache.get(filename);
        if (freshBuffer && !this.isMuted) {
          this.playBuffer(freshBuffer, volume);
        }
      });
      return;
    }

    this.playBuffer(buffer, volume);
  }

  private playBuffer(buffer: AudioBuffer, volume: number): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const gainNode = ctx.createGain();
      gainNode.gain.value = Math.max(0, Math.min(1, volume * this.masterVolume));

      source.connect(gainNode);
      gainNode.connect(ctx.destination);

      source.onended = () => {
        const index = this.activeSourceNodes.indexOf(source);
        if (index >= 0) this.activeSourceNodes.splice(index, 1);
      };

      this.activeSourceNodes.push(source);
      source.start(0);
    } catch {
      // Audio playback safety catch
    }
  }

  stopAll(): void {
    for (const source of this.activeSourceNodes) {
      try {
        source.stop();
      } catch {
        // Ignored if already stopped
      }
    }
    this.activeSourceNodes.length = 0;
  }

  getMuted(): boolean {
    return this.isMuted;
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (muted) {
      this.stopAll();
    }
  }

  toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }
}

/**
 * Builds the canonical list of SFX cues for Sandbox Rehearsal based on timing policy.
 */
export function buildSandboxRehearsalCues(
  timeline: SandboxPhaseTimeline = computeSandboxPhaseTimeline(),
  revealOutcome: "correct" | "wrong" | "timeout" = "correct",
): SfxCue[] {
  const isCorrect = revealOutcome === "correct";
  const revealSfx = isCorrect ? "correct_triumph.wav" : "streak.wav";

  return [
    // 1. Choices entrance
    { id: "choices-enter", timeSeconds: timeline.choicesStart, filename: "ui_pop.wav", volume: 0.55 },

    // 2. Countdown 5-4-3-2-1 ticks
    { id: "cd-5", timeSeconds: timeline.thinkingStart + 0.0, filename: "countdown_tick.wav", volume: 0.45 },
    { id: "cd-4", timeSeconds: timeline.thinkingStart + 1.0, filename: "countdown_tick.wav", volume: 0.45 },
    { id: "cd-3", timeSeconds: timeline.thinkingStart + 2.0, filename: "countdown_tick.wav", volume: 0.45 },
    { id: "cd-2", timeSeconds: timeline.thinkingStart + 3.0, filename: "countdown_tick.wav", volume: 0.45 },
    { id: "cd-1", timeSeconds: timeline.thinkingStart + 4.0, filename: "countdown_final.wav", volume: 0.6 },

    // 3. Answer Reveal
    { id: "answer-reveal", timeSeconds: timeline.revealStart, filename: revealSfx, volume: 0.75 },

    // 4. Fun fact & Reward stars burst
    { id: "reward-fact", timeSeconds: timeline.explainStart, filename: "streak.wav", volume: 0.65 },
  ];
}
