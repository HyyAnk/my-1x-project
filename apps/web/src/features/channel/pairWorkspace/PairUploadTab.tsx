import { UploadSimple } from "@phosphor-icons/react";
import type { usePairUpload } from "./usePairUpload";

export function PairUploadTab({ upload, disabled }: { upload: ReturnType<typeof usePairUpload>; disabled: boolean }) {
  return (
    <div className="pair-upload-tab">
      <div className="pair-upload-grid">
        {(["intro", "outro"] as const).map((kind) => (
          <section className="pair-video-input" key={kind}>
            <label htmlFor={`pair-video-${kind}`}>{kind === "intro" ? "Intro video" : "Outro video"}</label>
            <input
              key={`${kind}:${upload.inputVersion}`}
              id={`pair-video-${kind}`}
              type="file"
              accept="video/mp4,video/quicktime,.mp4,.mov"
              disabled={upload.uploading}
              onChange={(event) => void upload.select(kind, event.target.files?.[0] ?? null)}
            />
            {upload.probing[kind] ? (
              <span role="status">Inspecting video...</span>
            ) : upload.files[kind] ? (
              <span>{upload.files[kind]?.duration.toFixed(1)}s · 1080p</span>
            ) : null}
            {upload.errors[kind] ? (
              <span role="alert" className="pair-field-error">
                {upload.errors[kind]}
              </span>
            ) : null}
            <label className="pair-mute">
              <input
                type="checkbox"
                checked={upload.mute[kind]}
                disabled={upload.uploading}
                onChange={(event) => upload.setMuted(kind, event.target.checked)}
              />{" "}
              Mute audio
            </label>
          </section>
        ))}
      </div>
      <div className="pair-upload-actions">
        <span className="pair-file-constraint">1920×1080 · Up to 80 MB per video</span>
        <button
          type="button"
          className="primary-button"
          disabled={
            disabled || upload.uploading || upload.probing.intro || upload.probing.outro || !upload.files.intro || !upload.files.outro
          }
          onClick={() => void upload.submit()}
        >
          <UploadSimple size={18} />
          {upload.uploading ? "Uploading Pair..." : upload.uploaded ? "Refresh pairs" : "Upload Pair"}
        </button>
      </div>
      {upload.uploading ? (
        <div role="status">
          <progress aria-label="Uploading and processing pair" /> Uploading and processing
        </div>
      ) : null}
      {upload.error ? (
        <div role="alert" className="script-alert error">
          {upload.error}
        </div>
      ) : null}
    </div>
  );
}
