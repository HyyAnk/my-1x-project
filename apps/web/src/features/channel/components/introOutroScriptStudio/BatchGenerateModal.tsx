import { useState } from "react";
import { X, Sparkle } from "@phosphor-icons/react";
import type { BatchGenerateIntroOutroScriptsInput, IntroOutroClipKind } from "@studio/shared";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: Omit<BatchGenerateIntroOutroScriptsInput, "style_preset_id">) => Promise<void>;
  busy: boolean;
  hasLockedSeeds?: boolean;
};

export function BatchGenerateModal({ isOpen, onClose, onSubmit, busy, hasLockedSeeds }: Props) {
  const [count, setCount] = useState<number>(5);
  const [strategy, setStrategy] = useState<"random_seeds" | "locked_anchor">("random_seeds");
  const [included, setIncluded] = useState<Record<IntroOutroClipKind, boolean>>({ intro: true, outro: true });
  const [durations, setDurations] = useState<Record<IntroOutroClipKind, number>>({ intro: 8, outro: 8 });
  const [logoMode, setLogoMode] = useState<"supplied_reference" | "post_overlay" | "none">("supplied_reference");
  const [namingPrefix, setNamingPrefix] = useState<string>("");

  if (!isOpen) return null;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const includedClips = (["intro", "outro"] as const).filter((k) => included[k]);
    if (!includedClips.length) return;

    await onSubmit({
      count,
      strategy,
      locked_seed_ids: [],
      durations,
      included_clips: includedClips,
      logo_mode: logoMode,
      ...(namingPrefix.trim() ? { naming_prefix: namingPrefix.trim() } : {}),
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="batch-generate-title">
      <div className="modal-container batch-generate-modal">
        <div className="modal-header">
          <div className="modal-title-group">
            <Sparkle size={20} weight="fill" className="batch-sparkle-icon" />
            <h3 id="batch-generate-title">Batch Script Generation</h3>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close dialog" disabled={busy}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={(e) => void handleFormSubmit(e)} className="batch-generate-form">
          <div className="batch-form-field">
            <label htmlFor="batch-count-select">Number of script pairs</label>
            <div className="batch-count-options">
              {[3, 5, 8, 10].map((option) => (
                <button
                  type="button"
                  key={option}
                  className={`quiet-button ${count === option ? "active" : ""}`}
                  onClick={() => setCount(option)}
                  disabled={busy}
                >
                  {option} pairs
                </button>
              ))}
              <input
                id="batch-count-select"
                type="number"
                min={1}
                max={20}
                value={count}
                onChange={(e) => setCount(Math.max(1, Math.min(20, Number(e.target.value))))}
                disabled={busy}
                className="batch-count-input"
                aria-label="Custom pair count"
              />
            </div>
            <p className="field-hint">Generates {count} distinct script projects concurrently.</p>
          </div>

          <div className="batch-form-field">
            <label>Creative seed strategy</label>
            <div className="batch-radio-group">
              <label className="batch-radio-label">
                <input
                  type="radio"
                  name="strategy"
                  value="random_seeds"
                  checked={strategy === "random_seeds"}
                  onChange={() => setStrategy("random_seeds")}
                  disabled={busy}
                />
                <span>
                  <strong>Full Randomization (Maximum Variety)</strong>
                  <small>Generates distinct hooks, motion beats, and dialogue for each pair</small>
                </span>
              </label>
              {hasLockedSeeds ? (
                <label className="batch-radio-label">
                  <input
                    type="radio"
                    name="strategy"
                    value="locked_anchor"
                    checked={strategy === "locked_anchor"}
                    onChange={() => setStrategy("locked_anchor")}
                    disabled={busy}
                  />
                  <span>
                    <strong>Anchor Locked Seeds</strong>
                    <small>Keep locked creative seeds fixed and vary the rest across pairs</small>
                  </span>
                </label>
              ) : null}
            </div>
          </div>

          <div className="batch-form-row">
            <div className="batch-form-field">
              <label htmlFor="batch-logo-mode">Logo presentation</label>
              <select
                id="batch-logo-mode"
                value={logoMode}
                onChange={(e) => setLogoMode(e.target.value as "supplied_reference" | "post_overlay" | "none")}
                disabled={busy}
              >
                <option value="supplied_reference">In-Scene 3D Reveal</option>
                <option value="post_overlay">Editor Overlay</option>
                <option value="none">No Logo</option>
              </select>
            </div>
            <div className="batch-form-field">
              <label htmlFor="batch-naming-prefix">Project naming prefix (optional)</label>
              <input
                id="batch-naming-prefix"
                type="text"
                value={namingPrefix}
                placeholder="e.g. Series Concept"
                onChange={(e) => setNamingPrefix(e.target.value)}
                disabled={busy}
                maxLength={40}
              />
            </div>
          </div>

          <div className="batch-form-field">
            <label>Clip options</label>
            <div className="batch-clip-toggles">
              {(["intro", "outro"] as const).map((kind) => (
                <div key={kind} className="batch-clip-toggle-row">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={included[kind]}
                      onChange={(e) => setIncluded({ ...included, [kind]: e.target.checked })}
                      disabled={busy}
                    />
                    <span>{kind === "intro" ? "Intro Clip" : "Outro Clip"}</span>
                  </label>
                  <select
                    value={durations[kind]}
                    onChange={(e) => setDurations({ ...durations, [kind]: Number(e.target.value) })}
                    disabled={busy || !included[kind]}
                    aria-label={`${kind} duration`}
                  >
                    {[6, 7, 8, 9, 10].map((sec) => (
                      <option key={sec} value={sec}>
                        {sec}s
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="quiet-button" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={busy || (!included.intro && !included.outro) || count < 1}
            >
              {busy ? "Starting Batch..." : `Generate ${count} Pairs`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
