import { Sparkle } from "@phosphor-icons/react";
import type { MascotActionType } from "@studio/shared";
import { useTranslation } from "../../../i18n";

export interface MascotActionSelectorProps {
  mascotAction: MascotActionType;
  setMascotAction: (action: MascotActionType) => void;
}

export function MascotActionSelector({ mascotAction, setMascotAction }: MascotActionSelectorProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* Mascot Pose / Action */}
      <div>
        <label
          style={{
            display: "block",
            fontSize: "11px",
            fontWeight: 700,
            color: "var(--muted)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: "6px",
          }}
        >
          {t("visualSandbox.mascotPoseSection")}
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
          {(
            [
              { id: "thinking", label: t("visualSandbox.poseThinking") },
              { id: "celebrate", label: t("visualSandbox.poseCelebrate") },
              { id: "point", label: t("visualSandbox.posePoint") },
              { id: "oops", label: t("visualSandbox.poseOops") },
              { id: "idle", label: t("visualSandbox.poseIdle") },
              { id: "wave", label: t("visualSandbox.poseWave") },
            ] as const
          ).map((act) => {
            const isSelected = mascotAction === act.id;
            return (
              <button
                key={act.id}
                type="button"
                className={isSelected ? "primary-button compact" : "quiet-button compact"}
                style={{ fontSize: "10.5px", padding: "6px 4px", justifyContent: "center" }}
                onClick={() => setMascotAction(act.id)}
              >
                {act.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Animation Status Badge */}
      <div
        style={{
          padding: "8px 12px",
          borderRadius: "10px",
          background: "rgba(56, 189, 248, 0.08)",
          border: "1px solid rgba(56, 189, 248, 0.25)",
          fontSize: "11px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <Sparkle size={14} weight="fill" style={{ color: "#38BDF8" }} />
        <span>
          {t("visualSandbox.liveMotionLabel")} <strong>{mascotAction.toUpperCase()}</strong>{" "}
          <span style={{ color: "var(--muted)" }}>
            (
            {mascotAction === "thinking"
              ? t("visualSandbox.motionThinkingDesc")
              : mascotAction === "celebrate"
                ? t("visualSandbox.motionCelebrateDesc")
                : mascotAction === "point"
                  ? t("visualSandbox.motionPointDesc")
                  : mascotAction === "oops"
                    ? t("visualSandbox.motionOopsDesc")
                    : mascotAction === "wave"
                      ? t("visualSandbox.motionWaveDesc")
                      : t("visualSandbox.motionIdleDesc")}
            )
          </span>
        </span>
      </div>
    </>
  );
}
