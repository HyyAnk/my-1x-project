import { useState, useEffect } from "react";
import { X, Sparkle, Plus, CircleNotch } from "@phosphor-icons/react";

export interface StyleCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, keyword: string) => Promise<void> | void;
  isSubmitting?: boolean;
}

export function StyleCreateModal({
  isOpen,
  onClose,
  onCreate,
  isSubmitting = false,
}: StyleCreateModalProps) {
  const [name, setName] = useState("");
  const [keyword, setKeyword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setKeyword("");
      setValidationError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setValidationError("Style name is required");
      return;
    }
    setValidationError(null);
    await onCreate(trimmedName, keyword.trim());
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="modal style-create-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="style-modal-title"
        style={{ maxWidth: "540px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-heading">
          <div className="style-modal-title-group">
            <span className="style-modal-eyebrow">
              <Sparkle size={14} weight="fill" />
              <span>Multi-Style Mascot Studio</span>
            </span>
            <h2 id="style-modal-title">Create New Mascot Style</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Close"
            onClick={onClose}
            disabled={isSubmitting}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <p className="style-modal-intro">
              Add an alternative theme or wardrobe style for this mascot (e.g., Tactical Military, Cyberpunk Detective, Festive Holiday).
              Creating a style unlocks <strong>20 customizable slots</strong> (10 Thinking, 10 Celebrate) without generating them immediately.
            </p>

            <div className="form-group">
              <label htmlFor="style-name-input">
                Style Name <span className="required-star">*</span>
              </label>
              <input
                id="style-name-input"
                type="text"
                className="full-prompt-input"
                placeholder="e.g., Military Squad, Detective, Summer Beach"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                disabled={isSubmitting}
                autoFocus
              />
              {validationError ? <span className="form-field-error">{validationError}</span> : null}
            </div>

            <div className="form-group">
              <label htmlFor="style-keyword-input">
                Style Theme Keyword / Wardrobe Description
              </label>
              <textarea
                id="style-keyword-input"
                className="full-prompt-textarea"
                rows={3}
                placeholder="e.g., tactical military camouflage uniform, beret, tactical gear"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                disabled={isSubmitting}
                style={{ width: "100%", fontSize: "13px", resize: "vertical" }}
              />
              <span className="form-field-hint">
                This keyword will be merged with your mascot&apos;s master prompt across all generated state variants.
              </span>
            </div>
          </div>

          <div
            className="modal-actions"
            style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end", gap: "10px" }}
          >
            <button
              type="button"
              className="quiet-button"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting ? (
                <>
                  <CircleNotch size={16} className="spin" />
                  <span>Creating Style...</span>
                </>
              ) : (
                <>
                  <Plus size={16} weight="bold" />
                  <span>Create Style</span>
                </>
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
