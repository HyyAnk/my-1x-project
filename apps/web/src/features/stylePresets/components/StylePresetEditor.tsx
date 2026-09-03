import { useEffect, useState, type FormEvent } from "react";
import type { CreateStylePresetInput, StylePreset, UpdateStylePresetInput } from "@studio/shared";

type Props = {
  preset?: StylePreset | null;
  defaultValues: CreateStylePresetInput;
  pending?: boolean;
  error?: string | null;
  onSave: (input: CreateStylePresetInput | UpdateStylePresetInput) => Promise<void> | void;
  onCancel?: () => void;
};

export function StylePresetEditor({ preset, defaultValues, pending = false, error, onSave, onCancel }: Props) {
  const [name, setName] = useState(preset?.name ?? defaultValues.name);
  const [description, setDescription] = useState(preset?.description ?? defaultValues.description ?? "");
  useEffect(() => {
    setName(preset?.name ?? defaultValues.name);
    setDescription(preset?.description ?? defaultValues.description ?? "");
  }, [defaultValues.description, defaultValues.name, preset]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await onSave({ ...defaultValues, name, description });
  };
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
