import { ArrowClockwise, Copy, FloppyDisk, PencilSimple, Trash } from "@phosphor-icons/react";
import { useTranslation } from "../../../../i18n";
import type { VisualPresetItem } from "../../hooks/useSandboxPresets";

export interface PresetCardActionsProps {
  preset: VisualPresetItem;
  isCustom: boolean;
  isEditing: boolean;
  isConfirmingDelete: boolean;
  onLoadPreset: (preset: VisualPresetItem) => void;
  onUpdateActivePreset: (targetId: string) => Promise<void> | void;
  onStartEdit: (preset: VisualPresetItem) => void;
  onDuplicatePreset: (preset: VisualPresetItem) => Promise<void> | void;
  onRequestDelete: (id: string) => void;
  onConfirmDelete: (id: string) => void;
  onCancelDelete: () => void;
}

export function PresetCardActions({
  preset,
  isCustom,
  isEditing,
  isConfirmingDelete,
  onLoadPreset,
  onUpdateActivePreset,
  onStartEdit,
  onDuplicatePreset,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
}: PresetCardActionsProps) {
  const { t } = useTranslation();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
      <button
        type="button"
        className="quiet-button compact"
        onClick={() => onLoadPreset(preset)}
        title={t("visualSandbox.loadPresetTooltip")}
        style={{ height: "30px", fontSize: "11px", padding: "0 10px" }}
      >
        <ArrowClockwise size={13} weight="bold" />
        <span>{t("visualSandbox.loadBtn")}</span>
      </button>

      {isCustom && !isEditing && (
        <button
          type="button"
          className="quiet-button compact"
          onClick={() => void onUpdateActivePreset(preset.id)}
          title={t("visualSandbox.overwriteWithCanvasTooltip")}
          style={{ height: "30px", fontSize: "11px", padding: "0 10px" }}
        >
          <FloppyDisk size={13} weight="bold" />
          <span>{t("visualSandbox.overwriteBtn")}</span>
        </button>
      )}

      {isCustom && !isEditing && (
        <button
          type="button"
          className="quiet-button compact"
          onClick={() => onStartEdit(preset)}
          title={t("visualSandbox.editMetadataTooltip")}
          style={{ height: "30px", width: "30px", padding: 0, justifyContent: "center" }}
        >
          <PencilSimple size={14} />
        </button>
      )}

      <button
        type="button"
        className="quiet-button compact"
        onClick={() => void onDuplicatePreset(preset)}
        title={t("visualSandbox.duplicatePresetTooltip")}
        style={{ height: "30px", width: "30px", padding: 0, justifyContent: "center" }}
      >
        <Copy size={14} />
      </button>

      {isCustom &&
        (isConfirmingDelete ? (
          <div style={{ display: "flex", gap: "4px" }}>
            <button
              type="button"
              className="quiet-button compact"
              onClick={() => onConfirmDelete(preset.id)}
              style={{
                height: "30px",
                padding: "0 8px",
                background: "rgba(239, 68, 68, 0.15)",
                color: "var(--notice-error, #ef4444)",
                fontSize: "11px",
                fontWeight: 700,
              }}
            >
              {t("common.confirm")}
            </button>
            <button
              type="button"
              className="quiet-button compact"
              onClick={onCancelDelete}
              style={{ height: "30px", padding: "0 6px", fontSize: "11px" }}
            >
              {t("common.cancel")}
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="quiet-button compact"
            onClick={() => onRequestDelete(preset.id)}
            title={t("visualSandbox.deletePresetTooltip")}
            style={{
              height: "30px",
              width: "30px",
              padding: 0,
              justifyContent: "center",
              color: "var(--notice-error, #ef4444)",
            }}
          >
            <Trash size={14} />
          </button>
        ))}
    </div>
  );
}
