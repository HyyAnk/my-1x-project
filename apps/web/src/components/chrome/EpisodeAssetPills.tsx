import React from "react";
import { Check, CircleNotch, FileText, Image, SpeakerHigh, VideoCamera } from "@phosphor-icons/react";

export type EpisodeAssetPillsProps = {
  episode: {
    script_path?: string | null;
    visual_bible_path?: string | null;
    narration_asset_path?: string | null;
    narration_duration_seconds?: number | null;
    video_asset_path?: string | null;
    stage?: string;
  };
  tasks?: Array<{ task_type: string; status: string }>;
  compact?: boolean;
};

type SinglePillProps = {
  isReady: boolean;
  isActive: boolean;
  isFinal?: boolean;
  icon: React.ReactNode;
  label: string;
  title: string;
};

function SinglePill({ isReady, isActive, isFinal = false, icon, label, title }: SinglePillProps) {
  const readyClass = isFinal ? "is-final-ready" : "is-ready";
  const statusClass = isReady ? readyClass : isActive ? "is-running" : "is-empty";

  return (
    <span className={`asset-pill ${statusClass}`} title={title}>
      {isActive ? <CircleNotch size={11} className="spin" /> : icon}
      <span>{label}</span>
      {isReady ? <Check size={10} weight="bold" /> : null}
    </span>
  );
}

export function EpisodeAssetPills({ episode, tasks = [], compact = false }: EpisodeAssetPillsProps) {
  const isTaskActive = (types: string[]) =>
    tasks.some((t) => types.includes(t.task_type) && (t.status === "QUEUED" || t.status === "RUNNING"));

  const scriptActive = isTaskActive(["GENERATE_SCRIPT"]);
  const scriptReady = Boolean(episode.script_path);

  const visualActive = isTaskActive(["GENERATE_VISUAL_BIBLE"]);
  const visualReady = Boolean(episode.visual_bible_path);

  const audioActive = isTaskActive(["GENERATE_NARRATION", "GENERATE_AUDIO"]);
  const audioReady = Boolean(episode.narration_asset_path);
  const audioSec = episode.narration_duration_seconds ? `${Math.round(episode.narration_duration_seconds)}s` : null;

  const videoActive = isTaskActive(["GENERATE_VIDEO"]);
  const videoReady = Boolean(episode.video_asset_path || episode.stage === "VIDEO_READY");

  return (
    <div className={`episode-asset-pills ${compact ? "is-compact" : ""}`} aria-label="Media asset status">
      <SinglePill
        isReady={scriptReady}
        isActive={scriptActive}
        icon={<FileText size={11} />}
        label="Script"
        title={scriptReady ? "Narration Script: Ready" : scriptActive ? "Narration Script: Generating…" : "Narration Script: Not created"}
      />
      <SinglePill
        isReady={visualReady}
        isActive={visualActive}
        icon={<Image size={11} />}
        label="Visual"
        title={visualReady ? "Visual Identity: Ready" : visualActive ? "Visual Identity: Generating…" : "Visual Identity: Not created"}
      />
      <SinglePill
        isReady={audioReady}
        isActive={audioActive}
        icon={<SpeakerHigh size={11} />}
        label="Audio"
        title={
          audioReady
            ? `Narration Audio: Ready (${audioSec ?? "Complete"})`
            : audioActive
              ? "Narration Audio: Synthesizing…"
              : "Narration Audio: Not generated"
        }
      />
      <SinglePill
        isReady={videoReady}
        isActive={videoActive}
        isFinal
        icon={<VideoCamera size={11} />}
        label="Video"
        title={videoReady ? "Master Video: Rendered & Ready" : videoActive ? "Master Video: Rendering…" : "Master Video: Not rendered"}
      />
    </div>
  );
}
