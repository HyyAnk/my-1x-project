import { useState } from "react";
import { Check, Copy } from "@phosphor-icons/react";

export function PromptBox({
  kind,
  value,
  disabled,
  onChange,
}: {
  kind: "intro" | "outro";
  value: string;
  disabled: boolean;
  onChange: (text: string) => void;
}) {
  const [copyStatus, setCopyStatus] = useState("");
  const [subCopyStatus, setSubCopyStatus] = useState<0 | 1 | 2>(0);
  const label = kind === "intro" ? "Intro" : "Outro";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus("Copied");
      setTimeout(() => setCopyStatus(""), 2000);
    } catch {
      setCopyStatus("Copy failed. Select and copy the text.");
    }
  };

  const partDelimiter = "================================================================================\nPART 2:";
  const isTwoPart = kind === "outro" && value.includes("PART 1:") && value.includes(partDelimiter);
  const part2Index = isTwoPart ? value.indexOf(partDelimiter) : -1;
  const part1Text = isTwoPart && part2Index !== -1 ? value.slice(0, part2Index).trim() : "";
  const part2Text = isTwoPart && part2Index !== -1 ? value.slice(part2Index).trim() : "";

  const copySubPart = async (part: 1 | 2) => {
    const textToCopy = part === 1 ? part1Text : part2Text;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setSubCopyStatus(part);
      setTimeout(() => setSubCopyStatus(0), 2000);
    } catch {
      setCopyStatus("Copy failed. Select and copy the text.");
    }
  };

  if (isTwoPart) {
    return (
      <section className="pair-prompt-box pair-prompt-two-part">
        <header>
          <label htmlFor={`pair-prompt-${kind}`}>{label} (16s · 2-Part Sequence)</label>
          <button
            type="button"
            className="quiet-button"
            aria-label={`Copy ${label.toLowerCase()} script`}
            disabled={!value}
            onClick={() => void copy()}
          >
            {copyStatus === "Copied" ? <Check size={16} /> : <Copy size={16} />} Copy Full
          </button>
        </header>

        <div className="pair-two-part-box">
          <div className="pair-sub-box">
            <header>
              <span>Part 1 · The Run-Up & Stunt (0.0s – 8.0s)</span>
              <button
                type="button"
                className="quiet-button"
                aria-label="Copy Part 1 script"
                disabled={!part1Text}
                onClick={() => void copySubPart(1)}
              >
                {subCopyStatus === 1 ? <Check size={16} /> : <Copy size={16} />}
                {subCopyStatus === 1 ? "Copied Part 1" : "Copy Part 1"}
              </button>
            </header>
            <textarea
              aria-label={`${label} script (Part 1)`}
              value={part1Text}
              readOnly
              rows={8}
              spellCheck={false}
            />
          </div>

          <div className="pair-sub-box">
            <header>
              <span>Part 2 · Momentum & Farewell (8.0s – 16.0s)</span>
              <button
                type="button"
                className="quiet-button"
                aria-label="Copy Part 2 script"
                disabled={!part2Text}
                onClick={() => void copySubPart(2)}
              >
                {subCopyStatus === 2 ? <Check size={16} /> : <Copy size={16} />}
                {subCopyStatus === 2 ? "Copied Part 2" : "Copy Part 2"}
              </button>
            </header>
            <textarea
              aria-label={`${label} script (Part 2)`}
              value={part2Text}
              readOnly
              rows={8}
              spellCheck={false}
            />
          </div>
        </div>

        <details className="pair-full-details">
          <summary>Full stitched script editor</summary>
          <textarea
            id={`pair-prompt-${kind}`}
            aria-label={`${label} script`}
            value={value}
            disabled={disabled}
            maxLength={60000}
            placeholder={`Generate or paste an ${kind} script`}
            onChange={(event) => {
              setCopyStatus("");
              onChange(event.target.value);
            }}
          />
        </details>

        {copyStatus ? (
          <span role="status" className="pair-copy-status">
            {copyStatus}
          </span>
        ) : null}
      </section>
    );
  }

  return (
    <section className="pair-prompt-box">
      <header>
        <label htmlFor={`pair-prompt-${kind}`}>{label}</label>
        <button
          type="button"
          className="quiet-button"
          aria-label={`Copy ${label.toLowerCase()} script`}
          disabled={!value}
          onClick={() => void copy()}
        >
          {copyStatus === "Copied" ? <Check size={16} /> : <Copy size={16} />} Copy
        </button>
      </header>
      <textarea
        id={`pair-prompt-${kind}`}
        aria-label={`${label} script`}
        value={value}
        disabled={disabled}
        maxLength={60000}
        placeholder={`Generate or paste an ${kind} script`}
        onChange={(event) => {
          setCopyStatus("");
          onChange(event.target.value);
        }}
      />
      {copyStatus ? (
        <span role="status" className="pair-copy-status">
          {copyStatus}
        </span>
      ) : null}
    </section>
  );
}
