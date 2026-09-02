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
    <section
      className="panel video-description-card"
      style={{
        padding: "16px 20px 20px",
        borderRadius: "10px",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        background: "var(--bg-panel, rgba(30, 41, 59, 0.5))",
      }}
    >
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

      <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
              <div className="mini-tab-group" style={{ display: "flex", gap: "4px" }}>
                <button
                  type="button"
                  className={`quiet-button compact ${activeTab === "preview" ? "is-selected" : ""}`}
                  onClick={() => setActiveTab("preview")}
                  style={{ fontWeight: activeTab === "preview" ? 600 : 400 }}
                >
                  📱 YouTube Preview
                </button>
                <button
                  type="button"
                  className={`quiet-button compact ${activeTab === "blocks" ? "is-selected" : ""}`}
                  onClick={() => setActiveTab("blocks")}
                  style={{ fontWeight: activeTab === "blocks" ? 600 : 400 }}
                >
                  🧩 Content Blocks
                </button>
                <button
                  type="button"
                  className={`quiet-button compact ${activeTab === "edit" ? "is-selected" : ""}`}
                  onClick={() => setActiveTab("edit")}
                  style={{ fontWeight: activeTab === "edit" ? 600 : 400 }}
                >
                  📝 Raw Editor
                </button>
              </div>

              {description?.generated_at && (
                <small style={{ color: "var(--text-muted, #64748b)", fontSize: "11.5px" }}>
                  Generated at: {new Date(description.generated_at).toLocaleTimeString()}
                </small>
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
          <div className="artifact-empty" style={{ padding: "24px 16px", textAlign: "center" }}>
            <p style={{ margin: "0", color: "var(--text-muted, #94a3b8)", fontSize: "13px" }}>
              {!hasQuiz
                ? "Quiz questions have not been generated yet. Video description will be automatically analyzed and generated once questions are ready."
                : "No video description generated yet. Click Generate Description above to create one."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
