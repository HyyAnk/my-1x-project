import { CheckCircle, CircleNotch, FloppyDisk, PlusCircle, WarningCircle } from "@phosphor-icons/react";

interface DescriptionRawEditorProps {
  draftText: string;
  isModified: boolean;
  isOverLimit: boolean;
  saving: boolean;
  onDraftChange: (text: string) => void;
  onSave: () => void;
}

export function DescriptionRawEditor({
  draftText,
  isModified,
  isOverLimit,
  saving,
  onDraftChange,
  onSave,
}: DescriptionRawEditorProps) {
  const handleInsertSnippet = (snippet: string) => {
    const separator = draftText.endsWith("\n\n") ? "" : draftText.endsWith("\n") ? "\n" : "\n\n";
    onDraftChange(draftText + separator + snippet);
  };

  return (
    <div className="description-raw-editor-container">
      <div className="raw-editor-toolbar">
        <div className="raw-editor-helpers">
          <span style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 600, marginRight: "4px" }}>
            Quick Insert:
          </span>
          <button
            type="button"
            className="raw-editor-helper-btn"
            onClick={() => handleInsertSnippet("⏱️ CHAPTERS & TIMESTAMPS:\n00:00 - Introduction\n00:15 - Question 1\n00:45 - Question 2\n01:15 - Question 3\n01:45 - Final Scorecard")}
            title="Insert chapter timestamps template"
          >
            <PlusCircle size={12} style={{ display: "inline", marginRight: "3px" }} />
            <span>Timestamps</span>
          </button>
          <button
            type="button"
            className="raw-editor-helper-btn"
            onClick={() => handleInsertSnippet("🏆 SCORING TIERS:\n• 1 correct: Beginner\n• 2-3 correct: Intermediate\n• 4-5 correct: Expert / Master\n\nHow many questions did you answer correctly? Comment below!")}
            title="Insert scoring tiers leaderboard template"
          >
            <PlusCircle size={12} style={{ display: "inline", marginRight: "3px" }} />
            <span>Scoring CTA</span>
          </button>
          <button
            type="button"
            className="raw-editor-helper-btn"
            onClick={() => handleInsertSnippet("#quiz #trivia #challenge #brainchallenge #knowledge")}
            title="Insert standard quiz hashtags"
          >
            <PlusCircle size={12} style={{ display: "inline", marginRight: "3px" }} />
            <span>Hashtags</span>
          </button>
        </div>

        <div>
          {isModified ? (
            <span className="raw-editor-status unsaved">
              <WarningCircle size={13} weight="fill" />
              <span>Unsaved changes</span>
            </span>
          ) : (
            <span className="raw-editor-status saved">
              <CheckCircle size={13} weight="fill" />
              <span>All changes saved</span>
            </span>
          )}
        </div>
      </div>

      <textarea
        rows={13}
        className={`raw-editor-textarea ${isOverLimit ? "is-overflow" : ""}`}
        value={draftText}
        onChange={(e) => onDraftChange(e.target.value)}
        placeholder="Raw video description text (Markdown formatted, supports chapter timestamps and hashtags)..."
      />

      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "10px" }}>
        <button
          type="button"
          className="primary-button compact"
          disabled={saving || !isModified}
          onClick={onSave}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          {saving ? <CircleNotch className="spin" size={15} /> : <FloppyDisk size={15} />}
          <span>{saving ? "Saving Changes..." : "Save Edits"}</span>
        </button>
      </div>
    </div>
  );
}
