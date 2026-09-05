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
          name: "Clue Deduction (Manh Mối A → B)",
          badge: "🔍 Clue Deduction",
          tagClass: "tag-deduction",
          btnClass: "is-clue-deduction",
          icon: "🔍",
          format: "Image Guess / Deduction",
          desc: "Ảnh manh mối A (công cụ/món ăn) rõ nét 100%. Khi đếm ngược xong, ảnh đáp án B và thẻ kết quả trượt mở đồng bộ.",
          assets: "1 ảnh manh mối A + 1 ảnh đáp án B",
        },
      };

    case "mystery_reveal":
      return {
        id: "mystery_reveal",
        meta: {
          id: "mystery_reveal",
          name: "Mystery Reveal (Bóng Đen / Scanner)",
          badge: "✨ Mystery Reveal",
          tagClass: "tag-mystery",
          btnClass: "is-mystery-reveal",
          icon: "✨",
          format: "Image Guess / Silhouette",
          desc: "Chủ thể ẩn dạng bóng đen / pixelate mosaic trên nền studio trắng. Tia laser cyan quét ngang hé lộ chủ thể thật cực nét.",
          assets: "1 ảnh chủ thể nền trắng (tự động pixelate)",
        },
      };

    case "split_versus_two":
      return {
        id: "split_versus_two",
        meta: {
          id: "split_versus_two",
          name: "Split Versus (Đối Đầu 1v1)",
          badge: "⚔️ Versus 1v1",
          tagClass: "tag-versus",
          btnClass: "is-split-versus",
          icon: "⚔️",
          format: "Versus Face-off",
          desc: "2 cột so găng trực diện A vs B cân bằng với huy hiệu VS ở giữa. Thích hợp so sánh sức mạnh, tốc độ hoặc chọn phe.",
          assets: "2 ảnh thực thể đối đầu (A và B)",
        },
      };

    case "visual_choices_three_pure":
      return {
        id: "visual_choices_three_pure",
        meta: {
          id: "visual_choices_three_pure",
          name: "3 Visual Pure (Soi Tranh Không Chữ)",
          badge: "🖼️ 3 Visual Pure",
          tagClass: "tag-visual",
          btnClass: "is-visual-choices",
          icon: "🖼️",
          format: "Odd One Out / Spotting",
          desc: "3 ô ảnh cực lớn không chữ chiếm trọn không gian, tối ưu cho thử thách soi tranh, tìm điểm bất thường hoặc thật vs giả.",
          assets: "3 hình minh họa độ nét cao A, B, C",
        },
      };

    case "visual_choices_three":
      return {
        id: "visual_choices_three",
        meta: {
          id: "visual_choices_three",
          name: "3 Visual Choices (Có Nhãn A, B, C)",
          badge: "🎨 3 Visual Choices",
          tagClass: "tag-visual",
          btnClass: "is-visual-choices",
          icon: "🎨",
          format: "Visual Identification",
          desc: "3 ô ảnh hình vuông (A, B, C) đặt song song với nhãn chữ bên dưới từng ảnh để người xem nhận diện.",
          assets: "3 hình minh họa phương án A, B, C",
        },
      };

    case "verdict_true_false":
      return {
        id: "verdict_true_false",
        meta: {
          id: "verdict_true_false",
          name: "Fact or Myth (Đúng hay Sai)",
          badge: "⚖️ Fact or Myth",
          tagClass: "tag-tf",
          btnClass: "is-true-false",
          icon: "⚖️",
          format: "True / False",
          desc: "1 ảnh minh họa lớn bên trái kết hợp 2 nút phán xét khổng lồ ĐÚNG (Xanh) và SAI (Đỏ) bên phải.",
          assets: "1 ảnh minh họa chủ đề chính",
        },
      };

    case "full_stack_list":
      return {
        id: "full_stack_list",
        meta: {
          id: "full_stack_list",
          name: "Speed Blitz (Danh Sách 4 Phương Án)",
          badge: "⚡ Speed Blitz",
          tagClass: "tag-stack",
          btnClass: "is-full-stack",
          icon: "⚡",
          format: "Fast Trivia / Speed Blitz",
          desc: "Câu đố tập trung cao độ với 4 phương án xếp chồng toàn màn hình, phù hợp đố mẹo, toán nhanh, phản xạ ngôn từ.",
          assets: "Text câu hỏi & 4 đáp án (ảnh nền nhẹ tùy chọn)",
        },
      };

    case "media_left_choices_right":
    default:
      return {
        id: "media_left_choices_right",
        meta: {
          id: "media_left_choices_right",
          name: "Deep Trivia (Ảnh Trái + Đáp Án Phải)",
          badge: "📚 Deep Trivia",
          tagClass: "tag-media",
          btnClass: "is-media-left",
          icon: "📚",
          format: "Multiple Choice / Knowledge",
          desc: "Bố cục kinh điển: 1 hình ảnh minh họa chủ thể chất lượng cao bên trái, 3 thẻ đáp án xếp dọc bên phải.",
          assets: "1 ảnh minh họa chủ đề lớn",
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
