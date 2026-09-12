import { useState } from "react";
import { Check, Copy, WarningCircle } from "@phosphor-icons/react";

export interface TaskDrawerErrorSectionProps {
  error: string;
}

export function TaskDrawerErrorSection({ error }: TaskDrawerErrorSectionProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyError = () => {
    void navigator.clipboard.writeText(error);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="task-drawer-section error-section">
      <div className="section-title-row">
        <span className="section-label coral-text">
          <WarningCircle size={14} weight="fill" /> Error Details & Stack
        </span>
        <button className="text-button copy-btn" onClick={handleCopyError}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          <span>{copied ? "Copied" : "Copy Error"}</span>
        </button>
      </div>
      <div className="task-error-code-wrap">
        <pre className="task-error-code">{error}</pre>
      </div>
    </div>
  );
}
