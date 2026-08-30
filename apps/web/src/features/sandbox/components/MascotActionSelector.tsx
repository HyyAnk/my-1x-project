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
    </>
  );
}
