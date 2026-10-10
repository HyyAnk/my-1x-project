import { Check, CircleNotch, Copy, FloppyDisk, Info, Sparkle, TextT } from "@phosphor-icons/react";
import { VIDEO_TITLE_MAX_CHARS, type VideoTitle, type VideoTitleSource } from "@studio/shared";
import type { Notice } from "../../../components/types";
import type { VideoTitleClient } from "../../quizProduct/types/videoMetadataClient.types";
import { useVideoTitle } from "../hooks/useVideoTitle";
import { VideoTitleSeoChecks } from "./title/VideoTitleSeoChecks";

export interface VideoTitleCardProps {
  channelId: string;
  episodeId: string;
  hasQuiz?: boolean;
  initialTitle?: VideoTitle | null;
  onNotice?: (notice: NonNullable<Notice>) => void;
  onUpdated?: () => Promise<void> | void;
  client?: VideoTitleClient;
}

const SOURCE_BADGES: Record<VideoTitleSource, string> = {
  llm: "AI Generated",
  fallback: "Template",
  manual: "Edited",
};

export function VideoTitleCard({ channelId, episodeId, hasQuiz = true, initialTitle, onNotice, onUpdated, client }: VideoTitleCardProps) {
  const { title, draftTitle, setDraftTitle, generating, saving, copied, generate, save, copyToClipboard, metrics, canGenerate, canSave } =
    useVideoTitle({ channelId, episodeId, hasQuiz, initialTitle, onNotice, onUpdated, client });

  return (
    <section className="video-description-panel video-title-panel">
      <div className="video-description-header">
        <div className="video-description-title-group">
          <h2 className="video-description-title">
            <TextT size={22} weight="duotone" color="var(--accent)" />
            <span>YouTube Title</span>
          </h2>
          {title && <span className="video-description-badge">{SOURCE_BADGES[title.source]}</span>}
          <span
            className="info-tooltip-trigger video-title-info"
            title="Keyword-first formula: <Keyword> Quiz: <N> Questions <Challenge Hook>. Saving or regenerating the title automatically refreshes the description so both target the same keyword."
          >
            <Info size={15} />
          </span>
        </div>

        <div className="video-description-actions">
          {title && (
            <button type="button" className={`btn-copy-hero ${copied ? "is-copied" : ""}`} onClick={() => void copyToClipboard()}>
              {copied ? <Check size={16} weight="bold" /> : <Copy size={16} weight="duotone" color="var(--accent)" />}
              <span>{copied ? "Copied!" : "Copy Title"}</span>
            </button>
          )}
          <button
            type="button"
            className="primary-button compact video-title-generate"
            disabled={!canGenerate}
            title={!hasQuiz ? "Generate quiz questions first before creating the video title" : undefined}
            onClick={() => void generate()}
          >
            {generating ? <CircleNotch className="spin" size={15} /> : <Sparkle size={15} weight="fill" />}
            <span>{generating ? "Generating..." : title ? "Regenerate" : "Generate Title"}</span>
          </button>
        </div>
      </div>

      {title ? (
        <div className="video-title-body">
          <div className="video-title-editor">
            <input
              className="video-title-input"
              aria-label="YouTube video title"
              value={draftTitle}
              maxLength={VIDEO_TITLE_MAX_CHARS + 20}
              onChange={(event) => setDraftTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && canSave) void save();
              }}
            />
            <button type="button" className="quiet-button compact video-title-save" disabled={!canSave} onClick={() => void save()}>
              {saving ? <CircleNotch className="spin" size={15} /> : <FloppyDisk size={15} weight="duotone" />}
              <span>{saving ? "Saving..." : "Save"}</span>
            </button>
          </div>
          <VideoTitleSeoChecks metrics={metrics} primaryKeyword={title.primary_keyword} />
        </div>
      ) : (
        <p className="video-title-empty">
          {hasQuiz
            ? "No title yet. Generate a keyword-first YouTube title; the description is then written to match it."
            : "Quiz questions have not been generated yet. The title is created automatically before the description once questions are ready."}
        </p>
      )}
    </section>
  );
}
