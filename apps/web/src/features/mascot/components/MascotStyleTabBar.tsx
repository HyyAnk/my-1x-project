import { PaintBrush, Sparkle } from "@phosphor-icons/react";
import {
  type MascotProfile,
  type MascotStyle,
  getMascotStyleReadiness,
} from "@studio/shared";
import { useTranslation } from "../../../i18n";

export type MascotStyleTabBarProps = {
  allStyles: MascotStyle[];
  activeStyleId: string;
  resolvedActiveStyle: MascotStyle | null;
  editingMascot: MascotProfile | null;
  isBatchBusy: boolean;
  busySlotKey: string | null;
  onSelectStyle: (styleId: string) => void;
  onManageStyles: () => void;
};

export function MascotStyleTabBar({
  allStyles,
  resolvedActiveStyle,
  editingMascot,
  isBatchBusy,
  busySlotKey,
  onSelectStyle,
  onManageStyles,
}: MascotStyleTabBarProps) {
  const { t } = useTranslation();

  return (
    <div className="mascot-style-tabs-container">
      <div className="mascot-style-tabs-scroll" role="tablist" aria-label="Mascot Styles">
        {allStyles.map((style) => {
          const isSelected = style.id === resolvedActiveStyle?.id;
          const count =
            (style.states?.thinking?.filter((v) => Boolean(v.image_url)).length || 0) +
            (style.states?.celebrate?.filter((v) => Boolean(v.image_url)).length || 0);
          const isCore = style.id === "core" || Boolean(style.is_default);
          const effectiveAnchor =
            style.anchor_image_url || (isCore ? editingMascot?.master_image_url : null);
          const readiness = getMascotStyleReadiness({
            ...style,
            anchor_image_url: effectiveAnchor || undefined,
          });

          return (
            <button
              key={style.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              className={`mascot-style-tab ${isSelected ? "is-active" : ""} is-readiness-${readiness}`}
              onClick={() => onSelectStyle(style.id)}
            >
              <PaintBrush size={14} weight={isSelected ? "fill" : "regular"} />
              <span className="style-tab-title">
                {style.is_default || style.id === "core" ? "Core Style (Default)" : style.name}
              </span>
              <span className={`style-tab-count-pill is-readiness-${readiness}`}>{count}/20</span>
            </button>
          );
        })}

        <button
          type="button"
          className="mascot-style-tab-manage"
          onClick={onManageStyles}
          disabled={isBatchBusy || busySlotKey !== null}
          title={t("mascots.manageStylesInConceptTooltip")}
        >
          <Sparkle size={13} weight="fill" />
          <span>{t("mascots.manageStylesInConcept")}</span>
        </button>
      </div>
    </div>
  );
}
