import { useState } from "react";
import { Eye } from "@phosphor-icons/react";

export function TopicLayoutPreviewButton({ quizFormat }: { quizFormat: string }) {
  const isVisualChoices = quizFormat === "odd_one_out";
  const isImageGuess = quizFormat === "image_guess";
  const isTrueFalse = quizFormat === "true_false";
  const [showPreview, setShowPreview] = useState(false);

  const layoutInfo = isVisualChoices
    ? {
        id: "visual_choices_three",
        name: "3 Visual Choices (A, B, C)",
        badge: "🎨 3 Visual Choices",
        tagClass: "tag-visual",
        btnClass: "is-visual-choices",
        icon: "🎨",
        format: "Odd One Out",
        desc: "Each option (A, B, C) is a dedicated square illustration (501×500px), displayed side-by-side in 3 columns.",
        assets: "3 separate option illustrations",
      }
    : isImageGuess
      ? {
          id: "media_left_choices_right",
          name: "Image Guess (Media Left + Choices Right)",
          badge: "🖼️ Image Guess",
          tagClass: "tag-media",
          btnClass: "is-media-left",
          icon: "🖼️",
          format: "Image Guess",
          desc: "1 large Hero clue illustration (580px) on the left with vertical multiple-choice text cards on the right.",
          assets: "1 large Hero clue illustration",
        }
      : isTrueFalse
        ? {
            id: "media_left_choices_right",
            name: "True / False (2 choices)",
            badge: "⚖️ True / False (2 Choices)",
            tagClass: "tag-tf",
            btnClass: "is-true-false",
            icon: "⚖️",
            format: "True / False",
            desc: "1 large Hero illustration (580px) on the left with 2 prominent TRUE / FALSE cards on the right.",
            assets: "1 large Hero illustration",
          }
        : {
            id: "media_left_choices_right",
            name: "Media Left + Choices Right",
            badge: "🖼️ Media Left + Choices Right",
            tagClass: "tag-media",
            btnClass: "is-media-left",
            icon: "🖼️",
            format: "Multiple Choice / Knowledge",
            desc: "1 large Hero illustration (580px) on the left with vertical multiple-choice text cards on the right.",
            assets: "1 large Hero illustration",
          };

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

              {isVisualChoices ? (
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
              ) : isTrueFalse ? (
                <div className="wf-media-row">
                  <div className="wf-hero-box">
                    <div className="wf-hero-icon">🖼️</div>
                    <div className="wf-hero-lbl">HERO IMAGE (580px)</div>
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
