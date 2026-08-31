import { useCallback, useEffect, useState } from "react";
import type { Channel, StorageInfo } from "@studio/shared";
import { api } from "../api";
import type { ChannelGroupId } from "../components/ChannelList";
import type { GitInfo, Notice, Theme } from "../components/types";

export function useSystemUiState() {
  const [git, setGit] = useState<GitInfo>({ branch: null, dirty: false, changed_files: 0 });
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [showCreate, setShowCreate] = useState<ChannelGroupId | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Channel | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [loading, setLoading] = useState(true);
  const [stopped, setStopped] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => (window.localStorage.getItem("studio-theme") === "light" ? "light" : "dark"));
  const [simplifyMode, setSimplifyMode] = useState<boolean>(() => {
    const saved = window.localStorage.getItem("studio-simplify-mode");
    if (saved === null) return true;
    return saved !== "false";
  });

  const handleSimplifyToggle = (enabled: boolean) => {
    setSimplifyMode(enabled);
    window.localStorage.setItem("studio-simplify-mode", String(enabled));
  };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("studio-theme", theme);
  }, [theme]);

  const handleCloseNotice = useCallback(() => setNotice(null), []);
  const showError = useCallback((error: unknown) => {
    setNotice({ tone: "bad", message: error instanceof Error ? error.message : "Something went wrong" });
  }, []);
  const showGood = useCallback((message: string) => {
    setNotice({ tone: "good", message });
  }, []);
  const requestDeleteChannel = useCallback((channel: Channel) => setDeleteTarget(channel), []);
  const requestCreateChannel = useCallback((groupId: ChannelGroupId = "quiz") => setShowCreate(groupId), []);

  const stopDashboard = useCallback(async () => {
    if (!window.confirm("Stop the dashboard and its local services? Your channel files will remain untouched.")) return;
    try {
      await api.shutdown();
      setStopped(true);
    } catch (error) {
      showError(error);
    }
  }, [showError]);

  return {
    git,
    setGit,
    storage,
    setStorage,
    showCreate,
    setShowCreate,
    deleteTarget,
    setDeleteTarget,
    notice,
    setNotice,
    loading,
    setLoading,
    stopped,
    setStopped,
    theme,
    setTheme,
    simplifyMode,
    handleSimplifyToggle,
    handleCloseNotice,
    showError,
    showGood,
    requestDeleteChannel,
    requestCreateChannel,
    stopDashboard,
  };
}
