export function SessionCleanupToggle({
  engine,
  enabled,
  disabled,
  onChange,
}: {
  engine: "Codex" | "Antigravity";
  enabled: boolean;
  disabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <label className="session-cleanup-toggle">
      <span>Session cleanup</span>
      <span className="session-cleanup-switch">
        <input
          type="checkbox"
          role="switch"
          aria-label={`Enable ${engine} session cleanup`}
          checked={enabled}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="session-cleanup-track" aria-hidden="true">
          <span>Off</span>
          <span>On</span>
          <i />
        </span>
      </span>
    </label>
  );
}
