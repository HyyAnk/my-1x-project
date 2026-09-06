import type { LayoutMeta } from "../constants/layoutPreviewCatalog";

export type LayoutWireframeModalProps = {
  layoutId: string;
  layoutInfo: LayoutMeta;
};

export function LayoutWireframeModal({ layoutId, layoutInfo }: LayoutWireframeModalProps) {
  const isPortrait = layoutId.startsWith("portrait_");

  return (
    <div className="topic-layout-popover" role="tooltip">
      <div className="popover-arrow" />
      <div className="popover-header">
        <div className="popover-badge-row">
          <span className={`popover-tag ${layoutInfo.tagClass}`}>{layoutInfo.badge}</span>
          <code className="popover-code">{layoutInfo.id}</code>
        </div>
        <p className="popover-desc">{layoutInfo.desc}</p>
      </div>

      <div className="popover-wireframe-wrap">
        <div className={`wireframe-screen ${isPortrait ? "is-portrait" : ""}`}>
          {isPortrait && (
            <div className="wf-portrait-rail" title="TikTok/Reels Right Action Rail Clearance">
              <span className="wf-rail-icon">❤️</span>
              <span className="wf-rail-icon">💬</span>
              <span className="wf-rail-icon">↗</span>
              <span className="wf-rail-icon">🎵</span>
            </div>
          )}

          <div className="wf-top-row">
            <span className="wf-sign">Q1</span>
            <div className="wf-title">Question prompt goes here...</div>
          </div>

          {layoutId === "portrait_hero_choices" ? (
            <div className="wf-portrait-hero-body">
              <div className="wf-portrait-hero">
                <div className="wf-portrait-hero-icon">📱</div>
                <div className="wf-portrait-hero-lbl">HERO IMAGE (860×500)</div>
              </div>
              <div className="wf-portrait-choices">
                <div className="wf-choice-pill">
                  <b>A</b> <span>Choice A</span>
                </div>
                <div className="wf-choice-pill">
                  <b>B</b> <span>Choice B</span>
                </div>
                <div className="wf-choice-pill">
                  <b>C</b> <span>Choice C</span>
                </div>
              </div>
              <div className="wf-rail-clearance-indicator">
                <span>⇄ Clears Right Action Rail</span>
              </div>
            </div>
          ) : layoutId === "portrait_split_versus" ? (
            <div className="wf-portrait-versus-body">
              <div className="wf-portrait-versus-card wf-versus-a">
                <div className="wf-versus-icon">🔴</div>
                <div className="wf-versus-lbl">Contender A (Top)</div>
              </div>
              <div className="wf-versus-vs-badge">VS</div>
              <div className="wf-portrait-versus-card wf-versus-b">
                <div className="wf-versus-icon">🔵</div>
                <div className="wf-versus-lbl">Contender B (Bottom)</div>
              </div>
              <div className="wf-rail-clearance-indicator">
                <span>⇄ Clears Right Action Rail</span>
              </div>
            </div>
          ) : layoutId === "portrait_verdict_tf" ? (
            <div className="wf-portrait-verdict-body">
              <div className="wf-portrait-hero">
                <div className="wf-portrait-hero-icon">⚖️</div>
                <div className="wf-portrait-hero-lbl">HERO VISUAL (860×540)</div>
              </div>
              <div className="wf-choices-col wf-choices-tf wf-portrait-tf-row">
                <div className="wf-choice-pill wf-tf-true">
                  <b className="wf-badge-true">✓</b> <span>TRUE</span>
                </div>
                <div className="wf-choice-pill wf-tf-false">
                  <b className="wf-badge-false">✗</b> <span>FALSE</span>
                </div>
              </div>
            </div>
          ) : layoutId === "portrait_stack_list" ? (
            <div className="wf-portrait-stack-body">
              <div className="wf-stack-col">
                <div className="wf-choice-pill">
                  <b>A</b> <span>Choice A</span>
                </div>
                <div className="wf-choice-pill">
                  <b>B</b> <span>Choice B</span>
                </div>
                <div className="wf-choice-pill">
                  <b>C</b> <span>Choice C</span>
                </div>
                <div className="wf-choice-pill">
                  <b>D</b> <span>Choice D</span>
                </div>
              </div>
              <div className="wf-mascot-safe-anchor">
                <span>🎭 Mascot Safe Anchor (Above 440px Buffer)</span>
              </div>
            </div>
          ) : layoutId === "clue_deduction" ? (
            <div className="wf-deduction-row">
              <div className="wf-clue-box">
                <div className="wf-clue-badge">CLUE 100% CLEAR</div>
                <div className="wf-clue-icon">🔍</div>
                <div className="wf-clue-lbl">Object / Tool / Dish</div>
              </div>
              <div className="wf-arrow-divider">➔</div>
              <div className="wf-reveal-box">
                <div className="wf-reveal-badge">REVEAL DOCK</div>
                <div className="wf-reveal-icon">✨</div>
                <div className="wf-reveal-lbl">Answer Subject B</div>
              </div>
            </div>
          ) : layoutId === "mystery_reveal" ? (
            <div className="wf-mystery-stage">
              <div className="wf-stage-backdrop">
                <div className="wf-silhouette-box">
                  <span className="wf-mosaic-pattern">▦ ▦ ▦</span>
                  <span className="wf-silhouette-icon">👤</span>
                </div>
                <div className="wf-scanner-beam-line" />
              </div>
              <div className="wf-answer-dock-pill">
                <b>★</b> <span>Answer Reveal Bar</span>
              </div>
            </div>
          ) : layoutId === "split_versus_two" ? (
            <div className="wf-versus-row">
              <div className="wf-versus-card wf-versus-a">
                <div className="wf-versus-icon">🔴</div>
                <div className="wf-versus-lbl">Option A</div>
              </div>
              <div className="wf-versus-vs-badge">VS</div>
              <div className="wf-versus-card wf-versus-b">
                <div className="wf-versus-icon">🔵</div>
                <div className="wf-versus-lbl">Option B</div>
              </div>
            </div>
          ) : layoutId === "visual_choices_three_pure" ? (
            <div className="wf-visual-row wf-visual-pure">
              <div className="wf-visual-card">
                <div className="wf-visual-img" style={{ flex: 1, fontSize: "9px" }}>
                  🖼️ Visual A
                </div>
              </div>
              <div className="wf-visual-card">
                <div className="wf-visual-img" style={{ flex: 1, fontSize: "9px" }}>
                  🖼️ Visual B
                </div>
              </div>
              <div className="wf-visual-card">
                <div className="wf-visual-img" style={{ flex: 1, fontSize: "9px" }}>
                  🖼️ Visual C
                </div>
              </div>
            </div>
          ) : layoutId === "visual_choices_three" ? (
            <div className="wf-visual-row">
              <div className="wf-visual-card">
                <div className="wf-visual-img">🖼️ Option A</div>
                <div className="wf-visual-lbl">
                  <b>A</b> <span>Choice A</span>
                </div>
              </div>
              <div className="wf-visual-card">
                <div className="wf-visual-img">🖼️ Option B</div>
                <div className="wf-visual-lbl">
                  <b>B</b> <span>Choice B</span>
                </div>
              </div>
              <div className="wf-visual-card">
                <div className="wf-visual-img">🖼️ Option C</div>
                <div className="wf-visual-lbl">
                  <b>C</b> <span>Choice C</span>
                </div>
              </div>
            </div>
          ) : layoutId === "verdict_true_false" ? (
            <div className="wf-media-row">
              <div className="wf-hero-box">
                <div className="wf-hero-icon">🖼️</div>
                <div className="wf-hero-lbl">HERO TOPIC (580px)</div>
              </div>
              <div className="wf-choices-col wf-choices-tf">
                <div className="wf-choice-pill wf-tf-true">
                  <b className="wf-badge-true">✓</b> <span>TRUE</span>
                </div>
                <div className="wf-choice-pill wf-tf-false">
                  <b className="wf-badge-false">✗</b> <span>FALSE</span>
                </div>
              </div>
            </div>
          ) : layoutId === "full_stack_list" ? (
            <div className="wf-stack-col">
              <div className="wf-choice-pill">
                <b>A</b> <span>Choice A</span>
              </div>
              <div className="wf-choice-pill">
                <b>B</b> <span>Choice B</span>
              </div>
              <div className="wf-choice-pill">
                <b>C</b> <span>Choice C</span>
              </div>
              <div className="wf-choice-pill">
                <b>D</b> <span>Choice D</span>
              </div>
            </div>
          ) : (
            <div className="wf-media-row">
              <div className="wf-hero-box">
                <div className="wf-hero-icon">🖼️</div>
                <div className="wf-hero-lbl">HERO IMAGE (580px)</div>
              </div>
              <div className="wf-choices-col">
                <div className="wf-choice-pill">
                  <b>A</b> <span>Choice A</span>
                </div>
                <div className="wf-choice-pill">
                  <b>B</b> <span>Choice B</span>
                </div>
                <div className="wf-choice-pill">
                  <b>C</b> <span>Choice C</span>
                </div>
              </div>
            </div>
          )}

          <div className="wf-timer-bar">
            <div className="wf-timer-fill">★ Countdown Timer (Thinking Bar)</div>
          </div>

          {isPortrait && (
            <div className="wf-portrait-safe-zone">
              <span>🛡️ 440px Bottom Caption Safe Zone</span>
            </div>
          )}
        </div>
      </div>

      <div className="popover-meta-footer">
        <div>
          <span>Format:</span> <strong>{layoutInfo.format}</strong>
        </div>
        <div>
          <span>Assets:</span> <strong>{layoutInfo.assets}</strong>
        </div>
      </div>
    </div>
  );
}
