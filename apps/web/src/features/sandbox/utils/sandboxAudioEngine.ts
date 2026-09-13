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
  durationSeconds?: number;
  targetAnimation?: string;
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
          const response = await fetch(`/api/quiz/sfx/${encodeURIComponent(filename)}?v=pure-ting`);
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

  playRevealSfx(outcome: "correct" | "wrong" | "timeout" = "correct", volume = 0.75): void {
    const filename = outcome === "correct" ? "correct_triumph.wav" : "streak.wav";
    this.playSfx(filename, volume);
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

  getMasterVolume(): number {
    return this.masterVolume;
  }
}

/**
 * Builds the canonical list of SFX cues for Sandbox Rehearsal based on timing policy.
 * Calibrated to exact audio keyframes synchronized with visual animations:
 * - choices.pop (0.85s): choicesStart entrance pop
 * - countdown.5 to countdown.1 (2.47s - 6.47s): 1-second interval urgent ticks
 * - countdown.final & reveal.triumph (7.47s): final timer completion chime and answer reveal triumph
 * - explain.streak (8.27s): explanation and fun fact celebration burst
 */
export function buildSandboxRehearsalCues(
  timeline: SandboxPhaseTimeline = computeSandboxPhaseTimeline(),
  revealOutcome: "correct" | "wrong" | "timeout" = "correct",
): SfxCue[] {
  const isCorrect = revealOutcome === "correct";
  const revealSfx = isCorrect ? "correct_triumph.wav" : "streak.wav";

  return [
    // 1. Choices entrance pop
    {
      id: "choices-enter",
      timeSeconds: Number(timeline.choicesStart.toFixed(2)),
      filename: "ui_pop.wav",
      volume: 0.55,
    },

    // 2. Countdown 5-4-3-2-1 ticks (escalating pitch & urgency)
    {
      id: "cd-5",
      timeSeconds: Number((timeline.thinkingStart + 0.0).toFixed(2)),
      filename: "countdown_5.wav",
      volume: 0.45,
    },
    {
      id: "cd-4",
      timeSeconds: Number((timeline.thinkingStart + 1.0).toFixed(2)),
      filename: "countdown_4.wav",
      volume: 0.45,
    },
    {
      id: "cd-3",
      timeSeconds: Number((timeline.thinkingStart + 2.0).toFixed(2)),
      filename: "countdown_3.wav",
      volume: 0.48,
    },
    {
      id: "cd-2",
      timeSeconds: Number((timeline.thinkingStart + 3.0).toFixed(2)),
      filename: "countdown_2.wav",
      volume: 0.5,
    },
    {
      id: "cd-1",
      timeSeconds: Number((timeline.thinkingStart + 4.0).toFixed(2)),
      filename: "countdown_1.wav",
      volume: 0.6,
    },

    // 3. Countdown final chime & Answer Reveal triumph
    {
      id: "cd-final",
      timeSeconds: Number(timeline.revealStart.toFixed(2)),
      filename: "countdown_final.wav",
      volume: 0.6,
    },
    {
      id: "answer-reveal",
      timeSeconds: Number(timeline.revealStart.toFixed(2)),
      filename: revealSfx,
      volume: 0.75,
      durationSeconds: 0.62,
      targetAnimation: "correct-card-reveal",
    },

    // 4. Fun fact & Reward stars burst (explain phase)
    {
      id: "reward-fact",
      timeSeconds: Number(timeline.explainStart.toFixed(2)),
      filename: "streak.wav",
      volume: 0.65,
    },
  ];
}
