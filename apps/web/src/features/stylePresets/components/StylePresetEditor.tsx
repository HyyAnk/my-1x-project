import { useEffect, useState, type FormEvent } from "react";
import type { CreateStylePresetInput, StylePreset, UpdateStylePresetInput } from "@studio/shared";

type Props = {
  preset?: StylePreset | null;
  defaultValues: CreateStylePresetInput;
  pending?: boolean;
  error?: string | null;
  onSave: (input: CreateStylePresetInput | UpdateStylePresetInput) => Promise<void> | void;
  onCancel?: () => void;
  styleOptions: Record<
    "thinking_bar_style" | "question_box_style" | "answer_card_style" | "counter_style" | "background_style",
    readonly string[]
  >;
};

export function StylePresetEditor({ preset, defaultValues, pending = false, error, onSave, onCancel, styleOptions }: Props) {
  const [name, setName] = useState(preset?.name ?? defaultValues.name);
  const [description, setDescription] = useState(preset?.description ?? defaultValues.description ?? "");
  const [values, setValues] = useState(defaultValues);
  useEffect(() => {
    setName(preset?.name ?? defaultValues.name);
    setDescription(preset?.description ?? defaultValues.description ?? "");
    setValues(defaultValues);
  }, [defaultValues.description, defaultValues.name, preset]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await onSave({ ...values, name, description });
  };
  const setSlot = (field: keyof typeof values, value: string) => setValues((current) => ({ ...current, [field]: value }));
  const slotLabels = {
    thinking_bar_style: "Thinking bar",
    question_box_style: "Question box",
    answer_card_style: "Answer card",
    counter_style: "Counter",
    background_style: "Background",
  } as const;
  return (
    <form onSubmit={submit} aria-label={preset ? "Edit style preset" : "Create style preset"}>
      <label>
        Name
        <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} disabled={pending} />
      </label>
      <label>
        Description
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} disabled={pending} />
      </label>
      {(Object.keys(styleOptions) as Array<keyof typeof styleOptions>).map((field) => (
        <label key={field}>
          {slotLabels[field]}
          <select value={values[field]} onChange={(event) => setSlot(field, event.target.value)} disabled={pending}>
            {styleOptions[field].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      ))}
      {error ? <div role="alert">{error}</div> : null}
      <button type="submit" disabled={pending || !name.trim()}>
        {pending ? "Saving" : "Save"}
      </button>
      {onCancel ? (
        <button type="button" onClick={onCancel} disabled={pending}>
          Cancel
        </button>
      ) : null}
    </form>
  );
}
