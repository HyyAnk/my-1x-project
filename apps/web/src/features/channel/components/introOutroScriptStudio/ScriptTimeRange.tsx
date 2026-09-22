type Props = { label: string; start: number; end: number; disabled: boolean; onChange: (patch: { start_seconds?: number; end_seconds?: number }) => void };

export function ScriptTimeRange({ label, start, end, disabled, onChange }: Props) {
  return <div className="script-two-column">
    <label className="script-field"><span>Start (seconds)</span><input aria-label={`${label} start`} type="number" min={0} max={10} step={0.1} value={start} disabled={disabled} onChange={(event) => { const value = event.target.valueAsNumber; if (Number.isFinite(value)) onChange({ start_seconds: value }); }} /></label>
    <label className="script-field"><span>End (seconds)</span><input aria-label={`${label} end`} type="number" min={0} max={10} step={0.1} value={end} disabled={disabled} onChange={(event) => { const value = event.target.valueAsNumber; if (Number.isFinite(value)) onChange({ end_seconds: value }); }} /></label>
  </div>;
}
