import { useEffect, useState } from "react";
import { Check, Copy } from "@phosphor-icons/react";
import type { IntroOutroScriptRevision } from "@studio/shared";
import { useScriptPromptPreview } from "../../hooks/useScriptPromptPreview";

type Props = {
  revision: IntroOutroScriptRevision;
  onLoadPrompt: (revisionId: string) => Promise<string>;
};

export function ScriptPromptPanel({ revision, onLoadPrompt }: Props) {
  const { prompt, loading, error, retry } = useScriptPromptPreview(revision.revision_id, onLoadPrompt);
  const [copyState, setCopyState] = useState<"idle" | "copying" | "copied" | "failed">("idle");

  useEffect(() => setCopyState("idle"), [revision.revision_id]);

  const copyPrompt = async () => {
    if (!prompt || copyState === "copying") return;
    setCopyState("copying");
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  const kindLabel = revision.clip_kind === "intro" ? "Intro" : "Outro";
  return (
    <section className="script-prompt-panel" aria-labelledby={`${revision.revision_id}-prompt-title`}>
      <header>
        <div>
          <h3 id={`${revision.revision_id}-prompt-title`}>Final video prompt</h3>
          <span>
            {kindLabel} · Revision {revision.revision_number}
          </span>
        </div>
        <button
          type="button"
          className="primary-button"
          onClick={() => void copyPrompt()}
          disabled={loading || !prompt || copyState === "copying"}
          aria-live="polite"
        >
          {copyState === "copied" ? <Check size={16} /> : <Copy size={16} />}
          {copyState === "copying" ? "Copying..." : copyState === "copied" ? "Copied" : "Copy full prompt"}
        </button>
      </header>

      {loading ? (
        <div className="script-prompt-loading" role="status">
          Loading final prompt...
        </div>
      ) : null}
      {error ? (
        <div className="script-alert error" role="alert">
          <span>{error}</span>
          <button type="button" className="quiet-button" onClick={retry}>
            Retry
          </button>
        </div>
      ) : null}
      {!loading && !error ? (
        <textarea aria-label={`${kindLabel} final video prompt`} value={prompt} readOnly rows={12} spellCheck={false} />
      ) : null}
      {copyState === "failed" ? (
        <p className="script-prompt-copy-error" role="alert">
          Copy failed. Select the prompt text and copy it manually.
        </p>
      ) : null}
    </section>
  );
}
