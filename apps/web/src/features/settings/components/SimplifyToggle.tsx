export function SimplifyToggle({ enabled, onChange }: { enabled: boolean; onChange: (enabled: boolean) => void }) {
  return (
    <label className="segmented-switch">
      <input
        type="checkbox"
        role="switch"
        aria-label="Toggle Simplify mode"
        checked={enabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="segmented-switch-track" aria-hidden="true">
        <span>Off</span>
        <span>On</span>
        <i />
      </span>
    </label>
  );
}
