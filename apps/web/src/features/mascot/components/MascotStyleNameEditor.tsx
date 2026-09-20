import { useEffect, useState } from "react";
import { Check, CircleNotch, PencilSimple, X } from "@phosphor-icons/react";

export interface MascotStyleNameEditorProps {
  name: string;
  disabled?: boolean;
  onSave?: (name: string) => Promise<void>;
}

export function MascotStyleNameEditor({ name, disabled = false, onSave }: MascotStyleNameEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => setDraft(name), [name]);

  const cancel = () => {
    setDraft(name);
    setIsEditing(false);
  };

  const save = async () => {
    const nextName = draft.trim();
    if (!onSave || !nextName || nextName === name) {
      cancel();
      return;
    }
    setIsSaving(true);
    try {
      await onSave(nextName);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isEditing || !onSave) {
    return (
      <div className="style-anchor-name-row">
        <span className="style-anchor-name">{name}</span>
        {onSave ? (
          <button
            type="button"
            className="style-anchor-name-action"
            onClick={() => setIsEditing(true)}
            disabled={disabled}
            aria-label={`Rename ${name}`}
            title="Rename mascot style"
          >
            <PencilSimple size={13} />
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <form
      className="style-anchor-name-form"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <input
        className="style-anchor-name-input"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        maxLength={80}
        disabled={disabled || isSaving}
        aria-label="Mascot style name"
        autoFocus
      />
      <button type="submit" className="style-anchor-name-action" disabled={!draft.trim() || disabled || isSaving} aria-label="Save name">
        {isSaving ? <CircleNotch size={13} className="spin" /> : <Check size={13} />}
      </button>
      <button type="button" className="style-anchor-name-action" onClick={cancel} disabled={isSaving} aria-label="Cancel rename">
        <X size={13} />
      </button>
    </form>
  );
}
