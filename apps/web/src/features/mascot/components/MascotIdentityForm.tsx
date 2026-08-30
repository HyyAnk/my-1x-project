import { Check } from "@phosphor-icons/react";
import type { QuizImageStyle } from "@studio/shared";
import { useTranslation } from "../../../i18n";
import { COLOR_PRESETS, STYLE_OPTIONS } from "../constants";

export interface MascotIdentityFormProps {
  genName: string;
  setGenName: (name: string) => void;
  genColor: string;
  setGenColor: (color: string) => void;
  genStyle: QuizImageStyle;
  setGenStyle: (style: QuizImageStyle) => void;
}

export function MascotIdentityForm({
  genName,
  setGenName,
  genColor,
  setGenColor,
  genStyle,
  setGenStyle,
}: MascotIdentityFormProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* Mascot Name & Color Palette Row */}
      <div className="identity-top-row">
        <div className="form-group flex-1">
          <label htmlFor="mascot-name">
            {t("mascots.nameLabel")} <span style={{ color: "var(--coral)" }}>*</span>
          </label>
          <input
            id="mascot-name"
            type="text"
            className="identity-name-input"
            placeholder={t("mascots.namePlaceholder")}
            value={genName}
            onChange={(e) => setGenName(e.target.value)}
          />
        </div>

        <div className="form-group color-palette-form-group">
          <label htmlFor="mascot-color">{t("mascots.colorLabel")}</label>
          <div className="color-palette-wrap">
            <div className="color-swatches-row">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.hex}
                  type="button"
                  className={`color-swatch-btn ${genColor.toLowerCase() === preset.hex.toLowerCase() ? "is-selected" : ""}`}
                  style={{ backgroundColor: preset.hex }}
                  onClick={() => setGenColor(preset.hex)}
                  title={`${preset.name} (${preset.hex})`}
                  aria-label={preset.name}
                >
                  {genColor.toLowerCase() === preset.hex.toLowerCase() ? <Check size={12} weight="bold" color="#fff" /> : null}
                </button>
              ))}
            </div>
            <div className="custom-color-input-wrap">
              <input
                id="mascot-color"
                type="color"
                value={genColor}
                onChange={(e) => setGenColor(e.target.value)}
                className="native-color-picker"
                title={t("mascots.customColorPicker")}
              />
              <input
                type="text"
                value={genColor}
                onChange={(e) => setGenColor(e.target.value)}
                placeholder="#06b6d4"
                className="color-hex-input"
                maxLength={7}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Visual Style Selector Cards */}
      <div className="form-group" style={{ marginTop: "14px" }}>
        <label>{t("mascots.styleLabel")}</label>
        <div className="visual-style-selector-grid">
          {STYLE_OPTIONS.map((opt) => {
            const isSelected = genStyle === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                className={`visual-style-card ${isSelected ? "is-selected" : ""}`}
                style={isSelected ? { borderColor: genColor, backgroundColor: `${genColor}15` } : undefined}
                onClick={() => setGenStyle(opt.id)}
              >
                <span className="style-card-title">{opt.title}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
