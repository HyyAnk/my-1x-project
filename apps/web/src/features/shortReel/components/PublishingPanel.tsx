import { useState } from "react";
import { Copy, Check, FloppyDisk, ArrowsClockwise } from "@phosphor-icons/react";
import type { ReelPublishingPayload } from "@studio/shared";
import { formatPublishingText } from "../utils/publishingText";

export interface PublishingPanelProps {
  publishing: ReelPublishingPayload | null;
  isSaving: boolean;
  isGenerating: boolean;
  onSavePublishing: (updated: ReelPublishingPayload) => Promise<void>;
  onRegeneratePublishing: () => void;
  onCopyText: (text: string, label?: string) => Promise<boolean>;
  onChangeDraft: (draft: ReelPublishingPayload) => void;
}

export function PublishingPanel({
  publishing,
  isSaving,
  isGenerating,
  onSavePublishing,
  onRegeneratePublishing,
  onCopyText,
  onChangeDraft,
}: PublishingPanelProps) {
  const [copiedCombined, setCopiedCombined] = useState(false);
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [copiedDescription, setCopiedDescription] = useState(false);

  const current = publishing ?? {
    title: "",
    description: "",
  };

  const handleUpdate = <K extends keyof ReelPublishingPayload>(field: K, value: ReelPublishingPayload[K]) => {
    onChangeDraft({ ...current, [field]: value });
  };

  const handleCopyTitle = async () => {
    const success = await onCopyText(current.title, "Title");
    if (success) {
      setCopiedTitle(true);
      setTimeout(() => setCopiedTitle(false), 2500);
    }
  };

  const handleCopyDescription = async () => {
    const success = await onCopyText(current.description, "Description");
    if (success) {
      setCopiedDescription(true);
      setTimeout(() => setCopiedDescription(false), 2500);
    }
  };

  const handleCopyFullPublishing = async () => {
    const text = formatPublishingText(current);
    const success = await onCopyText(text, "Publishing metadata");
    if (success) {
      setCopiedCombined(true);
      setTimeout(() => setCopiedCombined(false), 2500);
    }
  };

  return (
    <section className="short-reel-card short-reel-publishing-panel" aria-label="Publishing Metadata">
      <div className="short-reel-card-header">
        <div className="short-reel-card-title-group">
          <h3 className="short-reel-card-title">Publishing & Distribution</h3>
          <span className="short-reel-badge">Metadata</span>
        </div>
        <div className="short-reel-header-actions">
          <button
            type="button"
            className="short-reel-secondary-btn"
            onClick={handleCopyFullPublishing}
            disabled={!current.title && !current.description}
            aria-label="Copy Publishing Text"
          >
            {copiedCombined ? <Check size={14} weight="bold" /> : <Copy size={14} />}
            <span>{copiedCombined ? "Copied" : "Copy Publishing Text"}</span>
          </button>
          <button
            type="button"
            className="short-reel-secondary-btn"
            disabled={isGenerating}
            onClick={onRegeneratePublishing}
            aria-label="Regenerate Publishing Metadata"
          >
            <ArrowsClockwise size={14} />
            <span>Regenerate</span>
          </button>
        </div>
      </div>

      <div className="short-reel-form-group">
        <div className="short-reel-field-header">
          <label className="short-reel-label" htmlFor="pub-title">
            Title
          </label>
          <div className="short-reel-field-actions">
            <span className={`short-reel-char-counter ${current.title.length > 80 ? "short-reel-char-counter-warn" : ""}`}>
              {current.title.length}/80
            </span>
            <button
              type="button"
              className="short-reel-icon-btn"
              onClick={handleCopyTitle}
              disabled={!current.title}
              aria-label="Copy Title"
              title="Copy Title"
            >
              {copiedTitle ? <Check size={14} weight="bold" /> : <Copy size={14} />}
            </button>
          </div>
        </div>
        <input
          id="pub-title"
          name="Title"
          type="text"
          className="short-reel-input"
          value={current.title}
          onChange={(e) => handleUpdate("title", e.target.value)}
          placeholder="Concise hook title..."
        />
      </div>

      <div className="short-reel-form-group">
        <div className="short-reel-field-header">
          <label className="short-reel-label" htmlFor="pub-description">
            Description
          </label>
          <div className="short-reel-field-actions">
            <span className={`short-reel-char-counter ${current.description.length > 600 ? "short-reel-char-counter-warn" : ""}`}>
              {current.description.length}/600
            </span>
            <button
              type="button"
              className="short-reel-icon-btn"
              onClick={handleCopyDescription}
              disabled={!current.description}
              aria-label="Copy Description"
              title="Copy Description"
            >
              {copiedDescription ? <Check size={14} weight="bold" /> : <Copy size={14} />}
            </button>
          </div>
        </div>
        <textarea
          id="pub-description"
          name="Description"
          rows={6}
          className="short-reel-textarea"
          value={current.description}
          onChange={(e) => handleUpdate("description", e.target.value)}
          placeholder="Description including hashtags and call to action..."
        />
      </div>

      <div className="short-reel-form-actions">
        <button
          type="button"
          className="short-reel-primary-btn"
          disabled={isSaving}
          onClick={() => onSavePublishing(current)}
          aria-label="Save Publishing Details"
        >
          {isSaving ? (
            <>
              <span className="short-reel-spinner" aria-hidden="true" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <FloppyDisk size={16} weight="bold" />
              <span>Save Publishing Details</span>
            </>
          )}
        </button>
      </div>
    </section>
  );
}
