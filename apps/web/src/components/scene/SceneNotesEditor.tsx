import type { Scene } from "@studio/shared";

export interface SceneNotesEditorProps {
  scene: Scene;
  processing: boolean;
  mergePending: boolean;
  onChange: (scene: Scene) => void;
}

export function SceneNotesEditor({ scene, processing, mergePending, onChange }: SceneNotesEditorProps) {
  return (
    <div className="scene-notes">
      <input
        aria-label="Transition note"
        placeholder="Transition"
        value={scene.transition_note}
        disabled={processing || mergePending}
        onChange={(event) => onChange({ ...scene, transition_note: event.target.value })}
      />
      <input
        aria-label="Continuity note"
        placeholder="Continuity"
        value={scene.continuity_note}
        disabled={processing || mergePending}
        onChange={(event) => onChange({ ...scene, continuity_note: event.target.value })}
      />
    </div>
  );
}
