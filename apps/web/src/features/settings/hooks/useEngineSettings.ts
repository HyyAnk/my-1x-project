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
  const [savingCodex, setSavingCodex] = useState(false);

  const [agyApiKey, setAgyApiKey] = useState("");
  const [agyCommand, setAgyCommand] = useState(appConfig?.antigravity.command ?? "agy");
  const [agyBaseUrl, setAgyBaseUrl] = useState(appConfig?.antigravity.api_base_url ?? "");
  const [savingAntigravity, setSavingAntigravity] = useState(false);

  useEffect(() => {
    setTransport(codex?.settings.transport ?? "app_server");
    setBaseUrl(codex?.settings.api_base_url ?? "");
  }, [codex]);

  useEffect(() => {
    setAgyCommand(antigravity?.settings.command ?? appConfig?.antigravity.command ?? "agy");
    setAgyBaseUrl(antigravity?.settings.api_base_url ?? appConfig?.antigravity.api_base_url ?? "");
  }, [antigravity, appConfig?.antigravity]);

  const saveCodex = async (event: FormEvent) => {
    event.preventDefault();
    setSavingCodex(true);
    try {
      const next = await api.saveCodexSettings({
        transport,
        api_base_url: baseUrl,
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

  return {
    transport,
    setTransport,
    baseUrl,
    setBaseUrl,
    apiKey,
    setApiKey,
    savingCodex,
    saveCodex,
    agyApiKey,
    setAgyApiKey,
    agyCommand,
    setAgyCommand,
    agyBaseUrl,
    setAgyBaseUrl,
    savingAntigravity,
    saveAntigravity,
  };
}
