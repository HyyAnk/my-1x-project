import { Clock, PencilSimpleLine, SquaresFour, YoutubeLogo, Sparkle } from "@phosphor-icons/react";
import type { Channel, Episode, VideoDescription } from "@studio/shared";
import type { Notice } from "../../../components/types";
import { useVideoDescription } from "../hooks/useVideoDescription";
import { DescriptionBlockEditor } from "./description/DescriptionBlockEditor";
import { DescriptionCollapsedBar } from "./description/DescriptionCollapsedBar";
import { DescriptionRawEditor } from "./description/DescriptionRawEditor";
import { DescriptionToneChips } from "./description/DescriptionToneChips";
import { DescriptionYouTubePreview } from "./description/DescriptionYouTubePreview";

export interface VideoDescriptionCardProps {
  channel: Channel;
  episode: Episode;
  episodeId: string;
  hasQuiz?: boolean;
  initialDescription?: VideoDescription | null;
  onNotice?: (notice: NonNullable<Notice>) => void;
}

export function VideoDescriptionCard({
  channel,
  episode,
  episodeId,
  hasQuiz = true,
  initialDescription,
  onNotice,
}: VideoDescriptionCardProps) {
  const {
    description,
    draftText,
    setDraftText,
    generating,
    saving,
    copied,
    copiedBlock,
    toneHint,
    setToneHint,
    activeTab,
    setActiveTab,
    generate,
    save,
    copyToClipboard,
    isModified,
    charCount,
    isOverLimit,
    canGenerate,
    hasDescription,
  } = useVideoDescription({
    channelId: channel.channel_id,
    episodeId,
    hasQuiz,
    initialDescription,
    onNotice,
  });

  return (
    <section className="video-description-panel">
      <DescriptionCollapsedBar
        description={description}
        hasQuiz={hasQuiz}
        canGenerate={canGenerate}
        generating={generating}
        copied={copied}
        charCount={charCount}
        isOverLimit={isOverLimit}
        onCopy={() => void copyToClipboard()}
        onGenerate={() => void generate()}
      />

      <DescriptionToneChips
        toneHint={toneHint}
        disabled={!canGenerate}
        onSelectTone={(val) => {
          setToneHint(val);
          void generate(val);
        }}
        onCustomToneChange={setToneHint}
        onSubmit={() => void generate()}
      />

      {hasDescription ? (
        <div>
          <div className="video-description-nav-row">
            <div className="description-segmented-tabs" role="tablist" aria-label="Description View Modes">
              <button
                type="button"
                className={`description-segmented-btn ${activeTab === "preview" ? "active" : ""}`}
                onClick={() => setActiveTab("preview")}
                role="tab"
                aria-selected={activeTab === "preview"}
              >
                <YoutubeLogo size={16} weight="fill" />
                <span>📱 YouTube Preview</span>
              </button>
              <button
                type="button"
                className={`description-segmented-btn ${activeTab === "blocks" ? "active" : ""}`}
                onClick={() => setActiveTab("blocks")}
                role="tab"
                aria-selected={activeTab === "blocks"}
              >
                <SquaresFour size={16} weight="bold" />
                <span>🧩 Content Blocks</span>
              </button>
              <button
                type="button"
                className={`description-segmented-btn ${activeTab === "edit" ? "active" : ""}`}
                onClick={() => setActiveTab("edit")}
                role="tab"
                aria-selected={activeTab === "edit"}
              >
                <PencilSimpleLine size={16} weight="bold" />
                <span>📝 Raw Editor</span>
              </button>
            </div>

            {description?.generated_at && (
              <div className="description-meta-time">
                <Clock size={13} />
                <span>Generated at {new Date(description.generated_at).toLocaleTimeString()}</span>
              </div>
            )}
          </div>

          {activeTab === "preview" && (
            <DescriptionYouTubePreview description={description} fullText={draftText} />
          )}

          {activeTab === "blocks" && (
            <DescriptionBlockEditor
              description={description}
              copiedBlock={copiedBlock}
              onCopyBlock={(text, key) => void copyToClipboard(text, key)}
            />
          )}

          {activeTab === "edit" && (
            <DescriptionRawEditor
              draftText={draftText}
              isModified={isModified}
              isOverLimit={isOverLimit}
              saving={saving}
              onDraftChange={setDraftText}
              onSave={() => void save()}
            />
          )}
        </div>
      ) : (
        <div className="video-description-empty">
          <div className="video-description-empty-icon">
            <Sparkle size={32} weight="duotone" color="var(--accent)" />
          </div>
          <p className="video-description-empty-text">
            {!hasQuiz
              ? "Quiz questions have not been generated yet. Video description and SEO keywords will be automatically analyzed and generated once question scripts are ready."
              : "No video description generated yet. Choose an AI Strategy tone above and click Generate Description to craft high-retention YouTube SEO metadata."}
          </p>
        </div>
      )}
    </section>
  );
}
