import { useState } from "react";
import { Copy, Check, ArrowsClockwise, Sparkle } from "@phosphor-icons/react";
import type { ShortReelRecord } from "@studio/shared";
import { shortReelApi } from "../../../api/shortReelApi";

export interface ReelAssetsProps {
  reel: ShortReelRecord;
  onCopyText: (text: string, label?: string) => Promise<boolean>;
  onRegenerateUnit: (target: "cover" | "references") => void;
  isGenerating: boolean;
}

export function ReelAssets({ reel, onCopyText, onRegenerateUnit, isGenerating }: ReelAssetsProps) {
  const [copiedPromptIndex, setCopiedPromptIndex] = useState<number | null>(null);

  const { units } = reel;
  const referencesPayload = units.references.last_accepted_payload;
  const coverPayload = units.cover.last_accepted_payload;
  const scriptPayload = units.script.last_accepted_payload;
  const compiledPrompts = scriptPayload?.compiled_prompts ?? [];
  const assetUrl = (assetId: string) => shortReelApi.getAssetUrl(reel.channel_id, reel.reel_id, assetId);

  const handleCopyPrompt = async (index: number, text: string) => {
    const success = await onCopyText(text, `Prompt ${index + 1}`);
    if (success) {
      setCopiedPromptIndex(index);
      setTimeout(() => setCopiedPromptIndex(null), 2500);
    }
  };

  return (
    <div className="short-reel-assets-grid">
      {/* Visual References Section */}
      <section className="short-reel-card" aria-label="Visual References">
        <div className="short-reel-card-header">
          <div className="short-reel-card-title-group">
            <h3 className="short-reel-card-title">Visual References</h3>
            <span className={`short-reel-badge short-reel-badge-${units.references.state}`}>{units.references.state}</span>
          </div>
          <button
            type="button"
            className="short-reel-secondary-btn"
            disabled={isGenerating}
            onClick={() => onRegenerateUnit("references")}
            aria-label="Regenerate References"
          >
            <ArrowsClockwise size={14} />
            <span>Resolve References</span>
          </button>
        </div>

        <div className="short-reel-references-list">
          {referencesPayload?.references && referencesPayload.references.length > 0 ? (
            referencesPayload.references.map((ref, idx) => (
              <div key={idx} className="short-reel-reference-item">
                <div className="short-reel-reference-info">
                  <span className="short-reel-reference-role">{ref.role}</span>
                  <span className="short-reel-reference-meta">
                    {ref.width}×{ref.height} • {ref.mime_type}
                  </span>
                  <code className="short-reel-reference-hash" title={ref.checksum}>
                    Hash: {ref.checksum.slice(0, 12)}...
                  </code>
                </div>
                <div className="short-reel-reference-preview">
                  <img
                    src={assetUrl(ref.asset_id)}
                    alt={`${ref.role === "mascot" ? "Mascot" : "Style"} reference`}
                    className="short-reel-asset-image"
                    loading="lazy"
                  />
                </div>
                <a href={assetUrl(ref.asset_id)} download={`short-reel-${ref.role}.${ref.mime_type.split("/")[1] ?? "png"}`}>
                  Download
                </a>
              </div>
            ))
          ) : (
            <p className="short-reel-empty-text">No references resolved yet. Generate references or full package.</p>
          )}
        </div>
      </section>

      {/* Cover Image Section */}
      <section className="short-reel-card" aria-label="Cover Image">
        <div className="short-reel-card-header">
          <div className="short-reel-card-title-group">
            <h3 className="short-reel-card-title">Cover Image</h3>
            <span className={`short-reel-badge short-reel-badge-${units.cover.state}`}>{units.cover.state}</span>
          </div>
          <button
            type="button"
            className="short-reel-secondary-btn"
            disabled={isGenerating}
            onClick={() => onRegenerateUnit("cover")}
            aria-label="Regenerate Cover Image"
          >
            <ArrowsClockwise size={14} />
            <span>Regenerate Cover</span>
          </button>
        </div>

        <div className="short-reel-cover-container">
          {coverPayload ? (
            <div className="short-reel-cover-card">
              <div className="short-reel-cover-frame">
                <img src={assetUrl(coverPayload.asset_id)} alt="Short-Reel cover" className="short-reel-cover-image" />
              </div>
              <div className="short-reel-cover-details">
                <span>MIME: {coverPayload.mime_type}</span>
                <code>Checksum: {coverPayload.checksum.slice(0, 16)}...</code>
                <a href={assetUrl(coverPayload.asset_id)} download="short-reel-cover.png" aria-label="Download cover">
                  Download cover
                </a>
              </div>
            </div>
          ) : (
            <div className="short-reel-cover-placeholder">
              <Sparkle size={32} weight="duotone" />
              <p>Cover image not generated yet (1080x1920 vertical portrait).</p>
            </div>
          )}
        </div>
      </section>

      {/* Compiled Flow Prompts Section */}
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
                      onClick={() => handleCopyPrompt(pIdx, promptText)}
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
    </div>
  );
}
