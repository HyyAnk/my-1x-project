import { useState, useEffect, useRef } from "react";
import { Copy, Check, FloppyDisk, ArrowsClockwise } from "@phosphor-icons/react";
import type { ReelPublishingPayload } from "@studio/shared";

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
  const [copied, setCopied] = useState(false);

  const current = publishing ?? {
    hook: "",
    description: "",
    cta: null,
    hashtags: [],
  };

  const [rawHashtags, setRawHashtags] = useState(() => (current.hashtags ?? []).join(", "));
  const lastParsedRef = useRef<string[]>(current.hashtags ?? []);

  useEffect(() => {
    const incoming = publishing?.hashtags ?? [];
    const isSame = incoming.length === lastParsedRef.current.length && incoming.every((val, i) => val === lastParsedRef.current[i]);
    if (!isSame) {
      lastParsedRef.current = incoming;
      setRawHashtags(incoming.join(", "));
    }
  }, [publishing?.hashtags]);

  const handleUpdate = <K extends keyof ReelPublishingPayload>(field: K, value: ReelPublishingPayload[K]) => {
    onChangeDraft({ ...current, [field]: value });
  };

  const handleHashtagsChange = (value: string) => {
    setRawHashtags(value);
    const parsed = value
      .split(",")
      .map((t) => t.trim().replace(/^#/, ""))
      .filter(Boolean);
    lastParsedRef.current = parsed;
    handleUpdate("hashtags", parsed);
  };

  const handleHashtagsBlur = () => {
    const parsed = rawHashtags
      .split(",")
      .map((t) => t.trim().replace(/^#/, ""))
      .filter(Boolean);
    lastParsedRef.current = parsed;
    setRawHashtags(parsed.join(", "));
    handleUpdate("hashtags", parsed);
  };

  const handleCopyFullPublishing = async () => {
    const lines = [
      `HOOK:\n${current.hook}`,
      `\nDESCRIPTION:\n${current.description}`,
      current.cta ? `\nCALL TO ACTION:\n${current.cta}` : "",
      current.hashtags.length > 0 ? `\nHASHTAGS:\n${current.hashtags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ")}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const success = await onCopyText(lines, "Publishing metadata");
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
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
            disabled={!current.hook && !current.description}
            aria-label="Copy Publishing Text"
          >
            {copied ? <Check size={14} weight="bold" /> : <Copy size={14} />}
            <span>{copied ? "Copied" : "Copy Publishing Text"}</span>
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
        <label className="short-reel-label" htmlFor="pub-hook">
          <span>Hook Statement</span>
        </label>
        <textarea
          id="pub-hook"
          rows={2}
          className="short-reel-textarea"
          value={current.hook}
          onChange={(e) => handleUpdate("hook", e.target.value)}
          placeholder="Captivating short-form video opening hook..."
        />
      </div>

      <div className="short-reel-form-group">
        <label className="short-reel-label" htmlFor="pub-description">
          <span>Video Description</span>
        </label>
        <textarea
          id="pub-description"
          rows={4}
          className="short-reel-textarea"
          value={current.description}
          onChange={(e) => handleUpdate("description", e.target.value)}
          placeholder="Full description for YouTube Shorts / TikTok / Reels..."
        />
      </div>

      <div className="short-reel-form-row">
        <div className="short-reel-form-col">
          <label className="short-reel-label" htmlFor="pub-cta">
            <span>Call to Action (Optional)</span>
          </label>
          <input
            id="pub-cta"
            type="text"
            className="short-reel-input"
            value={current.cta ?? ""}
            onChange={(e) => handleUpdate("cta", e.target.value || null)}
            placeholder="e.g. Subscribe for daily wildlife trivia!"
          />
        </div>
        <div className="short-reel-form-col">
          <label className="short-reel-label" htmlFor="pub-hashtags">
            <span>Hashtags (comma-separated)</span>
          </label>
          <input
            id="pub-hashtags"
            type="text"
            className="short-reel-input"
            value={rawHashtags}
            onChange={(e) => handleHashtagsChange(e.target.value)}
            onBlur={handleHashtagsBlur}
            placeholder="shorts, trivia, wildlife"
          />
        </div>
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
              <span>Save Publishing Metadata</span>
            </>
          )}
        </button>
      </div>
    </section>
  );
}
