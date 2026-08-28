import { CircleNotch, FloppyDisk, Sparkle, TerminalWindow, Trash } from "@phosphor-icons/react";
import type { AppConfig, CodexSettingsResponse, AntigravitySettingsResponse } from "@studio/shared";
import { StatusLine } from "../../components/AppChrome";
import type { Notice } from "../../components/types";
import { SessionCleanupToggle } from "./components/SessionCleanupToggle";
import { useEngineSettings } from "./hooks/useEngineSettings";

type EngineSettingsTabProps = {
  appConfig: AppConfig | null;
  codex: CodexSettingsResponse | null;
  codexStatus: string;
  antigravity?: AntigravitySettingsResponse | null;
  antigravityStatus?: string;
  onCodexSaved: (response: CodexSettingsResponse) => void;
  onAntigravitySaved?: (response: AntigravitySettingsResponse) => void;
  onNotice: (notice: NonNullable<Notice>) => void;
};

export function EngineSettingsTab({
  appConfig,
  codex,
  codexStatus,
  antigravity,
  antigravityStatus,
  onCodexSaved,
  onAntigravitySaved,
  onNotice,
}: EngineSettingsTabProps) {
  const {
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
    agyAutoDeleteThreads,
    setAgyAutoDeleteThreads,
    agyFailedThreadRetentionDays,
    setAgyFailedThreadRetentionDays,
    savingAntigravity,
    cleaningAgyThreads,
    antigravityCleanupSaved,
    saveAntigravity,
    cleanupAntigravity,
  } = useEngineSettings({
    appConfig,
    codex,
    antigravity,
    onCodexSaved,
    onAntigravitySaved,
    onNotice,
  });

  return (
    <div className="settings-grid">
      <section className="panel codex-settings-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Language Model Provider</p>
            <h2>Codex (OpenAI Engine)</h2>
          </div>
          <TerminalWindow size={22} />
        </div>
        <StatusLine label="Status" value={codexStatus} />
        <StatusLine
          label="Transport"
          value={codex?.settings.transport === "openai_compatible" ? "Cockpit API" : "App Server"}
        />
        <StatusLine label="Selected model" value={codex?.settings.model || "Codex default"} />
        <StatusLine
          label="Sessions"
          value={
            autoDeleteThreads !== codexCleanupSaved
              ? "Save to apply"
              : codexCleanupSaved
              ? "Cleanup enabled"
              : "Cleanup disabled"
          }
        />
        <form className="codex-form" onSubmit={(event) => void saveCodex(event)}>
          <label>
            Transport
            <select
              value={transport}
              onChange={(event) => setTransport(event.target.value as "app_server" | "openai_compatible")}
            >
              <option value="app_server">Local Codex App Server</option>
              <option value="openai_compatible">Cockpit API Service</option>
            </select>
          </label>
          {transport === "openai_compatible" ? (
            <>
              <label>
                Base URL
                <input
                  value={baseUrl}
                  onChange={(event) => setBaseUrl(event.target.value)}
                  placeholder="http://127.0.0.1:PORT/v1"
                />
              </label>
              <label>
                API key
                <input
                  type="password"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder={codex?.settings.has_api_key ? "Saved locally - leave blank to keep" : "Paste Cockpit API key"}
                  autoComplete="off"
                />
              </label>
            </>
          ) : null}
          <SessionCleanupToggle
            engine="Codex"
            enabled={autoDeleteThreads}
            disabled={savingCodex}
            onChange={setAutoDeleteThreads}
          />
          {autoDeleteThreads ? (
            <label>
              Failed/cancelled retention (days)
              <input
                type="number"
                min="0"
                max="3650"
                step="1"
                value={failedThreadRetentionDays}
                onChange={(event) => setFailedThreadRetentionDays(Number(event.target.value))}
              />
            </label>
          ) : null}
          <button className="primary-button" disabled={savingCodex}>
            {savingCodex ? <CircleNotch className="spin" size={16} /> : <FloppyDisk size={16} />}
            <span>Save Codex Settings</span>
          </button>
        </form>
        {codexCleanupSaved ? (
          <div className="codex-cleanup-action">
            <button className="quiet-button" disabled={cleaningThreads} onClick={() => void cleanupCodex()}>
              {cleaningThreads ? <CircleNotch className="spin" size={15} /> : <Trash size={15} />}
              <span>{cleaningThreads ? "Cleaning…" : "Clean up old Codex sessions"}</span>
            </button>
          </div>
        ) : null}
      </section>

      <section className="panel codex-settings-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Native Gemini Engine</p>
            <h2>Antigravity (Google)</h2>
          </div>
          <Sparkle size={22} />
        </div>
        <StatusLine label="Status" value={antigravityStatus ?? "Ready"} />
        <StatusLine
          label="Mode"
          value={antigravity?.settings.has_api_key ? "Google AI API (Custom Key)" : "Native AgentAPI (Zero API Key)"}
        />
        <StatusLine
          label="Selected model"
          value={antigravity?.settings.model || appConfig?.antigravity.model || "gemini-3.7-flash-high"}
        />
        <StatusLine
          label="Sessions"
          value={
            agyAutoDeleteThreads !== antigravityCleanupSaved
              ? "Save to apply"
              : antigravityCleanupSaved
              ? "Cleanup enabled"
              : "Cleanup disabled"
          }
        />
        <form className="codex-form" onSubmit={(event) => void saveAntigravity(event)}>
          <SessionCleanupToggle
            engine="Antigravity"
            enabled={agyAutoDeleteThreads}
            disabled={savingAntigravity}
            onChange={setAgyAutoDeleteThreads}
          />
          {agyAutoDeleteThreads ? (
            <label>
              Failed/cancelled retention (days)
              <input
                type="number"
                min="0"
                max="3650"
                step="1"
                value={agyFailedThreadRetentionDays}
                onChange={(event) => setAgyFailedThreadRetentionDays(Number(event.target.value))}
              />
            </label>
          ) : null}
          <button className="primary-button" disabled={savingAntigravity}>
            {savingAntigravity ? <CircleNotch className="spin" size={16} /> : <FloppyDisk size={16} />}
            <span>Save Antigravity Settings</span>
          </button>
        </form>
        {antigravityCleanupSaved ? (
          <div className="codex-cleanup-action">
            <button className="quiet-button" disabled={cleaningAgyThreads} onClick={() => void cleanupAntigravity()}>
              {cleaningAgyThreads ? <CircleNotch className="spin" size={15} /> : <Trash size={15} />}
              <span>{cleaningAgyThreads ? "Cleaning…" : "Clean up old Antigravity sessions"}</span>
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
