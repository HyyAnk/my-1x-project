import { useState } from "react";
import { DEFAULT_QUIZ_SHORT_TITLE_CANVAS, type QuizShortTitleCanvas } from "@studio/shared";
import { TITLE_CANVAS_FIELDS, titleCanvasError } from "../utils/titleCanvas";

type Props = {
  pairId: string;
  initial: QuizShortTitleCanvas;
  saving: boolean;
  onChange: (canvas: QuizShortTitleCanvas) => void;
  onSave: (canvas: QuizShortTitleCanvas) => void;
  onCancel: () => void;
};

/** Pixel inputs for the blank area of the intro loop where the quiz title is drawn. */
export function TitleCanvasEditor({ pairId, initial, saving, onChange, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState<QuizShortTitleCanvas>(initial);
  const error = titleCanvasError(draft);
  const update = (next: QuizShortTitleCanvas) => {
    setDraft(next);
    onChange(next);
  };
  return (
    <form
      className="short-bookend-canvas-editor"
      onSubmit={(event) => {
        event.preventDefault();
        if (!error) onSave(draft);
      }}
    >
      <div className="short-bookend-canvas-fields">
        {TITLE_CANVAS_FIELDS.map(({ key, label }) => (
          <label key={key} htmlFor={`${pairId}-canvas-${key}`}>
            {label}
            <input
              id={`${pairId}-canvas-${key}`}
              type="number"
              min={0}
              step={10}
              value={draft[key]}
              onChange={(event) => update({ ...draft, [key]: Number(event.target.value) })}
            />
          </label>
        ))}
      </div>
      {error ? (
        <span role="alert" className="short-bookend-field-error">
          {error}
        </span>
      ) : null}
      <div className="short-bookend-canvas-actions">
        <button type="button" className="quiet-button" onClick={() => update(DEFAULT_QUIZ_SHORT_TITLE_CANVAS)}>
          Reset
        </button>
        <button type="button" className="quiet-button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="primary-button" disabled={Boolean(error) || saving}>
          {saving ? "Saving..." : "Save title area"}
        </button>
      </div>
    </form>
  );
}
