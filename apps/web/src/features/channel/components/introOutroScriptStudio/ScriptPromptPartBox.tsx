import { Check, Copy } from "@phosphor-icons/react";

type Props = {
  titleId: string;
  title: string;
  timeRange: string;
  partNumber: 1 | 2;
  isCopied: boolean;
  copyDisabled: boolean;
  textAriaLabel: string;
  text: string;
  onCopy: () => void;
};

export function ScriptPromptPartBox({
  titleId,
  title,
  timeRange,
  partNumber,
  isCopied,
  copyDisabled,
  textAriaLabel,
  text,
  onCopy,
}: Props) {
  return (
    <div className="script-part-box" aria-labelledby={titleId}>
      <div className="script-part-box-header">
        <div>
          <h4 id={titleId}>{title}</h4>
          <span>{timeRange}</span>
        </div>
        <button type="button" className="quiet-button" onClick={onCopy} disabled={copyDisabled} aria-live="polite">
          {isCopied ? <Check size={16} /> : <Copy size={16} />}
          {isCopied ? `Copied Part ${partNumber}` : `Copy Part ${partNumber}`}
        </button>
      </div>
      <textarea aria-label={textAriaLabel} value={text} readOnly rows={10} spellCheck={false} />
    </div>
  );
}
