import type { IntroOutroScriptContent } from "@studio/shared";

type Props = { content: IntroOutroScriptContent; disabled: boolean; onChange: (content: IntroOutroScriptContent) => void };

export function ScriptProductionDirections({ content, disabled, onChange }: Props) {
  const directions = content.production_directions;
  if (!directions) return <p>Legacy script: regenerate to add explicit production directions</p>;
  const update = (patch: Partial<typeof directions>) => onChange({ ...content, production_directions: { ...directions, ...patch } });
  return (
    <div className="script-two-column">
      <label className="script-field">
        <span>Reference mode</span>
        <select
          value={directions.reference_mode}
          disabled={disabled}
          onChange={(event) => update({ reference_mode: event.target.value === "first_frame" ? "first_frame" : "character_reference" })}
        >
          <option value="character_reference">Character reference</option>
          <option value="first_frame">First frame</option>
        </select>
      </label>
      <label className="script-field">
        <span>Logo handling</span>
        <select
          value={directions.logo_mode}
          disabled={disabled}
          onChange={(event) =>
            update({
              logo_mode:
                event.target.value === "post_overlay"
                  ? "post_overlay"
                  : event.target.value === "supplied_reference"
                    ? "supplied_reference"
                    : "none",
            })
          }
        >
          <option value="post_overlay">Overlay in editor</option>
          <option value="supplied_reference">Video reference</option>
          <option value="none">No logo</option>
        </select>
      </label>
      <label className="script-field">
        <span>Voice source</span>
        <select
          value={directions.voice_source}
          disabled={disabled}
          onChange={(event) =>
            update({ voice_source: event.target.value === "narrator" ? "narrator" : event.target.value === "mascot" ? "mascot" : "none" })
          }
        >
          <option value="narrator">Off-screen narrator</option>
          <option value="mascot">Mascot speech</option>
          <option value="none">No speech</option>
        </select>
      </label>
      <label className="script-field">
        <span>Final hold (seconds)</span>
        <input
          type="number"
          min={0.5}
          max={2}
          step={0.1}
          value={directions.end_hold_seconds}
          disabled={disabled}
          onChange={(event) => {
            const value = event.target.valueAsNumber;
            if (Number.isFinite(value)) update({ end_hold_seconds: value });
          }}
        />
      </label>
      <label className="script-field">
        <span>Opening state</span>
        <textarea
          value={directions.opening_state}
          disabled={disabled}
          onChange={(event) => update({ opening_state: event.target.value })}
        />
      </label>
      <label className="script-field">
        <span>Closing state</span>
        <textarea
          value={directions.closing_state}
          disabled={disabled}
          onChange={(event) => update({ closing_state: event.target.value })}
        />
      </label>
      <label className="script-field">
        <span>Logo placement</span>
        <textarea
          value={directions.logo_placement}
          disabled={disabled}
          onChange={(event) => update({ logo_placement: event.target.value })}
        />
      </label>
    </div>
  );
}
