import type { MascotActionType, MascotStyle } from "@studio/shared";
import { useTranslation } from "../../../i18n";

export interface MascotActionSelectorProps {
  mascotAction: MascotActionType;
  setMascotAction: (action: MascotActionType) => void;
  mascotStyleId?: string | null;
  setMascotStyleId?: (styleId: string | null) => void;
  availableStyles?: MascotStyle[];
  activeStyle?: MascotStyle | null;
  selectedVariantIndex?: number | null;
  setSelectedVariantIndex?: (index: number | null) => void;
}

export function MascotActionSelector({
  mascotAction,
  setMascotAction,
  mascotStyleId,
  setMascotStyleId,
  availableStyles,
  activeStyle,
  selectedVariantIndex,
  setSelectedVariantIndex,
}: MascotActionSelectorProps) {
  const { t } = useTranslation();

  const isVariantEligible = mascotAction === "thinking" || mascotAction === "celebrate";
  const stateVariants = isVariantEligible
    ? (mascotAction === "thinking" ? activeStyle?.states?.thinking : activeStyle?.states?.celebrate) || []
    : [];
  const filledVariants = stateVariants.filter((v) => Boolean(v.image_url?.trim()));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Mascot Style Selector */}
      {availableStyles && availableStyles.length > 0 && (
        <div>
          <label
            htmlFor="sandbox-mascot-style-select"
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
            Mascot Style
          </label>
          <select
            id="sandbox-mascot-style-select"
            className="sandbox-select"
            aria-label="Mascot Style"
            value={mascotStyleId || activeStyle?.id || ""}
            onChange={(e) => setMascotStyleId?.(e.target.value || null)}
            style={{
              width: "100%",
              padding: "6px 10px",
              borderRadius: "var(--radius-sm)",
              fontSize: "12px",
              background: "var(--surface)",
              color: "var(--ink)",
              border: "1px solid var(--line)",
            }}
          >
            {availableStyles.map((style) => (
              <option key={style.id} value={style.id}>
                {style.name} {style.is_default ? "(Default)" : ""}
              </option>
            ))}
          </select>
        </div>
      )}

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

      {/* State Variants Selector for Thinking and Celebrate */}
      {isVariantEligible && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", padding: "10px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "8px",
            }}
          >
            <span
              style={{
                fontSize: "10.5px",
                fontWeight: 700,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {mascotAction === "thinking" ? "Thinking Variants" : "Celebrate Variants"}
            </span>
            <span style={{ fontSize: "10px", color: "var(--ink-secondary)" }}>
              {filledVariants.length} available
            </span>
          </div>

          {filledVariants.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(60px, 1fr))", gap: "6px" }}>
              {filledVariants.map((variant, idx) => {
                const isSelected = selectedVariantIndex === idx;
                return (
                  <button
                    key={variant.id || `variant-${idx}`}
                    type="button"
                    className={isSelected ? "primary-button compact" : "quiet-button compact"}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      padding: "4px 2px",
                      fontSize: "10px",
                      borderRadius: "6px",
                      border: isSelected ? "2px solid var(--accent)" : "1px solid var(--line)",
                      cursor: "pointer",
                    }}
                    onClick={() => setSelectedVariantIndex?.(idx)}
                    title={`Slot ${variant.slot_index}${variant.prompt_modifier ? `: ${variant.prompt_modifier}` : ""}`}
                  >
                    {variant.image_url ? (
                      <img
                        src={variant.image_url}
                        alt={`Slot ${variant.slot_index}`}
                        style={{
                          width: "32px",
                          height: "32px",
                          objectFit: "contain",
                          borderRadius: "4px",
                          marginBottom: "2px",
                        }}
                      />
                    ) : null}
                    <span style={{ fontWeight: 600 }}>Slot {variant.slot_index}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p style={{ fontSize: "11px", color: "var(--muted)", fontStyle: "italic", margin: 0 }}>
              No {mascotAction} variants generated for this style yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
