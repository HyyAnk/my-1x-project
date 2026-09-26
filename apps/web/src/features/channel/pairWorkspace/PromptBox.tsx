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
  const label = kind === "intro" ? "Intro" : "Outro";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus("Copied");
    } catch {
      setCopyStatus("Copy failed. Select and copy the text.");
    }
  };
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
