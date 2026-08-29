import { useEffect, useState, type FormEvent } from "react";
import type { AppConfig, CodexSettingsResponse, AntigravitySettingsResponse } from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";

type UseEngineSettingsProps = {
  appConfig: AppConfig | null;
  codex: CodexSettingsResponse | null;
  antigravity?: AntigravitySettingsResponse | null;
  onCodexSaved: (response: CodexSettingsResponse) => void;
  onAntigravitySaved?: (response: AntigravitySettingsResponse) => void;
  onNotice: (notice: NonNullable<Notice>) => void;
};

export function useEngineSettings({ appConfig, codex, antigravity, onCodexSaved, onAntigravitySaved, onNotice }: UseEngineSettingsProps) {
  const [transport, setTransport] = useState(codex?.settings.transport ?? "app_server");
  const [baseUrl, setBaseUrl] = useState(codex?.settings.api_base_url ?? "");
  const [apiKey, setApiKey] = useState("");
  const [autoDeleteThreads, setAutoDeleteThreads] = useState(appConfig?.codex.auto_delete_threads ?? false);
  const [failedThreadRetentionDays, setFailedThreadRetentionDays] = useState(appConfig?.codex.failed_thread_retention_days ?? 7);
  const [savingCodex, setSavingCodex] = useState(false);
  const [cleaningThreads, setCleaningThreads] = useState(false);

  const [agyApiKey, setAgyApiKey] = useState("");
  const [agyCommand, setAgyCommand] = useState(appConfig?.antigravity.command ?? "agy");
  const [agyBaseUrl, setAgyBaseUrl] = useState(appConfig?.antigravity.api_base_url ?? "");
  const [agyAutoDeleteThreads, setAgyAutoDeleteThreads] = useState(appConfig?.antigravity.auto_delete_threads ?? false);
  const [agyFailedThreadRetentionDays, setAgyFailedThreadRetentionDays] = useState(
    appConfig?.antigravity.failed_thread_retention_days ?? 7,
  );
  const [savingAntigravity, setSavingAntigravity] = useState(false);
  const [cleaningAgyThreads, setCleaningAgyThreads] = useState(false);

  useEffect(() => {
    setTransport(codex?.settings.transport ?? "app_server");
    setBaseUrl(codex?.settings.api_base_url ?? "");
    setAutoDeleteThreads(codex?.settings.auto_delete_threads ?? appConfig?.codex.auto_delete_threads ?? false);
    setFailedThreadRetentionDays(codex?.settings.failed_thread_retention_days ?? appConfig?.codex.failed_thread_retention_days ?? 7);
  }, [codex, appConfig?.codex.auto_delete_threads, appConfig?.codex.failed_thread_retention_days]);

  useEffect(() => {
    setAgyCommand(antigravity?.settings.command ?? appConfig?.antigravity.command ?? "agy");
    setAgyBaseUrl(antigravity?.settings.api_base_url ?? appConfig?.antigravity.api_base_url ?? "");
    setAgyAutoDeleteThreads(antigravity?.settings.auto_delete_threads ?? appConfig?.antigravity.auto_delete_threads ?? false);
    setAgyFailedThreadRetentionDays(
      antigravity?.settings.failed_thread_retention_days ?? appConfig?.antigravity.failed_thread_retention_days ?? 7,
    );
  }, [antigravity, appConfig?.antigravity]);

  const codexCleanupSaved = codex?.settings.auto_delete_threads ?? appConfig?.codex.auto_delete_threads ?? false;
  const antigravityCleanupSaved = antigravity?.settings.auto_delete_threads ?? appConfig?.antigravity.auto_delete_threads ?? false;

  const saveCodex = async (event: FormEvent) => {
    event.preventDefault();
    setSavingCodex(true);
    try {
      const next = await api.saveCodexSettings({
        transport,
        api_base_url: baseUrl,
        auto_delete_threads: autoDeleteThreads,
        failed_thread_retention_days: failedThreadRetentionDays,
        ...(apiKey ? { api_key: apiKey } : {}),
      });
      onCodexSaved(next);
      setApiKey("");
      onNotice({ tone: "good", message: "Codex settings saved locally" });
    } catch (error) {
      onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Could not save Codex settings" });
    } finally {
      setSavingCodex(false);
    }
  };

  const saveAntigravity = async (event: FormEvent) => {
    event.preventDefault();
    setSavingAntigravity(true);
    try {
      const next = await api.saveAntigravitySettings({
        command: agyCommand,
        api_base_url: agyBaseUrl,
        auto_delete_threads: agyAutoDeleteThreads,
        failed_thread_retention_days: agyFailedThreadRetentionDays,
        ...(agyApiKey ? { api_key: agyApiKey } : {}),
      });
      onAntigravitySaved?.(next);
      setAgyApiKey("");
      onNotice({ tone: "good", message: "Antigravity settings saved locally" });
    } catch (error) {
      onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Could not save Antigravity settings" });
    } finally {
      setSavingAntigravity(false);
    }
  };

  const cleanupCodex = async () => {
    setCleaningThreads(true);
    try {
      const result = await api.cleanupCodex();
      onNotice({
        tone: "good",
        message: result.removed
          ? `${result.removed} old Codex session${result.removed === 1 ? "" : "s"} cleaned up`
          : "No old Codex sessions needed cleanup",
      });
    } catch (error) {
      onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Could not clean up Codex sessions" });
    } finally {
      setCleaningThreads(false);
    }
  };

  const cleanupAntigravity = async () => {
    setCleaningAgyThreads(true);
    try {
      const result = await api.cleanupAntigravity();
      onNotice({
        tone: "good",
        message: result.removed
          ? `${result.removed} old Antigravity session${result.removed === 1 ? "" : "s"} cleaned up`
          : "No old Antigravity sessions needed cleanup",
      });
    } catch (error) {
      onNotice({
        tone: "bad",
        message: error instanceof Error ? error.message : "Could not clean up Antigravity sessions",
      });
    } finally {
      setCleaningAgyThreads(false);
    }
  };

  return {
    transport,
    setTransport,
    baseUrl,
    setBaseUrl,
    apiKey,
    setApiKey,
    autoDeleteThreads,
    setAutoDeleteThreads,
    failedThreadRetentionDays,
    setFailedThreadRetentionDays,
    savingCodex,
    cleaningThreads,
    codexCleanupSaved,
    saveCodex,
    cleanupCodex,
    agyApiKey,
    setAgyApiKey,
    agyCommand,
    setAgyCommand,
    agyBaseUrl,
    setAgyBaseUrl,
    agyAutoDeleteThreads,
    setAgyAutoDeleteThreads,
    agyFailedThreadRetentionDays,
    setAgyFailedThreadRetentionDays,
    savingAntigravity,
    cleaningAgyThreads,
    antigravityCleanupSaved,
    saveAntigravity,
    cleanupAntigravity,
  };
}
