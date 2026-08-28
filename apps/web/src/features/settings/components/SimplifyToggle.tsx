export function SimplifyToggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <label className="session-cleanup-switch">
      <input
        type="checkbox"
        role="switch"
        aria-label="Toggle Simplify mode"
        checked={enabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="session-cleanup-track" aria-hidden="true">
        <span>Off</span>
        <span>On</span>
        <i />
      </span>
    </label>
  );
}
