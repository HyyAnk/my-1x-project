import { useState, useEffect, useMemo } from "react";
import { X, PencilSimple, Check, CircleNotch, Info } from "@phosphor-icons/react";
import { getMascotPoses, getMascotSlotDefaultPreset, type MascotPosePreset } from "@studio/shared";

export interface SlotPromptModalProps {
  isOpen: boolean;
  state: "thinking" | "celebrate";
  slotIndex: number;
  initialPrompt?: string;
  styleKeyword?: string;
  styleName?: string;
  onClose: () => void;
  onSave: (prompt: string) => Promise<void> | void;
  isSubmitting?: boolean;
}

export function SlotPromptModal({
  isOpen,
  state,
  slotIndex,
  initialPrompt = "",
  styleKeyword = "",
  styleName = "Active Style",
  onClose,
  onSave,
  isSubmitting = false,
}: SlotPromptModalProps) {
  const [prompt, setPrompt] = useState(initialPrompt);

  useEffect(() => {
    if (isOpen) {
      setPrompt(initialPrompt);
    }
  }, [isOpen, initialPrompt]);

  const poses = useMemo<MascotPosePreset[]>(() => getMascotPoses(state), [state]);

  const categories = useMemo(() => {
    const cats: Record<string, MascotPosePreset[]> = {};
    for (const p of poses) {
      if (!cats[p.category]) {
        cats[p.category] = [];
      }
      cats[p.category].push(p);
    }
    return cats;
  }, [poses]);

  // Determine which preset matches the current prompt, if any
  const matchingPose = useMemo(() => {
    if (!prompt.trim()) return undefined;
    const trimmed = prompt.trim().toLowerCase();
    return poses.find((p) => p.prompt.trim().toLowerCase() === trimmed);
  }, [poses, prompt]);

  const selectedPresetValue = matchingPose ? matchingPose.id : prompt.trim() ? "custom" : "";

  const handlePresetSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) {
      setPrompt("");
      return;
    }
    if (val === "custom") {
      return;
    }
    const found = poses.find((p) => p.id === val);
    if (found) {
      setPrompt(found.prompt);
    }
  };

  if (!isOpen) return null;

  const stateLabel = state === "thinking" ? "Thinking" : "Celebrate";
  const slotDefaultPreset = getMascotSlotDefaultPreset(state, slotIndex);
  const defaultPlaceholder = `Leave empty to let the server automatically assign an unused pose from the 20-pose library (default slot preset: "${slotDefaultPreset}")`;

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await onSave(prompt.trim());
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="modal slot-prompt-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="slot-prompt-title"
        style={{ maxWidth: "520px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-heading">
          <div className="style-modal-title-group">
            <span className="style-modal-eyebrow">
              <PencilSimple size={14} weight="bold" />
              <span>{stateLabel} Variant Customization</span>
            </span>
            <h2 id="slot-prompt-title">Edit Action Prompt &mdash; Slot {slotIndex}</h2>
          </div>
          <button type="button" className="icon-button" aria-label="Close" onClick={onClose} disabled={isSubmitting}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body" style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <div className="slot-prompt-inheritance-card">
              <div className="slot-inheritance-header">
                <Info size={16} className="slot-inheritance-icon" />
                <span className="slot-inheritance-title">
                  Inherited Style: <strong>{styleName}</strong>
                </span>
              </div>
              <p className="slot-inheritance-text">
                {styleKeyword ? (
                  <>
                    Theme keyword: <em>&ldquo;{styleKeyword}&rdquo;</em>.
                  </>
                ) : (
                  <>Default mascot style (no additional wardrobe keyword).</>
                )}{" "}
                Style keyword and core character identity are <strong>automatically inherited</strong>. Use this field only to specify the
                particular pose, expression, or action.
              </p>
            </div>

            {/* Pose Preset Selector Dropdown */}
            <div className="form-group">
              <label htmlFor="slot-preset-selector">Pose Preset Library ({stateLabel} &mdash; 20 Curated Poses)</label>
              <select
                id="slot-preset-selector"
                className="slot-preset-dropdown"
                value={selectedPresetValue}
                onChange={handlePresetSelectChange}
                disabled={isSubmitting}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  background: "var(--input-bg, #1a1a1a)",
                  color: "var(--text, #fff)",
                  border: "1px solid var(--line, #333)",
                }}
              >
                <option value="">Select a preset pose...</option>
                {Object.entries(categories).map(([category, items]) => (
                  <optgroup key={category} label={category}>
                    {items.map((pose) => (
                      <option key={pose.id} value={pose.id}>
                        {pose.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
                <option value="custom">Custom / Freeform Prompt</option>
              </select>
              <span className="form-field-hint">
                Select a curated pose from the library or choose &ldquo;Custom / Freeform Prompt&rdquo; to define your own.
              </span>
            </div>

            <div className="form-group">
              <label htmlFor="slot-prompt-modifier-input">Slot Action / Pose Modifier</label>
              <textarea
                id="slot-prompt-modifier-input"
                className="full-prompt-textarea"
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={defaultPlaceholder}
                disabled={isSubmitting}
                style={{ width: "100%", fontSize: "13px", resize: "vertical" }}
              />
              <span className="form-field-hint">
                Leave empty to have the server automatically assign a random unused pose from the 20-pose library.
              </span>
            </div>
          </div>

          <div className="modal-actions" style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button type="button" className="quiet-button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <CircleNotch size={16} className="spin" />
                  <span>Saving Prompt...</span>
                </>
              ) : (
                <>
                  <Check size={16} weight="bold" />
                  <span>Save Prompt</span>
                </>
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
