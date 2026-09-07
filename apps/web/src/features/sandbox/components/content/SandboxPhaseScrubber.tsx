import { useTranslation } from "../../../../i18n";

export type SandboxPhase = "question" | "choices" | "thinking" | "reveal" | "explain";

export interface SandboxPhaseScrubberProps {
  phase: string;
  setPhase: (phase: SandboxPhase) => void;
  setUseScrubber: (use: boolean) => void;
  useScrubber?: boolean;
}

const PHASES: Array<{ id: SandboxPhase; labelKey: string; defaultLabel: string }> = [
  { id: "question", labelKey: "visualSandbox.phaseQuestion", defaultLabel: "Question" },
  { id: "choices", labelKey: "visualSandbox.phaseChoices", defaultLabel: "Choices" },
  { id: "thinking", labelKey: "visualSandbox.phaseThinking", defaultLabel: "Thinking" },
  { id: "reveal", labelKey: "visualSandbox.phaseReveal", defaultLabel: "Reveal" },
  { id: "explain", labelKey: "visualSandbox.phaseExplain", defaultLabel: "Explain" },
];

export function SandboxPhaseScrubber({
  phase,
  setPhase,
  setUseScrubber,
  useScrubber = false,
}: SandboxPhaseScrubberProps) {
  const { t } = useTranslation();

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
        <label
          style={{
            display: "block",
            fontSize: "11px",
            fontWeight: 700,
            color: "var(--muted)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {t("visualSandbox.phaseLabel") || "Phase"}
        </label>
        <button
          type="button"
          className={useScrubber ? "primary-button compact" : "quiet-button compact"}
          style={{ fontSize: "10px", padding: "2px 6px" }}
          onClick={() => setUseScrubber(!useScrubber)}
          title="Toggle Timeline Scrubber Mode"
        >
          {useScrubber ? "● Scrubber Active" : "○ Enable Scrubber"}
        </button>
      </div>

      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {PHASES.map((p) => {
          const isActive = !useScrubber && phase === p.id;
          return (
            <button
              key={p.id}
              type="button"
              className={isActive ? "primary-button compact" : "quiet-button compact"}
              style={{
                fontSize: "11px",
                padding: "4px 8px",
                fontWeight: isActive ? 700 : 500,
              }}
              onClick={() => {
                setPhase(p.id);
                setUseScrubber(false);
              }}
            >
              {t(p.labelKey) || p.defaultLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}
