import { useState } from "react";
import { Plus } from "@phosphor-icons/react";
import type { Channel } from "@studio/shared";
import type { Notice } from "../../../components/types";
import { useChannelIntroOutro } from "../hooks/useChannelIntroOutro";
import { CreateIntroOutroModal } from "./CreateIntroOutroModal";
import { IntroOutroEmptyState } from "./introOutro/IntroOutroEmptyState";
import { IntroOutroPreviewModal, type IntroOutroPreviewClip } from "./introOutro/IntroOutroPreviewModal";
import { IntroOutroStyleCard } from "./introOutro/IntroOutroStyleCard";

export interface ChannelIntroOutroTabProps {
  channel: Channel;
  onNotice: (notice: NonNullable<Notice>) => void;
  onChannelUpdate?: (updated: Channel) => void;
}

export function ChannelIntroOutroTab({ channel, onNotice, onChannelUpdate }: ChannelIntroOutroTabProps) {
  const { styles, loading, isCreateOpen, setIsCreateOpen, busyAction, handleCreateStyle, handleDeleteStyle, handleSetDefaultStyle } =
    useChannelIntroOutro({ channel, onNotice, onChannelUpdate });

  const [previewClip, setPreviewClip] = useState<IntroOutroPreviewClip | null>(null);

  return (
    <section className="channel-tab-panel intro-outro-tab" style={{ padding: "24px 0" }}>
      {/* Top Header */}
      <div className="intro-outro-tab-header">
        <div className="intro-outro-title-group">
          <h2>Custom Intro & Outro Styles</h2>
          <p>Pre-rendered 1080p video pairs featuring channel mascots and branding.</p>
        </div>
        <button type="button" className="intro-outro-add-btn" onClick={() => setIsCreateOpen(true)}>
          <Plus size={16} weight="bold" />
          <span>Add Style Pair</span>
        </button>
      </div>

      {/* Main Content Area */}
      {loading && styles.length === 0 ? (
        <div style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}>Loading intro/outro styles...</div>
      ) : styles.length === 0 ? (
        <IntroOutroEmptyState onAddStyle={() => setIsCreateOpen(true)} />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 20,
          }}
        >
          {styles.map((style) => (
            <IntroOutroStyleCard
              key={style.style_id}
              style={style}
              channelId={channel.channel_id}
              isDefault={channel.default_intro_outro_style_id === style.style_id}
              isDeleting={busyAction === `delete_${style.style_id}`}
              isSettingDefault={busyAction === `default_${style.style_id}`}
              onPreviewClip={setPreviewClip}
              onSetDefault={handleSetDefaultStyle}
              onDelete={(id, name) => void handleDeleteStyle(id, name)}
            />
          ))}
        </div>
      )}

      {/* Video Clip Preview Modal */}
      <IntroOutroPreviewModal channelId={channel.channel_id} previewClip={previewClip} onClose={() => setPreviewClip(null)} />

      {/* Add / Create Style Modal */}
      <CreateIntroOutroModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateStyle}
        submitting={busyAction === "create"}
      />
    </section>
  );
}
