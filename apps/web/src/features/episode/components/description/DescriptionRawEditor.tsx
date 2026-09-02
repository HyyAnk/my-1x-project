import { CircleNotch, FloppyDisk } from "@phosphor-icons/react";

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
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <textarea
        rows={12}
        value={draftText}
        onChange={(e) => onDraftChange(e.target.value)}
        placeholder="Raw video description text (Markdown formatted)..."
        style={{
          width: "100%",
          padding: "12px",
          background: "rgba(0, 0, 0, 0.35)",
          border: isOverLimit ? "1px solid var(--red, #ef4444)" : "1px solid rgba(255, 255, 255, 0.15)",
          borderRadius: "8px",
          fontSize: "13px",
          lineHeight: "1.6",
          color: "var(--text, #f1f5f9)",
          fontFamily: "monospace",
          resize: "vertical",
        }}
      />

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          className="primary-button compact"
          disabled={saving || !isModified}
          onClick={onSave}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          {saving ? <CircleNotch className="spin" size={15} /> : <FloppyDisk size={15} />}
          <span>{saving ? "Saving..." : "Save Edits"}</span>
        </button>
      </div>
    </div>
  );
}
