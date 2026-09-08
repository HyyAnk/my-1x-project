import { useState } from "react";
import type { VisualPresetItem } from "../../hooks/useSandboxPresets";
import { api } from "../../../../api";
import type { PresetFilterTab } from "./PresetManagerFilterTabs";

interface UsePresetManagerModalProps {
  allPresets: VisualPresetItem[];
  builtInPresets: VisualPresetItem[];
  customPresets: VisualPresetItem[];
  onUpdateMetadata: (id: string, name: string, description?: string) => Promise<void> | void;
  onRefreshPresets?: () => Promise<unknown> | void;
}

export function usePresetManagerModal({
  allPresets,
  builtInPresets,
  customPresets,
  onUpdateMetadata,
  onRefreshPresets,
}: UsePresetManagerModalProps) {
  const [filterTab, setFilterTab] = useState<PresetFilterTab>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredPresets = filterTab === "builtin" ? builtInPresets : filterTab === "custom" ? customPresets : allPresets;

  const startEdit = (preset: VisualPresetItem) => {
    setEditingId(preset.id);
    setEditName(preset.name);
    setEditDesc(preset.description || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return;
    await onUpdateMetadata(id, editName.trim(), editDesc.trim());
    setEditingId(null);
  };

  const openImport = () => {
    setImportError(null);
    setImportOpen(true);
  };

  const closeImport = () => {
    setImportOpen(false);
  };

  const handleImport = async (data: string, activate: boolean) => {
    setImporting(true);
    setImportError(null);
    try {
      await api.importStyleModule(data, activate);
      setImportOpen(false);
      if (onRefreshPresets) await onRefreshPresets();
    } catch (cause) {
      setImportError(cause instanceof Error ? cause.message : "Failed to import style package");
    } finally {
      setImporting(false);
    }
  };

  return {
    filterTab,
    setFilterTab,
    editingId,
    editName,
    setEditName,
    editDesc,
    setEditDesc,
    importOpen,
    importing,
    importError,
    confirmDeleteId,
    setConfirmDeleteId,
    filteredPresets,
    startEdit,
    cancelEdit,
    saveEdit,
    openImport,
    closeImport,
    handleImport,
  };
}
