import type { MascotPublishedAnimationAsset, resolveAnimationFrameAtTime } from "@studio/shared";

export interface FrameReadoutBadgeProps {
  resolvedFrame: NonNullable<ReturnType<typeof resolveAnimationFrameAtTime>>;
  animation?: MascotPublishedAnimationAsset | null;
}

export function FrameReadoutBadge({
  resolvedFrame,
  animation,
}: FrameReadoutBadgeProps) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: "12px",
        left: "12px",
        background: "rgba(15, 23, 42, 0.8)",
        backdropFilter: "blur(6px)",
        padding: "4px 10px",
        borderRadius: "6px",
        fontSize: "11px",
        fontWeight: 700,
        color: "#cbd5e1",
        fontFamily: "monospace",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      Frame {resolvedFrame.frameIndex + 1} / {animation?.frame_count ?? 12}
      {resolvedFrame.isClamped ? " (Clamped)" : ""}
      {animation?.duration_ms ? ` • ${(animation.duration_ms / 1000).toFixed(1)}s` : ""}
    </div>
  );
}
