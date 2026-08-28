import { useCallback, useEffect, useMemo, useState } from "react";
import type { MascotProfile } from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";
import { useTranslation } from "../../../i18n";

export function useMascotLibrary({
  onNotice,
  onRefreshChannels,
}: {
  onNotice: (notice: NonNullable<Notice>) => void;
  onRefreshChannels: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [mascots, setMascots] = useState<MascotProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [styleFilter, setStyleFilter] = useState<string>("all");

  const [quickAssignMascot, setQuickAssignMascot] = useState<MascotProfile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MascotProfile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [importingZip, setImportingZip] = useState(false);

  const loadMascots = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.mascots();
      setMascots(res.mascots);
    } catch (err) {
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : "Failed to load mascots" });
    } finally {
      setLoading(false);
    }
  }, [onNotice]);

  useEffect(() => {
    void loadMascots();
  }, [loadMascots]);

  const filteredMascots = useMemo(() => {
    return mascots.filter((m) => {
      if (styleFilter !== "all" && m.visual_style !== styleFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = m.name.toLowerCase().includes(q);
        const matchDesc = m.description.toLowerCase().includes(q);
        const matchPrompt = m.master_prompt.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchPrompt) return false;
      }
      return true;
    });
  }, [mascots, styleFilter, searchQuery]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteMascot(deleteTarget.id);
      onNotice({ tone: "good", message: t("notices.mascotDeleted", { name: deleteTarget.name }) });
      setDeleteTarget(null);
      await loadMascots();
      await onRefreshChannels();
    } catch (err) {
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : t("notices.mascotDeleteFailed") });
    } finally {
      setDeleting(false);
    }
  };

  const handleImportZip = async (file: File) => {
    setImportingZip(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          const res = await api.importMascotZip(base64);
          onNotice({ tone: "good", message: t("notices.mascotImported", { name: res.mascot.name }) });
          await loadMascots();
          await onRefreshChannels();
        } catch (err) {
          onNotice({ tone: "bad", message: err instanceof Error ? err.message : t("notices.mascotImportFailed") });
        } finally {
          setImportingZip(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setImportingZip(false);
      onNotice({ tone: "bad", message: t("notices.cannotReadZip") });
    }
  };

  return {
    mascots,
    loading,
    searchQuery,
    setSearchQuery,
    styleFilter,
    setStyleFilter,
    filteredMascots,
    quickAssignMascot,
    setQuickAssignMascot,
    deleteTarget,
    setDeleteTarget,
    deleting,
    importingZip,
    loadMascots,
    handleDeleteConfirm,
    handleImportZip,
  };
}
