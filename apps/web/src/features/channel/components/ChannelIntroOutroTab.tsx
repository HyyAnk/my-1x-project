import { useState } from "react";
import { FilmSlate, Play, Plus, Star, Trash, X } from "@phosphor-icons/react";
import type { Channel, IntroOutroStyle } from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";
import { useChannelIntroOutro } from "../hooks/useChannelIntroOutro";
import { CreateIntroOutroModal } from "./CreateIntroOutroModal";

export interface ChannelIntroOutroTabProps {
  channel: Channel;
  onNotice: (notice: NonNullable<Notice>) => void;
  onChannelUpdate?: (updated: Channel) => void;
}

export function ChannelIntroOutroTab({ channel, onNotice, onChannelUpdate }: ChannelIntroOutroTabProps) {
  const {
    styles,
    loading,
    isCreateOpen,
    setIsCreateOpen,
    busyAction,
    handleCreateStyle,
    handleDeleteStyle,
    handleSetDefaultStyle,
  } = useChannelIntroOutro({ channel, onNotice, onChannelUpdate });

  const [previewClip, setPreviewClip] = useState<{ styleId: string; kind: "intro" | "outro"; title: string } | null>(
    null,
  );

  return (
    <section className="channel-tab-panel intro-outro-tab" style={{ padding: "24px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Custom Intro & Outro Styles</h2>
          <p style={{ color: "var(--text-secondary, #888)", fontSize: 14, margin: "4px 0 0" }}>
            Pre-rendered 1080p video pairs featuring channel mascots and branding.
          </p>
        </div>
        <button className="button primary" onClick={() => setIsCreateOpen(true)}>
          <Plus size={16} />
          <span>Add Style</span>
        </button>
      </div>

      {loading && styles.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "#888" }}>Loading styles...</div>
      ) : styles.length === 0 ? (
        <div
          style={{
            border: "1px dashed var(--border-subtle, #333)",
            borderRadius: 12,
            padding: "48px 24px",
            textAlign: "center",
          }}
        >
          <FilmSlate size={48} style={{ opacity: 0.4, marginBottom: 12 }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 6px" }}>No custom intro/outro styles yet</h3>
          <p style={{ fontSize: 14, color: "#888", maxWidth: 460, margin: "0 auto 18px" }}>
            Upload your first pair of 1080p intro and outro videos to diversify video openings for this channel.
          </p>
          <button className="button primary" onClick={() => setIsCreateOpen(true)}>
            <Plus size={16} />
            <span>Upload Style Pair</span>
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 20,
          }}
        >
          {styles.map((style) => {
            const isDefault = channel.default_intro_outro_style_id === style.style_id;
            const isDeleting = busyAction === `delete_${style.style_id}`;
            const isSettingDefault = busyAction === `default_${style.style_id}`;

            return (
              <div
                key={style.style_id}
                className="style-card"
                style={{
                  border: isDefault ? "2px solid #4dabf7" : "1px solid var(--border-subtle, #333)",
                  borderRadius: 10,
                  overflow: "hidden",
                  background: "var(--surface-card, #1a1a1a)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Thumbnails preview strip */}
                <div style={{ display: "flex", height: 120, background: "#000", position: "relative" }}>
                  <div
                    style={{
                      flex: 1,
                      position: "relative",
                      borderRight: "1px solid #333",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      backgroundImage: style.intro.thumbnail_filename
                        ? `url(${api.getIntroOutroThumbUrl(channel.channel_id, style.style_id, "intro")})`
                        : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                    onClick={() =>
                      setPreviewClip({
                        styleId: style.style_id,
                        kind: "intro",
                        title: `${style.name} · Intro`,
                      })
                    }
                  >
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "rgba(0,0,0,0.35)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Play size={24} weight="fill" color="#fff" />
                    </div>
                    <span
                      style={{
                        position: "absolute",
                        bottom: 6,
                        left: 6,
                        background: "rgba(0,0,0,0.75)",
                        fontSize: 11,
                        padding: "2px 6px",
                        borderRadius: 4,
                        color: "#fff",
                      }}
                    >
                      Intro {style.intro.duration_seconds.toFixed(1)}s
                    </span>
                  </div>

                  <div
                    style={{
                      flex: 1,
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      backgroundImage: style.outro.thumbnail_filename
                        ? `url(${api.getIntroOutroThumbUrl(channel.channel_id, style.style_id, "outro")})`
                        : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                    onClick={() =>
                      setPreviewClip({
                        styleId: style.style_id,
                        kind: "outro",
                        title: `${style.name} · Outro`,
                      })
                    }
                  >
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "rgba(0,0,0,0.35)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Play size={24} weight="fill" color="#fff" />
                    </div>
                    <span
                      style={{
                        position: "absolute",
                        bottom: 6,
                        left: 6,
                        background: "rgba(0,0,0,0.75)",
                        fontSize: 11,
                        padding: "2px 6px",
                        borderRadius: 4,
                        color: "#fff",
                      }}
                    >
                      Outro {style.outro.duration_seconds.toFixed(1)}s
                    </span>
                  </div>
                </div>

                {/* Card Info */}
                <div style={{ padding: 14, flex: 1, display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{style.name}</h3>
                    {isDefault && (
                      <span
                        style={{
                          background: "#1864ab",
                          color: "#d0ebff",
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: 999,
                        }}
                      >
                        Default
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: 11,
                        background: "var(--badge-bg, #262626)",
                        padding: "2px 6px",
                        borderRadius: 4,
                        color: "#aaa",
                      }}
                    >
                      Transition: {style.transition_type}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        background: "var(--badge-bg, #262626)",
                        padding: "2px 6px",
                        borderRadius: 4,
                        color: "#aaa",
                      }}
                    >
                      {style.intro.has_audio ? "🔊 Audio" : "🔇 No Audio"}
                    </span>
                  </div>

                  {/* Card Actions */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "auto",
                      paddingTop: 12,
                      borderTop: "1px solid var(--border-subtle, #2c2c2c)",
                    }}
                  >
                    <button
                      className="quiet-button"
                      style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}
                      onClick={() => handleSetDefaultStyle(isDefault ? null : style.style_id)}
                      disabled={isSettingDefault}
                    >
                      <Star size={14} weight={isDefault ? "fill" : "regular"} color={isDefault ? "#ffd43b" : "inherit"} />
                      <span>{isDefault ? "Unset Default" : "Set as Default"}</span>
                    </button>

                    <button
                      className="icon-button danger"
                      title="Delete Style"
                      onClick={() => {
                        if (confirm(`Delete style "${style.name}"?`)) {
                          void handleDeleteStyle(style.style_id, style.name);
                        }
                      }}
                      disabled={isDeleting}
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Video Preview Modal */}
      {previewClip && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewClip(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#141414",
              borderRadius: 12,
              overflow: "hidden",
              width: "90%",
              maxWidth: 800,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                borderBottom: "1px solid #333",
              }}
            >
              <h3 style={{ margin: 0, fontSize: 15 }}>{previewClip.title}</h3>
              <button className="icon-button" onClick={() => setPreviewClip(null)}>
                <X size={18} />
              </button>
            </div>
            <div style={{ background: "#000", aspectRatio: "16 / 9" }}>
              <video
                src={api.getIntroOutroClipUrl(channel.channel_id, previewClip.styleId, previewClip.kind)}
                controls
                autoPlay
                style={{ width: "100%", height: "100%", display: "block" }}
              />
            </div>
          </div>
        </div>
      )}

      <CreateIntroOutroModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateStyle}
        submitting={busyAction === "create"}
      />
    </section>
  );
}
