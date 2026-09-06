import type { MascotActionType, MascotProfile, MascotStateVariant, MascotStyle } from "@studio/shared";
import { Stack } from "@phosphor-icons/react";
import { useTranslation } from "../../../i18n";
import { getLocalizedActionMeta, MOTION_PRESETS, type MascotMotionPreset } from "../constants";

export type MascotVariantPanelProps = {
  editingMascot: MascotProfile | null;
  activeStyle: MascotStyle | null;
  previewStyleId: string | null;
  onPreviewStyleChange: (styleId: string | null) => void;
  activePreviewAction: MascotActionType;
  variants: MascotStateVariant[];
  activeVariantIndex: number;
  onSelectVariantIndex: (index: number) => void;
};

function getVariantMotionBadge(preset: MascotMotionPreset | undefined): string | null {
  if (!preset || preset === "none") return null;
  return MOTION_PRESETS.find((p) => p.id === preset)?.label ?? preset;
}

export function MascotVariantPanel({
  editingMascot,
  activeStyle,
  previewStyleId,
  onPreviewStyleChange,
  activePreviewAction,
  variants,
  activeVariantIndex,
  onSelectVariantIndex,
}: MascotVariantPanelProps) {
  const { t } = useTranslation();
  const actionMeta = getLocalizedActionMeta(activePreviewAction, t);
  const styles = editingMascot?.styles || [];

  return (
    <div className="motion-controls-card motion-variant-card">
      <div className="motion-controls-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Stack size={14} weight="fill" style={{ color: "var(--accent)" }} />
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>
              {t("mascots.variantPanelTitle", { action: actionMeta.label.split(" ")[0] })}
            </h3>
          </div>
          <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: "var(--muted)" }}>{t("mascots.variantPanelSub")}</p>
        </div>
        <span className="action-ready-badge" style={{ fontSize: "11px" }}>
          {t("mascots.variantsAvailableCount", { count: variants.length })}
        </span>
      </div>

      <div className="motion-controls-body">
        {styles.length > 0 && (
          <div>
            <label className="motion-section-title" htmlFor="motion-style-select">
              <span>{t("mascots.variantStyleLabel")}</span>
              <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted)" }}>{activeStyle?.name}</span>
            </label>
            <select
              id="motion-style-select"
              className="motion-style-select"
              value={previewStyleId || activeStyle?.id || ""}
              onChange={(e) => onPreviewStyleChange(e.target.value || null)}
            >
              {styles.map((style) => (
                <option key={style.id} value={style.id}>
                  {style.name}
                  {style.is_default ? ` (${t("mascots.variantDefaultStyleSuffix")})` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {variants.length > 0 ? (
          <div className="motion-variant-grid">
            {variants.map((variant, idx) => {
              const isSelected = activeVariantIndex === idx;
              const motionBadge = getVariantMotionBadge(variant.motion_preset);
              return (
                <button
                  key={variant.id || `variant-${idx}`}
                  type="button"
                  className={`motion-variant-card-btn ${isSelected ? "is-selected" : ""}`}
                  onClick={() => onSelectVariantIndex(idx)}
                  title={variant.prompt_modifier || `Slot ${variant.slot_index}`}
                >
                  <span className="motion-variant-thumb">
                    <img src={variant.image_url} alt={`Slot ${variant.slot_index}`} loading="lazy" />
                  </span>
                  <span className="motion-variant-slot">Slot {variant.slot_index}</span>
                  {motionBadge && <span className="motion-variant-motion">{motionBadge}</span>}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="motion-variant-empty">{t("mascots.variantEmptyHint", { action: actionMeta.label.split(" ")[0] })}</p>
        )}
      </div>
    </div>
  );
}
