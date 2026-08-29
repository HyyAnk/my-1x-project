import type { Scene } from "@studio/shared";

export interface SceneOverlayEditorProps {
  scene: Scene;
  overlay: NonNullable<Scene["editorial_overlay"]>;
  processing: boolean;
  mergePending: boolean;
  onChange: (scene: Scene) => void;
  list: (value: string) => string[];
}

export function parseOverlayData(value: string): Array<{ label: string; value: string | number; unit: string }> {
  return value
    .split(",")
    .map((entry) => {
      const [label = "", rawValue = "", unit = ""] = entry.split("|").map((part) => part.trim());
      const numericValue = Number(rawValue);
      return { label, value: rawValue && Number.isFinite(numericValue) ? numericValue : rawValue, unit };
    })
    .filter((item) => item.label && item.value !== "");
}

export function SceneOverlayEditor({ scene, overlay, onChange, list }: SceneOverlayEditorProps) {
  return (
    <details className="shot-metadata">
      <summary>Production metadata</summary>
      <div className="shot-metadata-grid">
        <label>
          Asset type
          <select
            value={scene.asset_type}
            onChange={(event) => onChange({ ...scene, asset_type: event.target.value as Scene["asset_type"] })}
          >
            <option value="archive">Archive</option>
            <option value="document">Document</option>
            <option value="map">Map</option>
            <option value="diagram">Diagram</option>
            <option value="ai_reconstruction">AI reconstruction</option>
            <option value="contemporary">Contemporary</option>
            <option value="transition">Transition</option>
          </select>
        </label>
        <label>
          Continuity bundle
          <input
            value={scene.continuity_bundle_id}
            onChange={(event) => onChange({ ...scene, continuity_bundle_id: event.target.value })}
          />
        </label>
        <label>
          Reference assets
          <input
            value={scene.reference_asset_ids.join(", ")}
            onChange={(event) => onChange({ ...scene, reference_asset_ids: list(event.target.value) })}
          />
        </label>
        <label>
          Source IDs
          <input value={scene.source_ids.join(", ")} onChange={(event) => onChange({ ...scene, source_ids: list(event.target.value) })} />
        </label>
        <label>
          Sound cue
          <input value={scene.sound_cue} onChange={(event) => onChange({ ...scene, sound_cue: event.target.value })} />
        </label>
      </div>
      <div className="editorial-overlay-editor">
        <div className="block-heading">
          <span>Editorial overlay</span>
          <span>{overlay.kind === "none" ? "None" : "Edit layer"}</span>
        </div>
        <div className="shot-metadata-grid">
          <label>
            Overlay kind
            <select
              value={overlay.kind}
              onChange={(event) =>
                onChange({ ...scene, editorial_overlay: { ...overlay, kind: event.target.value as typeof overlay.kind } })
              }
            >
              <option value="none">None</option>
              <option value="caption">Caption</option>
              <option value="stat_card">Stat card</option>
              <option value="timeline">Timeline</option>
              <option value="bar_chart">Bar chart</option>
              <option value="line_chart">Line chart</option>
              <option value="map_callout">Map callout</option>
              <option value="comparison">Comparison</option>
              <option value="quote">Quote</option>
            </select>
          </label>
          <label>
            Motion
            <select
              value={overlay.motion}
              onChange={(event) =>
                onChange({ ...scene, editorial_overlay: { ...overlay, motion: event.target.value as typeof overlay.motion } })
              }
            >
              <option value="none">None</option>
              <option value="fade_up">Fade up</option>
              <option value="slide_in">Slide in</option>
              <option value="draw_on">Draw on</option>
              <option value="count_up">Count up</option>
              <option value="highlight">Highlight</option>
            </select>
          </label>
          <label>
            Placement
            <select
              value={overlay.placement}
              onChange={(event) =>
                onChange({ ...scene, editorial_overlay: { ...overlay, placement: event.target.value as typeof overlay.placement } })
              }
            >
              <option value="lower_third">Lower third</option>
              <option value="upper_left">Upper left</option>
              <option value="upper_right">Upper right</option>
              <option value="center">Center</option>
              <option value="side_panel">Side panel</option>
            </select>
          </label>
          <label>
            Overlay duration
            <input
              type="number"
              min="0.5"
              max="20"
              step="0.5"
              value={overlay.duration_seconds ?? ""}
              onChange={(event) =>
                onChange({
                  ...scene,
                  editorial_overlay: { ...overlay, duration_seconds: event.target.value ? Number(event.target.value) : null },
                })
              }
            />
          </label>
          <label className="overlay-text-field">
            Overlay text
            <input
              value={overlay.text}
              placeholder="Only when the viewer needs context"
              onChange={(event) => onChange({ ...scene, editorial_overlay: { ...overlay, text: event.target.value } })}
            />
          </label>
          <label className="overlay-text-field">
            Overlay sources
            <input
              value={overlay.source_ids.join(", ")}
              placeholder="C01, C02"
              onChange={(event) => onChange({ ...scene, editorial_overlay: { ...overlay, source_ids: list(event.target.value) } })}
            />
          </label>
          <label className="overlay-text-field">
            Chart data <span className="field-hint">label | value | unit, comma separated</span>
            <input
              value={overlay.data.map((item) => [item.label, item.value, item.unit].filter((value) => value !== "").join(" | ")).join(", ")}
              placeholder="1956 | 1 | program"
              onChange={(event) => onChange({ ...scene, editorial_overlay: { ...overlay, data: parseOverlayData(event.target.value) } })}
            />
          </label>
        </div>
      </div>
    </details>
  );
}
