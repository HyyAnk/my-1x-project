import type React from "react";
import { useTranslation } from "../../../../i18n";
import type { VisualPresetItem } from "../../hooks/useSandboxPresets";
import { PresetEditInlineForm } from "./PresetEditInlineForm";
import { PresetCardActions } from "./PresetCardActions";

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

const BADGE_BASE_STYLE: React.CSSProperties = {
  fontSize: "10px",
  fontWeight: 700,
  textTransform: "uppercase",
  padding: "2px 6px",
  borderRadius: "4px",
  border: "1px solid var(--line)",
};
const BADGE_CUSTOM_STYLE: React.CSSProperties = {
  ...BADGE_BASE_STYLE,
  background: "rgba(99, 102, 241, 0.12)",
  color: "var(--accent, #6366f1)",
};
const BADGE_BUILTIN_STYLE: React.CSSProperties = {
  ...BADGE_BASE_STYLE,
  background: "var(--surface-strong)",
  color: "var(--muted)",
};
const BADGE_ACTIVE_STYLE: React.CSSProperties = {
  fontSize: "10px",
  fontWeight: 700,
  padding: "2px 6px",
  borderRadius: "4px",
  background: "rgba(16, 185, 129, 0.15)",
  color: "var(--notice-success, #10b981)",
};

export function PresetManagerCard(props: PresetManagerCardProps) {
  const { preset, isLoaded, isEditing, editName, editDesc, onChangeEditName, onChangeEditDesc, onSaveEdit, onCancelEdit } = props;
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
                <span style={isCustom ? BADGE_CUSTOM_STYLE : BADGE_BUILTIN_STYLE}>
                  {isCustom ? t("visualSandbox.badgeCustom") : t("visualSandbox.badgeBuiltIn")}
                </span>
                {isLoaded && <span style={BADGE_ACTIVE_STYLE}>{t("visualSandbox.badgeActiveCanvas")}</span>}
              </div>
              {preset.description && <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "var(--muted)" }}>{preset.description}</p>}
            </div>
          )}

          {/* Slots meta summary */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px", fontSize: "11px", color: "var(--muted)" }}>
            <span>
              <strong>Palette:</strong> {preset.palette_id}
            </span>
            <span>•</span>
            <span>
              <strong>Bar:</strong> {preset.thinking_bar_style}
            </span>
            <span>•</span>
            <span>
              <strong>Box:</strong> {preset.question_box_style}
            </span>
            <span>•</span>
            <span>
              <strong>Card:</strong> {preset.answer_card_style || "glossy"}
            </span>
            <span>•</span>
            <span>
              <strong>Bg:</strong> {preset.background_style || "candy_rays"}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <PresetCardActions isCustom={isCustom} {...props} />
      </div>
    </div>
  );
}
