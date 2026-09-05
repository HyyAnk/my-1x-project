import { ArrowClockwise, Copy, FloppyDisk, PencilSimple, Trash } from "@phosphor-icons/react";
import { useTranslation } from "../../../../i18n";
import type { VisualPresetItem } from "../../hooks/useSandboxPresets";
import { PresetEditInlineForm } from "./PresetEditInlineForm";

export interface PresetManagerCardProps {
  preset: VisualPresetItem;
  isLoaded: boolean;
  isEditing: boolean;
  isConfirmingDelete: boolean;
  editName: string;
  editDesc: string;
  onChangeEditName: (val: string) => void;
  onChangeEditDesc: (val: string) => void;
  onStartEdit: (preset: VisualPresetItem) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  onLoadPreset: (preset: VisualPresetItem) => void;
  onUpdateActivePreset: (targetId: string) => Promise<void> | void;
  onDuplicatePreset: (preset: VisualPresetItem) => Promise<void> | void;
  onRequestDelete: (id: string) => void;
  onConfirmDelete: (id: string) => void;
  onCancelDelete: () => void;
}

export function PresetManagerCard({
  preset,
  isLoaded,
  isEditing,
  isConfirmingDelete,
  editName,
  editDesc,
  onChangeEditName,
  onChangeEditDesc,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onLoadPreset,
  onUpdateActivePreset,
  onDuplicatePreset,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
}: PresetManagerCardProps) {
  const { t } = useTranslation();
  const isCustom = !preset.isBuiltIn;

  return (
    <div
      style={{
        background: isLoaded ? "var(--surface-strong)" : "var(--surface)",
        border: isLoaded ? "1.5px solid var(--accent, #6366f1)" : "1px solid var(--line)",
        borderRadius: "12px",
        padding: "14px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
        {/* Left: Info or Edit Form */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {isEditing ? (
            <PresetEditInlineForm
              name={editName}
              description={editDesc}
              onChangeName={onChangeEditName}
              onChangeDescription={onChangeEditDesc}
              onSave={() => onSaveEdit(preset.id)}
              onCancel={onCancelEdit}
            />
          ) : (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "15px" }}>{preset.icon || "🎨"}</span>
                <strong style={{ fontSize: "14px", color: "var(--text)" }}>{preset.name}</strong>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: isCustom ? "rgba(99, 102, 241, 0.12)" : "var(--surface-strong)",
                    color: isCustom ? "var(--accent, #6366f1)" : "var(--muted)",
                    border: "1px solid var(--line)",
                  }}
                >
                  {isCustom ? t("visualSandbox.badgeCustom") : t("visualSandbox.badgeBuiltIn")}
                </span>
                {isLoaded && (
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: "4px",
                      background: "rgba(16, 185, 129, 0.15)",
                      color: "var(--notice-success, #10b981)",
                    }}
                  >
                    {t("visualSandbox.badgeActiveCanvas")}
                  </span>
                )}
              </div>
              {preset.description && (
                <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "var(--muted)" }}>
                  {preset.description}
                </p>
              )}
            </div>
          )}

          {/* Slots meta summary */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              marginTop: "8px",
              fontSize: "11px",
              color: "var(--muted)",
            }}
          >
            <span><strong>Palette:</strong> {preset.palette_id}</span>
            <span>•</span>
            <span><strong>Bar:</strong> {preset.thinking_bar_style}</span>
            <span>•</span>
            <span><strong>Box:</strong> {preset.question_box_style}</span>
            <span>•</span>
            <span><strong>Card:</strong> {preset.answer_card_style || "glossy"}</span>
            <span>•</span>
            <span><strong>Bg:</strong> {preset.background_style || "candy_rays"}</span>
          </div>
        </div>

        {/* Right: Actions */}
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

          {isCustom && (
            isConfirmingDelete ? (
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
            )
          )}
        </div>
      </div>
    </div>
  );
}
