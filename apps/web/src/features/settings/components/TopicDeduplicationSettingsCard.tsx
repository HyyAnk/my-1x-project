import type { FormEvent } from "react";
import { ArrowsClockwise, CircleNotch, FloppyDisk } from "@phosphor-icons/react";
import { StatusLine } from "../../../components/AppChrome";

export interface TopicDeduplicationSettingsCardProps {
  historyEnabled: boolean;
  setHistoryEnabled: (val: boolean) => void;
  passThreshold: number;
  setPassThreshold: (val: number) => void;
  ttlDays: number;
  setTtlDays: (val: number) => void;
  autoRemix: boolean;
  setAutoRemix: (val: boolean) => void;
  savingHistory: boolean;
  onSaveHistory: (event: FormEvent) => void | Promise<void>;
}

export function TopicDeduplicationSettingsCard({
  historyEnabled,
  setHistoryEnabled,
  passThreshold,
  setPassThreshold,
  ttlDays,
  setTtlDays,
  autoRemix,
  setAutoRemix,
  savingHistory,
  onSaveHistory,
}: TopicDeduplicationSettingsCardProps) {
  return (
    <section className="panel history-settings-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Content Quality & Anti-Duplicate</p>
          <h2>Question History & Duplicate Gate</h2>
        </div>
        <ArrowsClockwise size={22} />
      </div>
      <StatusLine label="History check" value={historyEnabled ? "Enabled" : "Disabled"} />
      <StatusLine label="Pass history threshold" value={`<= ${passThreshold} duplicate questions`} />
      <StatusLine label="Retention period (TTL)" value={`${ttlDays} days`} />
      <form className="codex-form" onSubmit={(event) => void onSaveHistory(event)}>
        <label className="checkbox-label" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
          <input type="checkbox" checked={historyEnabled} onChange={(event) => setHistoryEnabled(event.target.checked)} />
          <span>Enable Question History Duplicate Check</span>
        </label>

        <label>
          Pass History Threshold (Maximum allowed duplicates to auto-pass)
          <input
            type="number"
            min="0"
            max="20"
            step="1"
            value={passThreshold}
            onChange={(event) => setPassThreshold(Number(event.target.value))}
          />
          <small className="field-help">
            Example: 2 means if an episode has 2 or fewer duplicate questions, the pipeline continues building automatically without
            pausing.
          </small>
        </label>

        <label>
          History Retention Period (TTL in Days)
          <input type="number" min="1" max="365" step="1" value={ttlDays} onChange={(event) => setTtlDays(Number(event.target.value))} />
          <small className="field-help">
            Default: 30 days. Questions older than this period are pruned automatically to optimize memory.
          </small>
        </label>

        <label className="checkbox-label" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
          <input type="checkbox" checked={autoRemix} onChange={(event) => setAutoRemix(event.target.checked)} />
          <span>Auto-remix duplicate questions with AI during generation</span>
        </label>

        <button className="primary-button" disabled={savingHistory}>
          {savingHistory ? <CircleNotch className="spin" size={16} /> : <FloppyDisk size={16} />}
          <span>Save History Settings</span>
        </button>
      </form>
    </section>
  );
}
