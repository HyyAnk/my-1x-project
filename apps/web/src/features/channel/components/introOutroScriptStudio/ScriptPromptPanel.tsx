import { useEffect, useState } from "react";
import { Check, Copy } from "@phosphor-icons/react";
import type { IntroOutroScriptRevision } from "@studio/shared";
import { useScriptPromptPreview } from "../../hooks/useScriptPromptPreview";
import { splitTwoPartScriptPrompt } from "../../utils/twoPartScriptPrompt";
import { ScriptPromptPartBox } from "./ScriptPromptPartBox";

type Props = {
  revision: IntroOutroScriptRevision;
  onLoadPrompt: (revisionId: string) => Promise<string>;
};

export function ScriptPromptPanel({ revision, onLoadPrompt }: Props) {
  const { prompt, loading, error, retry } = useScriptPromptPreview(revision.revision_id, onLoadPrompt);
  const [copyState, setCopyState] = useState<"idle" | "copying" | "copied" | "failed">("idle");
  const [partCopyState, setPartCopyState] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    setCopyState("idle");
    setPartCopyState(0);
  }, [revision.revision_id]);

  const { isTwoPart, hasPartTwoDelimiter, partOneText: part1Text, partTwoText: part2Text } = splitTwoPartScriptPrompt(prompt);

  const duration = revision.content?.production?.target_duration_seconds ?? 16;
  const midpoint = (duration / 2).toFixed(1);

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

  const copySubPart = async (part: 1 | 2) => {
    if (!prompt) return;
    if (!hasPartTwoDelimiter) return;
    const textToCopy = part === 1 ? part1Text : part2Text;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setPartCopyState(part);
      setTimeout(() => setPartCopyState(0), 2000);
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
            {isTwoPart ? ` · 2-Part Sequence (${duration}s)` : ""}
          </span>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
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
        </div>
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
      {!loading && !error && isTwoPart ? (
        <div className="script-two-part-container">
          <div className="script-two-part-grid">
            <ScriptPromptPartBox
              titleId={`${revision.revision_id}-part1-title`}
              title="Part 1 · The Run-Up & Stunt"
              timeRange={`0.0s – ${midpoint}s`}
              partNumber={1}
              isCopied={partCopyState === 1}
              copyDisabled={loading || !prompt}
              textAriaLabel={`${kindLabel} final video prompt (Part 1)`}
              text={part1Text}
              onCopy={() => void copySubPart(1)}
            />

            <ScriptPromptPartBox
              titleId={`${revision.revision_id}-part2-title`}
              title="Part 2 · Momentum & Farewell"
              timeRange={`${midpoint}s – ${duration}s`}
              partNumber={2}
              isCopied={partCopyState === 2}
              copyDisabled={loading || !prompt}
              textAriaLabel={`${kindLabel} final video prompt (Part 2)`}
              text={part2Text}
              onCopy={() => void copySubPart(2)}
            />
          </div>

          <details className="script-full-prompt-details">
            <summary>View full stitched prompt</summary>
            <div className="script-full-prompt-content">
              <textarea aria-label={`${kindLabel} final video prompt`} value={prompt} readOnly rows={10} spellCheck={false} />
            </div>
          </details>
        </div>
      ) : null}
      {!loading && !error && !isTwoPart ? (
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
