import type { FormEvent } from "react";
import { CircleNotch, FloppyDisk, VideoCamera } from "@phosphor-icons/react";
import { StatusLine } from "../../../components/AppChrome";

export interface VideoTimingSettingsCardProps {
  maxDuration: number;
  estimatedWpm: number;
  aspectRatio: "16:9" | "9:16";
  setAspectRatio: (ratio: "16:9" | "9:16") => void;
  maxConcurrentVideoTasks: number;
  setMaxConcurrentVideoTasks: (val: number) => void;
  renderWorkers?: number;
  setRenderWorkers?: (val: number | undefined) => void;
  renderQuality?: "draft" | "standard" | "high";
  setRenderQuality?: (val: "draft" | "standard" | "high") => void;
  fps?: number;
  setFps?: (val: number) => void;
  maxSceneDuration: number;
  setMaxSceneDuration: (val: number) => void;
  narrationWordsPerSecond: number;
  setNarrationWordsPerSecond: (val: number) => void;
  savingVideo: boolean;
  onSaveVideo: (event: FormEvent) => void | Promise<void>;
}

export function VideoTimingSettingsCard({
  maxDuration,
  estimatedWpm,
  aspectRatio,
  setAspectRatio,
  maxConcurrentVideoTasks,
  setMaxConcurrentVideoTasks,
  renderWorkers,
  setRenderWorkers,
  renderQuality = "draft",
  setRenderQuality,
  fps = 30,
  setFps,
  maxSceneDuration,
  setMaxSceneDuration,
  narrationWordsPerSecond,
  setNarrationWordsPerSecond,
  savingVideo,
  onSaveVideo,
}: VideoTimingSettingsCardProps) {
  return (
    <section className="panel video-settings-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Video Timing & Pacing</p>
          <h2>Scene Duration & Speed</h2>
        </div>
        <VideoCamera size={22} />
      </div>
      <StatusLine label="Max scene duration" value={`${maxDuration}s`} />
      <StatusLine label="Estimated speaking pace" value={`~${estimatedWpm} words/min`} />
      <StatusLine label="Output canvas" value={aspectRatio === "9:16" ? "Portrait · 1080 × 1920" : "Landscape · 1920 × 1080"} />
      <StatusLine label="Max concurrent episode builds" value={`${maxConcurrentVideoTasks} episodes`} />
      <StatusLine
        label="Render Workers / Quality"
        value={`${renderWorkers ? `${renderWorkers} workers` : "Auto (RAM/CPU based)"} · ${renderQuality.toUpperCase()} @ ${fps}fps`}
      />
      <form className="codex-form" onSubmit={(event) => void onSaveVideo(event)}>
        <label>
          Output aspect ratio
          <select value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value as "16:9" | "9:16")}>
            <option value="16:9">16:9 · Landscape (1920 × 1080)</option>
            <option value="9:16">9:16 · Portrait (1080 × 1920)</option>
          </select>
          <small className="field-help">The same canvas is used by Visual Sandbox, Stage Studio, and production video renders.</small>
        </label>
        <label>
          Parallel Episode Builds (Queue Limit)
          <select value={maxConcurrentVideoTasks} onChange={(event) => setMaxConcurrentVideoTasks(Number(event.target.value))}>
            <option value="1">1 episode (Sequential / Resource-saving)</option>
            <option value="2">2 episodes (Default - Recommended for 32GB RAM)</option>
            <option value="3">3 episodes</option>
            <option value="4">4 episodes</option>
          </select>
          <small className="field-help">
            Maximum number of concurrent episode video builds. Tasks exceeding this limit are queued automatically in the sidebar.
          </small>
        </label>
        {setRenderWorkers && (
          <label>
            HyperFrames Render Workers (Parallel Chromium Instances)
            <select
              value={renderWorkers ?? 0}
              onChange={(event) => {
                const val = Number(event.target.value);
                setRenderWorkers(val === 0 ? undefined : val);
              }}
            >
              <option value="0">Auto-detect (Optimal based on CPU cores & free RAM)</option>
              <option value="4">4 Workers (Safe / Standard)</option>
              <option value="6">6 Workers (Balanced / 8-core CPU)</option>
              <option value="8">8 Workers (Fast / 8-16 core CPU)</option>
              <option value="10">10 Workers (High Speed / i7-13700KF+ & 32GB RAM)</option>
              <option value="12">12 Workers (Max Parallel / 16+ core CPU & 32GB+ RAM)</option>
            </select>
            <small className="field-help">Number of parallel Chromium renderer workers used to capture frames simultaneously.</small>
          </label>
        )}
        {setRenderQuality && (
          <label>
            Render Quality Preset
            <select value={renderQuality} onChange={(event) => setRenderQuality(event.target.value as "draft" | "standard" | "high")}>
              <option value="draft">Draft (Fastest - Best for rapid preview & testing)</option>
              <option value="standard">Standard (Balanced - Recommended for publishing)</option>
              <option value="high">High (Maximum quality - Slower encoding)</option>
            </select>
            <small className="field-help">Encoding CRF and compression preset used by HyperFrames and FFmpeg.</small>
          </label>
        )}
        {setFps && (
          <label>
            Frame Rate (FPS)
            <select value={fps} onChange={(event) => setFps(Number(event.target.value))}>
              <option value="24">24 FPS (Fast - 20% fewer frames, great for social media)</option>
              <option value="30">30 FPS (Standard - Crisp and smooth)</option>
              <option value="60">60 FPS (Ultra Smooth - 2x rendering load)</option>
            </select>
            <small className="field-help">Video frame rate. 24 FPS saves 20% render time compared to 30 FPS.</small>
          </label>
        )}
        <label>
          Max Scene Duration (seconds)
          <input
            type="number"
            min="1"
            max="120"
            step="0.5"
            value={maxSceneDuration}
            onChange={(event) => setMaxSceneDuration(Number(event.target.value))}
          />
          <small className="field-help">
            Maximum length your video generation pipeline will produce per shot. The scene breakdown engine packs dialogue beats to fit
            within this duration.
          </small>
        </label>
        <label>
          Narration pace (words/sec)
          <input
            type="number"
            min="0.1"
            max="20"
            step="0.1"
            value={narrationWordsPerSecond}
            onChange={(event) => setNarrationWordsPerSecond(Number(event.target.value))}
          />
          <small className="field-help">
            Standard spoken speed calibration ({narrationWordsPerSecond} words/sec ≈ {estimatedWpm} words/min).
          </small>
        </label>
        <button className="primary-button" disabled={savingVideo}>
          {savingVideo ? <CircleNotch className="spin" size={16} /> : <FloppyDisk size={16} />}
          <span>Save Video Settings</span>
        </button>
      </form>
    </section>
  );
}
