import { useState } from "react";
import { Eye } from "@phosphor-icons/react";

export type TopicLayoutPreviewButtonProps = {
  quizFormat: string;
  archetype?: string;
  layoutId?: string;
};

type LayoutMeta = {
  id: string;
  name: string;
  badge: string;
  tagClass: string;
  btnClass: string;
  icon: string;
  format: string;
  desc: string;
  assets: string;
};

function resolveLayoutMeta(quizFormat: string, archetype?: string, layoutId?: string): { id: string; meta: LayoutMeta } {
  let resolvedId = layoutId;

  if (!resolvedId && archetype) {
    switch (archetype) {
      case "mystery_reveal":
        resolvedId = "mystery_reveal";
        break;
      case "clue_deduction":
        resolvedId = "clue_deduction";
        break;
      case "versus_faceoff":
        resolvedId = "split_versus_two";
        break;
      case "visual_spotting":
        resolvedId = "visual_choices_three_pure";
        break;
      case "visual_identification":
        resolvedId = "visual_choices_three";
        break;
      case "speed_blitz":
        resolvedId = "full_stack_list";
        break;
      case "verdict_true_false":
      case "verdict_fact_myth":
        resolvedId = "verdict_true_false";
        break;
      case "deep_trivia":
        resolvedId = "media_left_choices_right";
        break;
    }
  }

  if (!resolvedId) {
    if (quizFormat === "odd_one_out") resolvedId = "visual_choices_three";
    else if (quizFormat === "true_false") resolvedId = "verdict_true_false";
    else resolvedId = "media_left_choices_right";
  }

  switch (resolvedId) {
    case "clue_deduction":
      return {
        id: "clue_deduction",
        meta: {
          id: "clue_deduction",
          name: "Clue Deduction (Clue A → Reveal B)",
          badge: "🔍 Clue Deduction",
          tagClass: "tag-deduction",
          btnClass: "is-clue-deduction",
          icon: "🔍",
          format: "Image Guess / Deduction",
          desc: "Clue image A is clearly presented. When the countdown completes, answer image B and the explanation card slide into view synchronously.",
          assets: "1 clue image A + 1 answer image B",
        },
      };

    case "mystery_reveal":
      return {
        id: "mystery_reveal",
        meta: {
          id: "mystery_reveal",
          name: "Mystery Reveal (Silhouette / Scanner)",
          badge: "✨ Mystery Reveal",
          tagClass: "tag-mystery",
          btnClass: "is-mystery-reveal",
          icon: "✨",
          format: "Image Guess / Silhouette",
          desc: "Hidden subject obscured by silhouette or pixelated mosaic against studio background. A cyan laser line sweeps across to reveal the crisp subject.",
          assets: "1 subject image on clean background (auto-pixelated)",
        },
      };

    case "split_versus_two":
      return {
        id: "split_versus_two",
        meta: {
          id: "split_versus_two",
          name: "Split Versus (1v1 Face-off)",
          badge: "⚔️ Versus 1v1",
          tagClass: "tag-versus",
          btnClass: "is-split-versus",
          icon: "⚔️",
          format: "Versus Face-off",
          desc: "Two balanced columns showing contenders A vs B side-by-side with a central VS emblem. Ideal for comparing speed, power, or voting.",
          assets: "2 contender images (A and B)",
        },
      };

    case "visual_choices_three_pure":
      return {
        id: "visual_choices_three_pure",
        meta: {
          id: "visual_choices_three_pure",
          name: "3 Visual Pure (Unlabeled Spotting)",
          badge: "🖼️ 3 Visual Pure",
          tagClass: "tag-visual",
          btnClass: "is-visual-choices",
          icon: "🖼️",
          format: "Odd One Out / Spotting",
          desc: "3 full-bleed visual cards without text, optimized for spotting differences, anomalies, or real vs synthetic challenges.",
          assets: "3 high-definition illustrations (A, B, C)",
        },
      };

    case "visual_choices_three":
      return {
        id: "visual_choices_three",
        meta: {
          id: "visual_choices_three",
          name: "3 Visual Choices (Labeled A, B, C)",
          badge: "🎨 3 Visual Choices",
          tagClass: "tag-visual",
          btnClass: "is-visual-choices",
          icon: "🎨",
          format: "Visual Identification",
          desc: "3 square image cards placed in parallel with clear text labels below each image for subject identification.",
          assets: "3 option illustrations (A, B, C)",
        },
      };

    case "verdict_true_false":
      return {
        id: "verdict_true_false",
        meta: {
          id: "verdict_true_false",
          name: "True or False",
          badge: "⚖️ True or False",
          tagClass: "tag-tf",
          btnClass: "is-true-false",
          icon: "⚖️",
          format: "True / False",
          desc: "1 prominent illustration on the left paired with 2 large verdict buttons: TRUE (Green) and FALSE (Red) on the right.",
          assets: "1 main hero subject illustration",
        },
      };

    case "full_stack_list":
      return {
        id: "full_stack_list",
        meta: {
          id: "full_stack_list",
          name: "Speed Blitz (4-Option Stack)",
          badge: "⚡ Speed Blitz",
          tagClass: "tag-stack",
          btnClass: "is-full-stack",
          icon: "⚡",
          format: "Fast Trivia / Speed Blitz",
          desc: "High-focus rapid challenge with 4 vertical stacked choices filling the screen, tailored for fast logic, tricky riddles, and verbal reflex.",
          assets: "Question prompt & 4 choices (optional subtle background)",
        },
      };

    case "media_left_choices_right":
    default:
      return {
        id: "media_left_choices_right",
        meta: {
          id: "media_left_choices_right",
          name: "Deep Trivia (Image Left + Choices Right)",
          badge: "📚 Deep Trivia",
          tagClass: "tag-media",
          btnClass: "is-media-left",
          icon: "📚",
          format: "Multiple Choice / Knowledge",
          desc: "Classic broadcast layout: 1 high-quality hero subject illustration on the left, 3 stacked choice cards on the right.",
          assets: "1 large hero subject image",
        },
      };
  }
}

export function TopicLayoutPreviewButton({ quizFormat, archetype, layoutId }: TopicLayoutPreviewButtonProps) {
  const [showPreview, setShowPreview] = useState(false);
  const { id, meta: layoutInfo } = resolveLayoutMeta(quizFormat, archetype, layoutId);

  return (
    <div
      className="topic-layout-trigger-wrap"
      onMouseEnter={() => setShowPreview(true)}
      onMouseLeave={() => setShowPreview(false)}
      onFocus={() => setShowPreview(true)}
      onBlur={() => setShowPreview(false)}
    >
      <button
        type="button"
        className={`topic-layout-badge-btn ${layoutInfo.btnClass}`}
        aria-label={`Layout: ${layoutInfo.name}`}
        onClick={(e) => {
          e.preventDefault();
          setShowPreview((prev) => !prev);
        }}
      >
        <span className="topic-layout-badge-icon">{layoutInfo.icon}</span>
        <span className="topic-layout-badge-text">{layoutInfo.name}</span>
        <Eye size={12} className="topic-layout-eye" />
      </button>

      {showPreview ? (
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
            <div className="wireframe-screen">
              <div className="wf-top-row">
                <span className="wf-sign">Q1</span>
                <div className="wf-title">Question prompt goes here...</div>
              </div>

              {id === "clue_deduction" ? (
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
              ) : id === "mystery_reveal" ? (
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
              ) : id === "split_versus_two" ? (
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
              ) : id === "visual_choices_three_pure" ? (
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
              ) : id === "visual_choices_three" ? (
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
              ) : id === "verdict_true_false" ? (
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
              ) : id === "full_stack_list" ? (
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
      ) : null}
    </div>
  );
}
