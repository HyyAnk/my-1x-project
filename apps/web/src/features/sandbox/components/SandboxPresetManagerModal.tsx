import { useTranslation } from "../../../i18n";
import type { VisualPresetItem } from "../hooks/useSandboxPresets";
import { StyleModuleImportDialog } from "../../stylePresets/components/StyleModuleImportDialog";
import { PresetManagerFilterTabs, PresetManagerHeader, PresetManagerList, usePresetManagerModal } from "./presetManager";

export interface SandboxPresetManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  allPresets: VisualPresetItem[];
  builtInPresets: VisualPresetItem[];
  customPresets: VisualPresetItem[];
  loadedPresetId?: string | null;
  onLoadPreset: (preset: VisualPresetItem) => void;
  onUpdateActivePreset: (targetId: string) => Promise<void> | void;
  onDuplicatePreset: (preset: VisualPresetItem) => Promise<void> | void;
  onUpdateMetadata: (id: string, name: string, description?: string) => Promise<void> | void;
  onDeletePreset: (id: string) => Promise<void> | void;
  onRefreshPresets?: () => Promise<unknown> | void;
}

export function SandboxPresetManagerModal({
  isOpen,
  onClose,
  allPresets,
  builtInPresets,
  customPresets,
  loadedPresetId,
  onLoadPreset,
  onUpdateActivePreset,
  onDuplicatePreset,
  onUpdateMetadata,
  onDeletePreset,
  onRefreshPresets,
}: SandboxPresetManagerModalProps) {
  const { t } = useTranslation();
  const manager = usePresetManagerModal({
    allPresets,
    builtInPresets,
    customPresets,
    onUpdateMetadata,
    onRefreshPresets,
  });

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(6px)",
        display: "grid",
        placeItems: "center",
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        className="panel"
        style={{
          width: "780px",
          maxWidth: "92vw",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          padding: "24px",
          borderRadius: "16px",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <PresetManagerHeader onOpenImport={manager.openImport} onClose={onClose} />

        <PresetManagerFilterTabs
          filterTab={manager.filterTab}
          onChangeTab={manager.setFilterTab}
          allCount={allPresets.length}
          customCount={customPresets.length}
          builtInCount={builtInPresets.length}
        />

        <PresetManagerList
          presets={manager.filteredPresets}
          loadedPresetId={loadedPresetId}
          manager={manager}
          onLoadPreset={(p) => {
            onLoadPreset(p);
            onClose();
          }}
          onUpdateActivePreset={onUpdateActivePreset}
          onDuplicatePreset={onDuplicatePreset}
          onDeletePreset={onDeletePreset}
        />

        <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "14px", borderTop: "1px solid var(--line)" }}>
          <button type="button" className="quiet-button" onClick={onClose}>
            {t("common.close")}
          </button>
        </div>
      </div>

      <StyleModuleImportDialog
        open={manager.importOpen}
        pending={manager.importing}
        error={manager.importError}
        onCancel={manager.closeImport}
        onImport={manager.handleImport}
      />
    </div>
  );
}
