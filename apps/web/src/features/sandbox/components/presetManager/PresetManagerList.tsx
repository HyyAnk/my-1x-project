import { useTranslation } from "../../../../i18n";
import type { VisualPresetItem } from "../../hooks/useSandboxPresets";
import { PresetManagerCard } from "./PresetManagerCard";
import type { usePresetManagerModal } from "./usePresetManagerModal";

export interface PresetManagerListProps {
  presets: VisualPresetItem[];
  loadedPresetId?: string | null;
  manager: ReturnType<typeof usePresetManagerModal>;
  onLoadPreset: (preset: VisualPresetItem) => void;
  onUpdateActivePreset: (targetId: string) => Promise<void> | void;
  onDuplicatePreset: (preset: VisualPresetItem) => Promise<void> | void;
  onDeletePreset: (id: string) => Promise<void> | void;
}

export function PresetManagerList({
  presets,
  loadedPresetId,
  manager,
  onLoadPreset,
  onUpdateActivePreset,
  onDuplicatePreset,
  onDeletePreset,
}: PresetManagerListProps) {
  const { t } = useTranslation();

  if (presets.length === 0) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
        {t("visualSandbox.noPresetsFound")}
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px", paddingRight: "4px" }}>
      {presets.map((preset) => (
        <PresetManagerCard
          key={preset.id}
          preset={preset}
          isLoaded={loadedPresetId === preset.id}
          isEditing={manager.editingId === preset.id}
          isConfirmingDelete={manager.confirmDeleteId === preset.id}
          editName={manager.editName}
          editDesc={manager.editDesc}
          onChangeEditName={manager.setEditName}
          onChangeEditDesc={manager.setEditDesc}
          onStartEdit={manager.startEdit}
          onSaveEdit={manager.saveEdit}
          onCancelEdit={manager.cancelEdit}
          onLoadPreset={onLoadPreset}
          onUpdateActivePreset={onUpdateActivePreset}
          onDuplicatePreset={onDuplicatePreset}
          onRequestDelete={(id) => manager.setConfirmDeleteId(id)}
          onConfirmDelete={async (id) => {
            await onDeletePreset(id);
            manager.setConfirmDeleteId(null);
          }}
          onCancelDelete={() => manager.setConfirmDeleteId(null)}
        />
      ))}
    </div>
  );
}
