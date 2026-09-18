import { CheckCircle, WarningCircle, ArrowRight } from "@phosphor-icons/react";
import type { AnimationState, MascotSlotProjection } from "@studio/shared";

export interface Step4SlotDetailsProps {
  state: AnimationState;
  slotIndex: number;
  slot?: MascotSlotProjection;
  onGoToStep3?: () => void;
}

export function Step4SlotDetails({ state, slotIndex, slot, onGoToStep3 }: Step4SlotDetailsProps) {
  const revision = slot?.active_revision;
  const status = slot?.status ?? "empty";
  const isReady = status === "ready";

  return (
    <div
      className="step4-slot-details"
      data-testid="step4-slot-details"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        padding: "16px",
        background: "var(--surface, rgba(255,255,255,0.03))",
        border: "1px solid var(--line, rgba(255,255,255,0.08))",
        borderRadius: "var(--radius, 10px)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--ink)" }}>
            Slot #{slotIndex} ({state === "thinking" ? "Thinking" : "Celebrate"})
          </h4>
          <span style={{ fontSize: "11px", color: "var(--muted)" }}>Sequence & Registration Metadata</span>
        </div>

        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "11px",
            fontWeight: 700,
            padding: "3px 8px",
            borderRadius: "999px",
            background: isReady ? "rgba(34, 197, 94, 0.15)" : "rgba(255, 255, 255, 0.08)",
            color: isReady ? "#22c55e" : "var(--muted)",
            border: isReady ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid var(--line)",
            textTransform: "capitalize",
          }}
        >
          {isReady ? <CheckCircle size={12} weight="fill" /> : null}
          <span>{status.replace("_", " ")}</span>
        </span>
      </div>

      {isReady && revision ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
              fontSize: "11.5px",
            }}
          >
            <div style={{ padding: "8px", background: "rgba(0,0,0,0.2)", borderRadius: "6px" }}>
              <span style={{ color: "var(--muted)", display: "block" }}>Frames & FPS</span>
              <strong style={{ color: "var(--ink)" }}>
                {revision.frame_count} frames @ {revision.playback_fps} FPS
              </strong>
            </div>

            <div style={{ padding: "8px", background: "rgba(0,0,0,0.2)", borderRadius: "6px" }}>
              <span style={{ color: "var(--muted)", display: "block" }}>Loop Mode</span>
              <strong style={{ color: "var(--ink)" }}>
                {revision.loop_mode} ({revision.duration_ms}ms)
              </strong>
            </div>

            <div style={{ padding: "8px", background: "rgba(0,0,0,0.2)", borderRadius: "6px" }}>
              <span style={{ color: "var(--muted)", display: "block" }}>Canvas Dimensions</span>
              <strong style={{ color: "var(--ink)" }}>
                {revision.canvas?.width ?? 1280} × {revision.canvas?.height ?? 720}
              </strong>
            </div>

            <div style={{ padding: "8px", background: "rgba(0,0,0,0.2)", borderRadius: "6px" }}>
              <span style={{ color: "var(--muted)", display: "block" }}>Pivot Point</span>
              <strong style={{ color: "var(--ink)" }}>
                ({revision.pivot?.x ?? 0}, {revision.pivot?.y ?? 0})
              </strong>
            </div>

            {revision.transparent_video_url ? (
              <div style={{ padding: "8px", background: "rgba(0,0,0,0.2)", borderRadius: "6px", gridColumn: "1 / -1" }}>
                <span style={{ color: "var(--muted)", display: "block" }}>Format</span>
                <strong style={{ color: "#38bdf8" }}>Transparent WebM (VP9 Alpha)</strong>
              </div>
            ) : null}
          </div>

          <div
            style={{
              padding: "8px",
              background: "rgba(0,0,0,0.2)",
              borderRadius: "6px",
              fontSize: "10.5px",
              color: "var(--muted)",
              fontFamily: "monospace",
              wordBreak: "break-all",
            }}
          >
            Fingerprint: {revision.processing_fingerprint.slice(0, 24)}...
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            padding: "14px",
            background: "rgba(234, 179, 8, 0.08)",
            border: "1px dashed rgba(234, 179, 8, 0.3)",
            borderRadius: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#eab308" }}>
            <WarningCircle size={16} />
            <span style={{ fontSize: "12px", fontWeight: 600 }}>Animation Not Yet Processed</span>
          </div>
          <p style={{ margin: 0, fontSize: "11.5px", color: "var(--muted)", lineHeight: 1.4 }}>
            This slot does not have an approved animation revision yet. Upload and process a 16:9 720p video (4–10s) in Step 3.
          </p>
          {onGoToStep3 && (
            <button
              type="button"
              className="primary-button compact"
              style={{ alignSelf: "flex-start", fontSize: "11.5px" }}
              onClick={onGoToStep3}
            >
              <span>Go to Step 3</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
