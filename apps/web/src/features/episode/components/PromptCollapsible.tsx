import { useState } from "react";

export function PromptCollapsible({ prompt }: { prompt: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = prompt.length > 120;
  if (!isLong) {
    return <p className="bundle-prompt-text">{prompt}</p>;
  }
  return (
    <div className="bundle-prompt-collapsible">
      <p className={`bundle-prompt-text ${expanded ? "is-expanded" : "is-collapsed"}`}>{expanded ? prompt : `${prompt.slice(0, 120)}…`}</p>
      <button type="button" className="prompt-toggle-btn" onClick={() => setExpanded(!expanded)}>
        {expanded ? "Collapse prompt ▲" : "View full prompt ▼"}
      </button>
    </div>
  );
}
