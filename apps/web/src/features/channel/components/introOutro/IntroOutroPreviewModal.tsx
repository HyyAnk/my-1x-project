import { X } from "@phosphor-icons/react";
import { api } from "../../../../api";

export interface IntroOutroPreviewClip {
  styleId: string;
  kind: "intro" | "outro";
  title: string;
}

export interface IntroOutroPreviewModalProps {
  channelId: string;
  previewClip: IntroOutroPreviewClip | null;
  onClose: () => void;
}

export function IntroOutroPreviewModal({ channelId, previewClip, onClose }: IntroOutroPreviewModalProps) {
  if (!previewClip) return null;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line-dark)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          width: "90%",
          maxWidth: 800,
          boxShadow: "var(--shadow-lg)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 18px",
            borderBottom: "1px solid var(--line)",
            background: "var(--surface-strong)",
          }}
        >
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{previewClip.title}</h3>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close preview">
            <X size={18} />
          </button>
        </div>
        <div style={{ background: "#000", aspectRatio: "16 / 9" }}>
          <video
            src={api.getIntroOutroClipUrl(channelId, previewClip.styleId, previewClip.kind)}
            controls
            autoPlay
            style={{ width: "100%", height: "100%", display: "block" }}
          />
        </div>
      </div>
    </div>
  );
}
