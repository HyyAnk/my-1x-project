import { useTranslation } from "../../../../i18n";
import { OffsetControlGroup } from "./OffsetControlGroup";

export interface MascotOffsetSectionProps {
  mascotOffsetX: number;
  setMascotOffsetX: (offset: number | ((prev: number) => number)) => void;
  mascotOffsetY: number;
  setMascotOffsetY: (offset: number | ((prev: number) => number)) => void;
  onResetDefaultPlacement?: () => void;
}

export function MascotOffsetSection({
  mascotOffsetX,
  setMascotOffsetX,
  mascotOffsetY,
  setMascotOffsetY,
  onResetDefaultPlacement,
}: MascotOffsetSectionProps) {
  const { t } = useTranslation();

  return (
    <>
      <OffsetControlGroup label={t("visualSandbox.offsetXLabel")} value={mascotOffsetX} onChange={setMascotOffsetX} />

      <div style={{ height: "1px", background: "var(--line)" }} />

      <OffsetControlGroup label={t("visualSandbox.offsetYLabel")} value={mascotOffsetY} onChange={setMascotOffsetY} />

      {onResetDefaultPlacement && (
        <>
          <div style={{ height: "1px", background: "var(--line)" }} />
          <button
            type="button"
            className="quiet-button compact"
            style={{ width: "100%", fontSize: "11px", justifyContent: "center" }}
            onClick={onResetDefaultPlacement}
          >
            {t("visualSandbox.resetPresetDefault")}
          </button>
        </>
      )}
    </>
  );
}
