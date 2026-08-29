import { FloppyDisk, Trash } from "@phosphor-icons/react";
import { useTranslation } from "../../../i18n";
import type { VisualPresetItem } from "../hooks/useSandboxPresets";

export interface SandboxPresetSelectorProps {
  allPresets: VisualPresetItem[];
  builtInPresets: VisualPresetItem[];
  customPresets: VisualPresetItem[];
  matchedPreset?: VisualPresetItem | null;
  activeCustomPreset?: VisualPresetItem | null;
  onLoadPreset: (preset: VisualPresetItem) => void;
  onOpenSaveModal: () => void;
  onDeleteCustomPreset: (id: string) => void;
}

export function SandboxPresetSelector({
  allPresets,
  builtInPresets,
  customPresets,
  matchedPreset,
  activeCustomPreset,
  onLoadPreset,
  onOpenSaveModal,
  onDeleteCustomPreset,
}: SandboxPresetSelectorProps) {
  const { t } = useTranslation();

  return (
    <div
      style={{
        background: "var(--surface-strong)",
        padding: "12px",
        borderRadius: "12px",
        border: "1px solid var(--line)",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <label
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "var(--muted)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {t("visualSandbox.stylePresetsLabel")}
        </label>
        <span style={{ fontSize: "11px", color: "var(--muted)" }}>{t("visualSandbox.presetsCount", { count: allPresets.length })}</span>
      </div>

      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
        <select
          value={matchedPreset ? matchedPreset.id : "__custom_modified__"}
          onChange={(e) => {
            const selected = allPresets.find((p) => p.id === e.target.value);
            if (selected) onLoadPreset(selected);
          }}
          style={{
            flex: 1,
            minWidth: 0,
            height: "36px",
            padding: "0 10px",
            background: "var(--surface)",
            color: "var(--text)",
            border: "1px solid var(--line)",
            borderRadius: "8px",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            outline: "none",
          }}
        >
          <optgroup label={t("visualSandbox.presetBuiltInGroup")}>
            {builtInPresets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </optgroup>
          {customPresets.length > 0 && (
            <optgroup label={t("visualSandbox.presetCustomGroup")}>
              {customPresets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </optgroup>
          )}
          {!matchedPreset && (
            <option value="__custom_modified__" disabled>
              ({t("visualSandbox.presetModifiedBadge")})
            </option>
          )}
        </select>

        <button
          type="button"
          className="quiet-button compact"
          onClick={onOpenSaveModal}
          title={t("visualSandbox.savePresetTooltip")}
          style={{ height: "36px", padding: "0 10px", borderRadius: "8px", whiteSpace: "nowrap" }}
        >
          <FloppyDisk size={14} weight="bold" />
          <span>{t("visualSandbox.savePresetBtn")}</span>
        </button>

        {activeCustomPreset && (
          <button
            type="button"
            className="quiet-button compact"
            onClick={() => onDeleteCustomPreset(activeCustomPreset.id)}
            title={t("visualSandbox.deletePresetTooltip")}
            style={{
              height: "36px",
              width: "36px",
              padding: 0,
              justifyContent: "center",
              borderRadius: "8px",
              color: "var(--notice-error, #ef4444)",
              flexShrink: 0,
            }}
          >
            <Trash size={15} />
          </button>
        )}
      </div>

      {/* Active Preset Description / Tag */}
      {matchedPreset ? (
        <div
          style={{
            fontSize: "11px",
            color: "var(--muted)",
            lineHeight: 1.4,
            display: "flex",
            alignItems: "center",
            gap: "6px",
            paddingTop: "2px",
          }}
        >
          <span
            style={{
              fontSize: "9.5px",
              fontWeight: 700,
              padding: "1px 6px",
              borderRadius: "4px",
              background: matchedPreset.isBuiltIn ? "var(--soft-accent)" : "rgba(255,255,255,0.08)",
              color: matchedPreset.isBuiltIn ? "var(--accent)" : "var(--text)",
            }}
          >
            {matchedPreset.isBuiltIn ? t("visualSandbox.presetBuiltInBadge") : t("visualSandbox.presetCustomBadge")}
          </span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{matchedPreset.description}</span>
        </div>
      ) : (
        <div
          style={{
            fontSize: "11px",
            color: "var(--muted)",
            fontStyle: "italic",
            paddingTop: "2px",
          }}
        >
          {t("visualSandbox.presetModifiedBadge")}
        </div>
      )}
    </div>
  );
}
