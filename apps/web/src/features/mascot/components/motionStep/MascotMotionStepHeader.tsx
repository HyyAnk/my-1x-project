import { ArrowLeft, CheckCircle, CircleNotch } from "@phosphor-icons/react";

export interface MascotMotionStepHeaderProps {
  onBackStep: () => void;
  readyCount: number;
  totalCount?: number;
  busyAction?: string | null;
  onFinishMascot?: () => void;
}

export function MascotMotionStepHeader({
  onBackStep,
  readyCount,
  totalCount = 20,
  busyAction,
  onFinishMascot,
}: MascotMotionStepHeaderProps) {
  const isAllReady = readyCount === totalCount;
  const isBusyFinishing = busyAction === "finish";

  return (
    <div
      className="step4-header-banner"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "12px",
        padding: "14px 18px",
        background: "var(--surface, #1e293b)",
        border: "1px solid var(--line, rgba(255,255,255,0.08))",
        borderRadius: "var(--radius, 12px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button
          type="button"
          className="quiet-button compact"
          onClick={onBackStep}
          title="Back to Step 3 (Animation Processing)"
          aria-label="Back to Step 3"
        >
          <ArrowLeft size={16} />
          <span>Back to Step 3</span>
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "var(--ink)" }}>Step 4: Motion and Animation Preview</h2>
          <span style={{ fontSize: "11.5px", color: "var(--muted)" }}>Manifest-driven frame playback & 16:9 quiz stage placement</span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span
          style={{
            padding: "4px 12px",
            borderRadius: "999px",
            fontSize: "12px",
            fontWeight: 700,
            background: isAllReady ? "rgba(34, 197, 94, 0.15)" : "rgba(255, 255, 255, 0.08)",
            color: isAllReady ? "#22c55e" : "var(--muted)",
            border: "1px solid var(--line, rgba(255,255,255,0.1))",
          }}
          data-testid="ready-count-badge"
        >
          {readyCount}/{totalCount} Animations Ready
        </span>

        <button
          type="button"
          className="primary-button"
          style={{ padding: "8px 18px", fontSize: "13px", fontWeight: 700 }}
          disabled={isBusyFinishing}
          onClick={onFinishMascot}
          data-testid="finish-mascot-btn"
        >
          {isBusyFinishing ? <CircleNotch className="spin" size={15} /> : <CheckCircle size={15} weight="fill" />}
          <span>Finish Mascot</span>
        </button>
      </div>
    </div>
  );
}
