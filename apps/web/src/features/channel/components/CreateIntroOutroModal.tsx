import { useState } from "react";
import { CheckCircle, UploadSimple, WarningCircle, X } from "@phosphor-icons/react";
import type { IntroOutroTransitionType } from "@studio/shared";
import type { CreateIntroOutroStylePayload } from "../../../api/introOutroApi";

export interface CreateIntroOutroModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateIntroOutroStylePayload) => Promise<boolean>;
  submitting: boolean;
}

interface VideoFileInfo {
  file: File;
  dataUrl: string;
  width: number;
  height: number;
  duration: number;
  error?: string;
}

export function CreateIntroOutroModal({ isOpen, onClose, onSubmit, submitting }: CreateIntroOutroModalProps) {
  const [name, setName] = useState("");
  const [transitionType, setTransitionType] = useState<IntroOutroTransitionType>("stinger_swipe");
  const [introInfo, setIntroInfo] = useState<VideoFileInfo | null>(null);
  const [outroInfo, setOutroInfo] = useState<VideoFileInfo | null>(null);
  const [probingIntro, setProbingIntro] = useState(false);
  const [probingOutro, setProbingOutro] = useState(false);

  if (!isOpen) return null;

  const validateAndInspectVideo = async (
    file: File,
    onSuccess: (info: VideoFileInfo) => void,
    setProbing: (p: boolean) => void,
  ) => {
    setProbing(true);
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";

    video.onloadedmetadata = () => {
      const width = video.videoWidth;
      const height = video.videoHeight;
      const duration = video.duration;
      URL.revokeObjectURL(objectUrl);

      if (width !== 1920 || height !== 1080) {
        onSuccess({
          file,
          dataUrl: "",
          width,
          height,
          duration,
          error: `Video must be exactly 1080p (1920x1080). Detected: ${width}x${height}. Please upscale before uploading.`,
        });
        setProbing(false);
        return;
      }

      // Read as base64
      const reader = new FileReader();
      reader.onload = () => {
        onSuccess({
          file,
          dataUrl: reader.result as string,
          width,
          height,
          duration,
        });
        setProbing(false);
      };
      reader.onerror = () => {
        onSuccess({
          file,
          dataUrl: "",
          width,
          height,
          duration,
          error: "Failed to read video file.",
        });
        setProbing(false);
      };
      reader.readAsDataURL(file);
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      onSuccess({
        file,
        dataUrl: "",
        width: 0,
        height: 0,
        duration: 0,
        error: "Cannot read video metadata. Ensure the file is a valid MP4 video.",
      });
      setProbing(false);
    };

    video.src = objectUrl;
  };

  const handleIntroSelect = (file: File) => {
    void validateAndInspectVideo(file, setIntroInfo, setProbingIntro);
  };

  const handleOutroSelect = (file: File) => {
    void validateAndInspectVideo(file, setOutroInfo, setProbingOutro);
  };

  const canSubmit =
    name.trim().length > 0 &&
    introInfo &&
    !introInfo.error &&
    introInfo.dataUrl &&
    outroInfo &&
    !outroInfo.error &&
    outroInfo.dataUrl &&
    !submitting &&
    !probingIntro &&
    !probingOutro;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !introInfo || !outroInfo) return;

    await onSubmit({
      name: name.trim(),
      transition_type: transitionType,
      intro_data: introInfo.dataUrl,
      outro_data: outroInfo.dataUrl,
      intro_filename: introInfo.file.name,
      outro_filename: outroInfo.file.name,
    });
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="intro-outro-modal-title">
      <div className="modal-card" style={{ maxWidth: 620 }}>
        <div className="modal-header">
          <h2 id="intro-outro-modal-title">Add Intro / Outro Style</h2>
          <button className="icon-button" onClick={onClose} disabled={submitting} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body-form">
          <div className="form-group">
            <label htmlFor="style-name">Style Name</label>
            <input
              id="style-name"
              type="text"
              className="text-input"
              placeholder="e.g. Hero Mascot 3D, Cyberpunk Neon"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
              maxLength={50}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="transition-type">Transition into Question 1</label>
            <select
              id="transition-type"
              className="text-input"
              value={transitionType}
              onChange={(e) => setTransitionType(e.target.value as IntroOutroTransitionType)}
              disabled={submitting}
            >
              <option value="stinger_swipe">Stinger Swipe (Dynamic Wipe Overlay)</option>
              <option value="crossfade">Smooth Crossfade</option>
              <option value="cut">Direct Cut</option>
            </select>
          </div>

          {/* Intro video picker */}
          <div className="form-group">
            <label>Intro Video (1080p MP4)</label>
            <div className="dropzone-box" style={{ border: "2px dashed var(--border-subtle, #333)", padding: 16, borderRadius: 8, textAlign: "center" }}>
              <input
                type="file"
                id="intro-file"
                accept="video/mp4"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleIntroSelect(file);
                }}
                disabled={submitting || probingIntro}
              />
              <label htmlFor="intro-file" style={{ cursor: "pointer", display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <UploadSimple size={24} />
                <span>{introInfo ? introInfo.file.name : "Select Intro MP4 (1920x1080)"}</span>
              </label>

              {probingIntro && <p style={{ fontSize: 12, color: "#888", marginTop: 6 }}>Inspecting video format...</p>}

              {introInfo?.error && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#ff6b6b", fontSize: 13, marginTop: 8 }}>
                  <WarningCircle size={16} />
                  <span>{introInfo.error}</span>
                </div>
              )}

              {introInfo && !introInfo.error && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#51cf66", fontSize: 13, marginTop: 8 }}>
                  <CheckCircle size={16} />
                  <span>1080p Verified (1920x1080) • {introInfo.duration.toFixed(1)}s</span>
                </div>
              )}
            </div>
          </div>

          {/* Outro video picker */}
          <div className="form-group">
            <label>Outro Video (1080p MP4)</label>
            <div className="dropzone-box" style={{ border: "2px dashed var(--border-subtle, #333)", padding: 16, borderRadius: 8, textAlign: "center" }}>
              <input
                type="file"
                id="outro-file"
                accept="video/mp4"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleOutroSelect(file);
                }}
                disabled={submitting || probingOutro}
              />
              <label htmlFor="outro-file" style={{ cursor: "pointer", display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <UploadSimple size={24} />
                <span>{outroInfo ? outroInfo.file.name : "Select Outro MP4 (1920x1080)"}</span>
              </label>

              {probingOutro && <p style={{ fontSize: 12, color: "#888", marginTop: 6 }}>Inspecting video format...</p>}

              {outroInfo?.error && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#ff6b6b", fontSize: 13, marginTop: 8 }}>
                  <WarningCircle size={16} />
                  <span>{outroInfo.error}</span>
                </div>
              )}

              {outroInfo && !outroInfo.error && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#51cf66", fontSize: 13, marginTop: 8 }}>
                  <CheckCircle size={16} />
                  <span>1080p Verified (1920x1080) • {outroInfo.duration.toFixed(1)}s</span>
                </div>
              )}
            </div>
          </div>

          <div className="modal-actions" style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <button type="button" className="quiet-button" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="button primary" disabled={!canSubmit}>
              {submitting ? "Uploading & Processing..." : "Save Style"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
