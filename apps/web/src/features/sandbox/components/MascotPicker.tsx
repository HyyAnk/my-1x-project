import { X } from "@phosphor-icons/react";
import type { MascotProfile } from "@studio/shared";
import { useTranslation } from "../../../i18n";

export interface MascotPickerProps {
  mascots: MascotProfile[];
  mascotId: string;
  setMascotId: (id: string) => void;
  mascotEnabled: boolean;
  setMascotEnabled: (enabled: boolean | ((prev: boolean) => boolean)) => void;
}

export function MascotPicker({ mascots, mascotId, setMascotId, mascotEnabled, setMascotEnabled }: MascotPickerProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* Mascot Enable Toggle */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong style={{ fontSize: "12px" }}>{t("visualSandbox.mascotVisibilityTitle")}</strong>
        <button
          type="button"
          className={mascotEnabled && mascotId !== "none" ? "primary-button compact" : "quiet-button compact"}
          style={{ fontSize: "11px", padding: "4px 12px" }}
          onClick={() => {
            if (!mascotEnabled || mascotId === "none") {
              if (mascotId === "none" && mascots.length > 0) {
                setMascotId(mascots[0].id);
              }
              setMascotEnabled(true);
            } else {
              setMascotEnabled(false);
            }
          }}
        >
          {mascotEnabled && mascotId !== "none" ? t("visualSandbox.mascotEnabledBadge") : t("visualSandbox.mascotDisabledBadge")}
        </button>
      </div>

      <div style={{ height: "1px", background: "var(--line)" }} />

      {/* Real Mascot Picker */}
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
          {t("visualSandbox.mascotPickerSection")}
        </label>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "180px", overflowY: "auto" }}>
          {/* None Option */}
          <button
            type="button"
            onClick={() => {
              setMascotId("none");
              setMascotEnabled(false);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 10px",
              borderRadius: "10px",
              background: mascotId === "none" || !mascotEnabled ? "var(--soft-accent)" : "var(--surface-strong)",
              border: mascotId === "none" || !mascotEnabled ? "2px solid var(--accent)" : "1px solid var(--line)",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "rgba(255,255,255,0.06)",
                display: "grid",
                placeItems: "center",
                color: "var(--muted)",
              }}
            >
              <X size={16} weight="bold" />
            </div>
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: "11.5px", color: mascotId === "none" || !mascotEnabled ? "var(--accent)" : "var(--text)" }}>
                {t("visualSandbox.noMascotTitle")}
              </strong>
            </div>
          </button>

          {/* Empty Mascots Hint */}
          {mascots.length === 0 && (
            <div style={{ padding: "8px 10px", fontSize: "11px", color: "var(--muted)", fontStyle: "italic" }}>
              {t("visualSandbox.noMascotsInLibrary")}
            </div>
          )}

          {/* Real Mascots from Library */}
          {mascots.map((m) => {
            const isSelected = mascotId === m.id && mascotEnabled;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setMascotId(m.id);
                  setMascotEnabled(true);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 10px",
                  borderRadius: "10px",
                  background: isSelected ? "var(--soft-accent)" : "var(--surface-strong)",
                  border: isSelected ? "2px solid var(--accent)" : "1px solid var(--line)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                {m.master_image_url ? (
                  <img
                    src={m.master_image_url}
                    alt={m.name}
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      objectFit: "cover",
                      background: "rgba(0,0,0,0.2)",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      background: m.color_theme || "var(--accent)",
                      display: "grid",
                      placeItems: "center",
                      color: "#FFF",
                      fontWeight: 900,
                    }}
                  >
                    {m.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong
                    style={{
                      display: "block",
                      fontSize: "11.5px",
                      color: isSelected ? "var(--accent)" : "var(--text)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {m.name}
                  </strong>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
