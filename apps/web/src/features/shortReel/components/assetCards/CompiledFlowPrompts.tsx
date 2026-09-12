import { Copy, Check } from "@phosphor-icons/react";

export interface CompiledFlowPromptsProps {
  compiledPrompts: string[];
  copiedPromptIndex: number | null;
  onCopyPrompt: (index: number, text: string) => void;
}

export function CompiledFlowPrompts({
  compiledPrompts,
  copiedPromptIndex,
  onCopyPrompt,
}: CompiledFlowPromptsProps) {
  return (
    <section className="short-reel-card short-reel-card-fullwidth" aria-label="Flow Prompts">
      <div className="short-reel-card-header">
        <div className="short-reel-card-title-group">
          <h3 className="short-reel-card-title">Compiled Flow Generation Prompts</h3>
          <span className="short-reel-badge">3 Segments</span>
        </div>
      </div>

      {compiledPrompts.length === 3 ? (
        <div className="short-reel-prompts-grid">
          {compiledPrompts.map((promptText, pIdx) => {
            const isCopied = copiedPromptIndex === pIdx;
            return (
              <div key={pIdx} className="short-reel-prompt-item">
                <div className="short-reel-prompt-header">
                  <span className="short-reel-prompt-title">
                    Segment {pIdx + 1} ({pIdx === 0 ? "Generate" : "Extend"})
                  </span>
                  <button
                    type="button"
                    className="short-reel-copy-btn"
                    onClick={() => onCopyPrompt(pIdx, promptText)}
                    aria-label={`Copy Prompt for Segment ${pIdx + 1}`}
                  >
                    {isCopied ? <Check size={14} weight="bold" /> : <Copy size={14} />}
                    <span>{isCopied ? "Copied" : "Copy Prompt"}</span>
                  </button>
                </div>
                <pre className="short-reel-prompt-code">{promptText}</pre>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="short-reel-empty-text">Prompts will be compiled once the script is generated and accepted.</p>
      )}
    </section>
  );
}
