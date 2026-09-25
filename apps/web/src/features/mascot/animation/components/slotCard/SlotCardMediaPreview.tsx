import { type AnimationState, type MascotSlotProjection, isMockFixtureIdentifier } from "@studio/shared";

export interface SlotCardMediaPreviewProps {
  mascotId: string;
  styleId: string;
  state: AnimationState;
  slotIndex: number;
  projection?: MascotSlotProjection | null;
  sourceImageUrl?: string | null;
}

export function SlotCardMediaPreview({ mascotId, styleId, state, slotIndex, projection, sourceImageUrl }: SlotCardMediaPreviewProps) {
  const rawVideoUrl = projection?.active_revision?.transparent_video_url;
  const videoUrl = rawVideoUrl && !isMockFixtureIdentifier(rawVideoUrl) ? rawVideoUrl : null;

  const activeRevision = projection?.active_revision;
  const previewArtifactUrl = `/api/mascots/${encodeURIComponent(mascotId)}/styles/${encodeURIComponent(styleId)}/animations/${state}/${slotIndex}/artifacts/preview.png${activeRevision ? `?attempt=${activeRevision.attempt}` : ""}`;

  return (
    <div className="anim-slot-preview-box">
      {videoUrl ? (
        <video
          key={`${videoUrl}:${projection?.active_revision_id ?? activeRevision?.id}`}
          src={videoUrl}
          autoPlay
          loop
          muted
          playsInline
          className="anim-slot-preview-video"
          data-testid={`anim-video-${state}-${slotIndex}`}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
          aria-label={`${state} slot ${slotIndex} video preview`}
        />
      ) : (
        <img
          key={previewArtifactUrl}
          src={previewArtifactUrl}
          alt={`${state} slot ${slotIndex} preview`}
          className="anim-slot-preview-img"
          loading="lazy"
          onError={(e) => {
            if (sourceImageUrl && e.currentTarget.src !== sourceImageUrl) {
              e.currentTarget.src = sourceImageUrl;
            } else {
              e.currentTarget.style.display = "none";
            }
          }}
        />
      )}
      {sourceImageUrl ? (
        <div className="anim-step2-ref-badge" title="Step 2 Source Reference">
          <img src={sourceImageUrl} alt="Source Reference" className="anim-step2-ref-img" />
        </div>
      ) : null}
      {activeRevision?.duration_ms ? (
        <span
          className="anim-duration-tag"
          style={{
            position: "absolute",
            bottom: "6px",
            left: "6px",
            background: "rgba(15, 23, 42, 0.85)",
            padding: "2px 6px",
            borderRadius: "4px",
            fontSize: "10px",
            fontFamily: "monospace",
            color: "#38bdf8",
            fontWeight: 700,
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {(activeRevision.duration_ms / 1000).toFixed(1)}s • {activeRevision.playback_fps} FPS
        </span>
      ) : null}
    </div>
  );
}
