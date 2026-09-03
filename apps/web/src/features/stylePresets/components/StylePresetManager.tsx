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
  const [status, setStatus] = useState<string | null>(null);
  const builtIns = useMemo(() => BUILT_IN_PRESETS.length, []);
  const styleOptions = useMemo(
    () => ({
      thinking_bar_style: [...new Set(BUILT_IN_PRESETS.map((preset) => preset.thinking_bar_style))],
      question_box_style: [...new Set(BUILT_IN_PRESETS.map((preset) => preset.question_box_style))],
      answer_card_style: [...new Set(BUILT_IN_PRESETS.map((preset) => preset.answer_card_style))],
      counter_style: [...new Set(BUILT_IN_PRESETS.map((preset) => preset.counter_style))],
      background_style: [...new Set(BUILT_IN_PRESETS.map((preset) => preset.background_style).filter(Boolean))] as string[],
    }),
    [],
  );
  return (
    <section aria-label="Style presets">
      <header>
        <h2>Style Presets</h2>
        <button
          type="button"
          onClick={() => {
            setStatus(null);
            setCreating(true);
          }}
          disabled={state.mutation !== null}
        >
          New preset
        </button>
      </header>
      {state.loading ? <p>Loading</p> : null}
      {state.error ? <p role="alert">{state.error}</p> : null}
      {status ? <p role="status">{status}</p> : null}
      <p>{state.presets.length + builtIns} presets</p>
      <ul>
        {state.presets.map((preset) => (
          <li key={preset.id}>
            <span>{preset.name}</span>
            <button type="button" onClick={() => setEditing(preset)}>
              Edit
            </button>
            <button
              type="button"
              onClick={() =>
                void state
                  .duplicate(preset)
                  .then(() => setStatus("Preset duplicated"))
                  .catch(() => undefined)
              }
              disabled={state.mutation !== null}
            >
              Duplicate
            </button>
            <button
              type="button"
              onClick={() =>
                void state
                  .remove(preset.id)
                  .then(() => setStatus("Preset deleted"))
                  .catch(() => undefined)
              }
              disabled={state.mutation !== null}
            >
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
          styleOptions={styleOptions}
          onSave={async (input) => {
            await state.create(input as CreateStylePresetInput);
            setStatus("Preset saved");
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
          styleOptions={styleOptions}
          onSave={async (input) => {
            await state.update(editing.id, input);
            setStatus("Preset saved");
            setEditing(null);
          }}
        />
      ) : null}
    </section>
  );
}
