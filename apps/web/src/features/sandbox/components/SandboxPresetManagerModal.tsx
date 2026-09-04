import { useState } from "react";
import { Copy, FloppyDisk, PencilSimple, Trash, UploadSimple, X, Check, ArrowClockwise, SlidersHorizontal } from "@phosphor-icons/react";
import { useTranslation } from "../../../i18n";
import type { VisualPresetItem } from "../hooks/useSandboxPresets";
import { StyleModuleImportDialog } from "../../stylePresets/components/StyleModuleImportDialog";
import { api } from "../../../api";

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
  const [filterTab, setFilterTab] = useState<"all" | "custom" | "builtin">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredPresets =
    filterTab === "builtin" ? builtInPresets : filterTab === "custom" ? customPresets : allPresets;

  const startEdit = (preset: VisualPresetItem) => {
    setEditingId(preset.id);
    setEditName(preset.name);
    setEditDesc(preset.description || "");
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return;
    await onUpdateMetadata(id, editName.trim(), editDesc.trim());
    setEditingId(null);
  };

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
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "17px", display: "flex", alignItems: "center", gap: "8px" }}>
              <SlidersHorizontal size={20} weight="bold" />
              <span>{t("visualSandbox.modalPresetManagerTitle")}</span>
            </h3>
            <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "var(--muted)" }}>
              {t("visualSandbox.modalPresetManagerDesc")}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              className="primary-button compact"
              onClick={() => {
                setImportError(null);
                setImportOpen(true);
              }}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <UploadSimple size={15} weight="bold" />
              <span>{t("visualSandbox.importStyleBtn")}</span>
            </button>
            <button type="button" className="icon-button" onClick={onClose} title={t("common.close")}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Filter Tabs & Counter */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid var(--line)",
            paddingBottom: "12px",
            marginBottom: "14px",
          }}
        >
          <div style={{ display: "flex", gap: "6px" }}>
            {(["all", "custom", "builtin"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                className={`tab-button compact ${filterTab === tab ? "active" : ""}`}
                onClick={() => setFilterTab(tab)}
                style={{
                  padding: "4px 12px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: filterTab === tab ? 700 : 500,
                  background: filterTab === tab ? "var(--surface-strong)" : "transparent",
                  color: filterTab === tab ? "var(--text)" : "var(--muted)",
                  border: filterTab === tab ? "1px solid var(--line)" : "1px solid transparent",
                  cursor: "pointer",
                }}
              >
                {tab === "all"
                  ? `${t("visualSandbox.tabAllPresets")} (${allPresets.length})`
                  : tab === "custom"
                    ? `${t("visualSandbox.tabCustomPresets")} (${customPresets.length})`
                    : `${t("visualSandbox.tabBuiltInPresets")} (${builtInPresets.length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Preset List */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px", paddingRight: "4px" }}>
          {filteredPresets.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
              {t("visualSandbox.noPresetsFound")}
            </div>
          ) : (
            filteredPresets.map((preset) => {
              const isCustom = !preset.isBuiltIn;
              const isLoaded = loadedPresetId === preset.id;
              const isEditing = editingId === preset.id;

              return (
                <div
                  key={preset.id}
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
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="text-input"
                            style={{ height: "32px", fontSize: "13px", fontWeight: 700 }}
                            placeholder={t("visualSandbox.presetNameLabel")}
                            autoFocus
                          />
                          <input
                            type="text"
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            className="text-input"
                            style={{ height: "28px", fontSize: "12px" }}
                            placeholder={t("visualSandbox.descriptionPlaceholder")}
                          />
                          <div style={{ display: "flex", gap: "6px", marginTop: "2px" }}>
                            <button
                              type="button"
                              className="primary-button compact"
                              onClick={() => void saveEdit(preset.id)}
                              disabled={!editName.trim()}
                              style={{ height: "28px", fontSize: "11px", padding: "0 10px" }}
                            >
                              <Check size={12} weight="bold" />
                              <span>{t("common.save")}</span>
                            </button>
                            <button
                              type="button"
                              className="quiet-button compact"
                              onClick={() => setEditingId(null)}
                              style={{ height: "28px", fontSize: "11px", padding: "0 10px" }}
                            >
                              <span>{t("common.cancel")}</span>
                            </button>
                          </div>
                        </div>
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
                        onClick={() => {
                          onLoadPreset(preset);
                          onClose();
                        }}
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
                          onClick={() => startEdit(preset)}
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
                        confirmDeleteId === preset.id ? (
                          <div style={{ display: "flex", gap: "4px" }}>
                            <button
                              type="button"
                              className="quiet-button compact"
                              onClick={() => {
                                void onDeletePreset(preset.id);
                                setConfirmDeleteId(null);
                              }}
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
                              onClick={() => setConfirmDeleteId(null)}
                              style={{ height: "30px", padding: "0 6px", fontSize: "11px" }}
                            >
                              {t("common.cancel")}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="quiet-button compact"
                            onClick={() => setConfirmDeleteId(preset.id)}
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
            })
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "14px", borderTop: "1px solid var(--line)" }}>
          <button type="button" className="quiet-button" onClick={onClose}>
            {t("common.close")}
          </button>
        </div>
      </div>

      {/* Style Module Import Dialog */}
      <StyleModuleImportDialog
        open={importOpen}
        pending={importing}
        error={importError}
        onCancel={() => setImportOpen(false)}
        onImport={async (data, activate) => {
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
        }}
      />
    </div>
  );
}
