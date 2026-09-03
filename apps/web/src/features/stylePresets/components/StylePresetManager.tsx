import { useMemo, useState } from "react";
import { BUILT_IN_PRESETS, type CreateStylePresetInput, type StylePreset } from "@studio/shared";
import { useStylePresets } from "../hooks/useStylePresets";
import { StylePresetEditor } from "./StylePresetEditor";

const defaultValues: CreateStylePresetInput = {
  name: "New Preset",
  description: "",
  icon: "🎨",
  palette_id: "lime",
  theme: "candy_arcade",
  thinking_bar_style: "star_slider",
  question_box_style: "candy_pop",
  answer_card_style: "glossy_arcade",
  counter_style: "hanging_woodsign",
  background_style: "candy_rays",
};

function toInput(preset: StylePreset): CreateStylePresetInput {
  const { id: _id, revision: _revision, created_at: _created, updated_at: _updated, ...input } = preset;
  return input;
}

export function StylePresetManager() {
  const state = useStylePresets();
  const [editing, setEditing] = useState<StylePreset | null>(null);
  const [creating, setCreating] = useState(false);
  const builtIns = useMemo(() => BUILT_IN_PRESETS.length, []);
  return (
    <section aria-label="Style presets">
      <header>
        <h2>Style Presets</h2>
        <button type="button" onClick={() => setCreating(true)}>
          New preset
        </button>
      </header>
      {state.loading ? <p>Loading</p> : null}
      {state.error ? <p role="alert">{state.error}</p> : null}
      <p>{state.presets.length + builtIns} presets</p>
      <ul>
        {state.presets.map((preset) => (
          <li key={preset.id}>
            <span>{preset.name}</span>
            <button type="button" onClick={() => setEditing(preset)}>
              Edit
            </button>
            <button type="button" onClick={() => void state.duplicate(preset)}>
              Duplicate
            </button>
            <button type="button" onClick={() => void state.remove(preset.id)} disabled={state.mutation !== null}>
              Delete
            </button>
          </li>
        ))}
      </ul>
      {creating ? (
        <StylePresetEditor
          defaultValues={defaultValues}
          pending={state.mutation === "create"}
          error={state.error}
          onCancel={() => setCreating(false)}
          onSave={async (input) => {
            await state.create(input as CreateStylePresetInput);
            setCreating(false);
          }}
        />
      ) : null}
      {editing ? (
        <StylePresetEditor
          preset={editing}
          defaultValues={toInput(editing)}
          pending={state.mutation === "update"}
          error={state.error}
          onCancel={() => setEditing(null)}
          onSave={async (input) => {
            await state.update(editing.id, input);
            setEditing(null);
          }}
        />
      ) : null}
    </section>
  );
}
