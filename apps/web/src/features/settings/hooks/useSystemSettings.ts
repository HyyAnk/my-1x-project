import { useEffect, useState, type FormEvent } from "react";
import type { StorageInfo } from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";

type UseSystemSettingsProps = {
  storage: StorageInfo | null;
  onStorageSaved: (storage: StorageInfo) => void | Promise<void>;
  onNotice: (notice: NonNullable<Notice>) => void;
};

export function useSystemSettings({ storage, onStorageSaved, onNotice }: UseSystemSettingsProps) {
  const [storagePath, setStoragePath] = useState(storage?.path ?? "");
  const [savingStorage, setSavingStorage] = useState(false);

  useEffect(() => {
    setStoragePath(storage?.path ?? "");
  }, [storage?.path]);

  const saveStorage = async (event: FormEvent) => {
    event.preventDefault();
    if (!storagePath.trim()) return;
    setSavingStorage(true);
    try {
      const next = await api.setStorage(storagePath);
      await onStorageSaved(next);
      onNotice({ tone: "good", message: "Storage folder saved" });
    } catch (error) {
      onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Could not update storage" });
    } finally {
      setSavingStorage(false);
    }
  };

  return {
    storagePath,
    setStoragePath,
    savingStorage,
    saveStorage,
  };
}
