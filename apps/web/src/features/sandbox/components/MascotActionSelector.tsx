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

  const activeCoreAction: "thinking" | "celebrate" = mascotAction === "celebrate" ? "celebrate" : "thinking";
  const stateVariants = (activeCoreAction === "celebrate" ? activeStyle?.states?.celebrate : activeStyle?.states?.thinking) || [];
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

      {/* Mascot Pose / Action: 2-state segmented control */}
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
        <div
          role="group"
          aria-label={t("visualSandbox.mascotPoseSection")}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "8px",
            background: "var(--surface-sunken, rgba(0, 0, 0, 0.04))",
            padding: "4px",
            borderRadius: "var(--radius-md, 8px)",
            border: "1px solid var(--line)",
          }}
        >
          {(
            [
              { id: "thinking" as const, label: t("visualSandbox.poseThinking"), icon: "🤔" },
              { id: "celebrate" as const, label: t("visualSandbox.poseCelebrate"), icon: "🎉" },
            ] as const
          ).map((act) => {
            const isSelected = activeCoreAction === act.id;
            return (
              <button
                key={act.id}
                type="button"
                className={isSelected ? "primary-button compact" : "quiet-button compact"}
                style={{
                  fontSize: "11.5px",
                  fontWeight: isSelected ? 700 : 500,
                  padding: "8px 12px",
                  justifyContent: "center",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onClick={() => setMascotAction(act.id)}
              >
                <span aria-hidden="true">{act.icon}</span>
                <span>{act.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* State Variants Selector (slots 1..10) */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-sm)",
          padding: "10px",
        }}
      >
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
            {activeCoreAction === "thinking" ? "Thinking Variants" : "Celebrate Variants"}
          </span>
          <span style={{ fontSize: "10px", color: "var(--ink-secondary)" }}>{filledVariants.length} available</span>
        </div>

        {filledVariants.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))",
              gap: "8px",
            }}
          >
            {filledVariants.map((variant, idx) => {
              const isSelected = selectedVariantIndex === idx;
              return (
                <button
                  key={variant.id || `variant-${idx}`}
                  type="button"
                  className={isSelected ? "primary-button compact" : "quiet-button compact"}
                  style={{
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "6px 4px",
                    minHeight: "68px",
                    borderRadius: "8px",
                    border: isSelected ? "2px solid var(--accent)" : "1px solid var(--line)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    boxShadow: isSelected ? "0 2px 8px var(--accent-glow, rgba(99, 102, 241, 0.25))" : "none",
                  }}
                  onClick={() => setSelectedVariantIndex?.(idx)}
                  title={`Slot ${variant.slot_index}${variant.prompt_modifier ? `: ${variant.prompt_modifier}` : ""}`}
                >
                  {isSelected && (
                    <span
                      style={{
                        position: "absolute",
                        top: "2px",
                        right: "2px",
                        width: "14px",
                        height: "14px",
                        borderRadius: "50%",
                        background: "var(--accent, #6366f1)",
                        color: "#ffffff",
                        fontSize: "9px",
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
                      }}
                      aria-label="Active slot selection"
                    >
                      ✓
                    </span>
                  )}
                  {variant.image_url ? (
                    <img
                      src={variant.image_url}
                      alt={`Slot ${variant.slot_index}`}
                      style={{
                        width: "36px",
                        height: "36px",
                        objectFit: "contain",
                        borderRadius: "4px",
                        marginBottom: "4px",
                      }}
                    />
                  ) : null}
                  <span style={{ fontWeight: 600, fontSize: "10.5px" }}>Slot {variant.slot_index}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <p style={{ fontSize: "11px", color: "var(--muted)", fontStyle: "italic", margin: 0 }}>
            No {activeCoreAction} variants generated for this style yet.
          </p>
        )}
      </div>
    </div>
  );
}
