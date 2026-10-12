import { UploadSimple } from "@phosphor-icons/react";
import type { QuizShortBookendKind } from "@studio/shared";
import { useShortBookendUpload } from "../hooks/useShortBookendUpload";

type Props = {
  channelId: string;
  stylePresetId: string;
  onUploaded: () => Promise<void>;
};

const CLIP_LABELS: Record<QuizShortBookendKind, { label: string; hint: string }> = {
  intro: {
    label: "Intro loop",
    hint: "Always muted. Plays behind the quiz title while the voice reads it; BGM starts on frame 0.",
  },
  outro: {
    label: "Outro",
    hint: "Plays in full after the last question with no voice. BGM continues and fades out by the end.",
  },
};

/** Upload form for one portrait Short intro/outro pair in the selected style. */
export function ShortBookendUploadCard({ channelId, stylePresetId, onUploaded }: Props) {
  const upload = useShortBookendUpload(channelId, stylePresetId, onUploaded);
  return (
    <article className="short-bookend-upload-card" aria-label="New Short pair">
      <h3>New Short Pair</h3>
      <div className="short-bookend-upload-grid">
        {(["intro", "outro"] as const).map((kind) => (
          <section className="short-bookend-video-input" key={kind}>
            <label htmlFor={`short-bookend-${kind}`}>{CLIP_LABELS[kind].label}</label>
            <input
              key={`${kind}:${upload.inputVersion}`}
              id={`short-bookend-${kind}`}
              type="file"
              accept="video/mp4,video/quicktime,.mp4,.mov"
              disabled={upload.uploading}
              onChange={(event) => void upload.select(kind, event.target.files?.[0] ?? null)}
            />
            <small>{CLIP_LABELS[kind].hint}</small>
            {upload.probing[kind] ? <span role="status">Inspecting video...</span> : null}
            {upload.files[kind] ? <span>{upload.files[kind]?.duration.toFixed(1)}s · 1080×1920</span> : null}
            {upload.errors[kind] ? (
              <span role="alert" className="short-bookend-field-error">
                {upload.errors[kind]}
              </span>
            ) : null}
          </section>
        ))}
      </div>
      <label className="short-bookend-checkbox">
        <input
          type="checkbox"
          checked={upload.keepOutroAudio}
          disabled={upload.uploading}
          onChange={(event) => upload.setKeepOutroAudio(event.target.checked)}
        />{" "}
        Keep the outro's own audio under the BGM
      </label>
      <div className="short-bookend-upload-actions">
        <span className="short-bookend-constraint">1080×1920 portrait · Up to 80 MB per video</span>
        <button type="button" className="primary-button" disabled={!upload.canSubmit} onClick={() => void upload.submit()}>
          <UploadSimple size={18} />
          {upload.uploading ? "Uploading Pair..." : "Upload Pair"}
        </button>
      </div>
      {upload.uploading ? (
        <div role="status">
          <progress aria-label="Uploading and processing pair" /> Uploading and processing
        </div>
      ) : null}
      {upload.error ? (
        <div role="alert" className="short-bookend-field-error">
          {upload.error}
        </div>
      ) : null}
    </article>
  );
}
