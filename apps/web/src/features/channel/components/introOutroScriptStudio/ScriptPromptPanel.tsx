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
  const [partCopyState, setPartCopyState] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    setCopyState("idle");
    setPartCopyState(0);
  }, [revision.revision_id]);

  const partDelimiter = "================================================================================\nPART 2:";
  const isTwoPart = Boolean(prompt && prompt.includes("PART 1:") && prompt.includes(partDelimiter));
  const part2Index = prompt ? prompt.indexOf(partDelimiter) : -1;
  const part1Text = isTwoPart && part2Index !== -1 ? prompt.slice(0, part2Index).trim() : "";
  const part2Text = isTwoPart && part2Index !== -1 ? prompt.slice(part2Index).trim() : "";

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
    if (part2Index === -1) return;
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
            <div className="script-part-box" aria-labelledby={`${revision.revision_id}-part1-title`}>
              <div className="script-part-box-header">
                <div>
                  <h4 id={`${revision.revision_id}-part1-title`}>Part 1 · The Run-Up & Stunt</h4>
                  <span>0.0s – {midpoint}s</span>
                </div>
                <button
                  type="button"
                  className="quiet-button"
                  onClick={() => void copySubPart(1)}
                  disabled={loading || !prompt}
                  aria-live="polite"
                >
                  {partCopyState === 1 ? <Check size={16} /> : <Copy size={16} />}
                  {partCopyState === 1 ? "Copied Part 1" : "Copy Part 1"}
                </button>
              </div>
              <textarea
                aria-label={`${kindLabel} final video prompt (Part 1)`}
                value={part1Text}
                readOnly
                rows={10}
                spellCheck={false}
              />
            </div>

            <div className="script-part-box" aria-labelledby={`${revision.revision_id}-part2-title`}>
              <div className="script-part-box-header">
                <div>
                  <h4 id={`${revision.revision_id}-part2-title`}>Part 2 · Momentum & Farewell</h4>
                  <span>{midpoint}s – {duration}s</span>
                </div>
                <button
                  type="button"
                  className="quiet-button"
                  onClick={() => void copySubPart(2)}
                  disabled={loading || !prompt}
                  aria-live="polite"
                >
                  {partCopyState === 2 ? <Check size={16} /> : <Copy size={16} />}
                  {partCopyState === 2 ? "Copied Part 2" : "Copy Part 2"}
                </button>
              </div>
              <textarea
                aria-label={`${kindLabel} final video prompt (Part 2)`}
                value={part2Text}
                readOnly
                rows={10}
                spellCheck={false}
              />
            </div>
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
