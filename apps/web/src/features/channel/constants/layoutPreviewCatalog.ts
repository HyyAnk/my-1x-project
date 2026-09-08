export type LayoutMeta = {
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

export const ARCHETYPE_LAYOUT_MAP: Record<string, string> = {
  mystery_reveal: "mystery_reveal",
  clue_deduction: "clue_deduction",
  versus_faceoff: "split_versus_two",
  visual_spotting: "visual_choices_three_pure",
  visual_identification: "visual_choices_three",
  speed_blitz: "full_stack_list",
  verdict_true_false: "verdict_true_false",
  verdict_fact_myth: "verdict_true_false",
  deep_trivia: "media_left_choices_right",
};

export const LAYOUT_CATALOG: Record<string, LayoutMeta> = {
  clue_deduction: {
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
  mystery_reveal: {
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
  split_versus_two: {
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
  visual_choices_three_pure: {
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
  visual_choices_three: {
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
  verdict_true_false: {
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
  full_stack_list: {
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
  media_left_choices_right: {
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

export function resolveLayoutMeta(
  quizFormat: string,
  archetype?: string,
  layoutId?: string,
  _aspectRatio?: "16:9" | "9:16",
): { id: string; meta: LayoutMeta } {
  let resolvedId = layoutId && LAYOUT_CATALOG[layoutId] ? layoutId : undefined;

  if (resolvedId) {
    const meta = LAYOUT_CATALOG[resolvedId] ?? LAYOUT_CATALOG.media_left_choices_right;
    return { id: meta.id, meta };
  }

  // Episode layout previews are landscape-only. Legacy ratio input is ignored.
  if (archetype) {
    resolvedId = ARCHETYPE_LAYOUT_MAP[archetype];
  }

  if (!resolvedId) {
    if (quizFormat === "odd_one_out") resolvedId = "visual_choices_three";
    else if (quizFormat === "true_false") resolvedId = "verdict_true_false";
    else resolvedId = "media_left_choices_right";
  }

  const meta = LAYOUT_CATALOG[resolvedId] ?? LAYOUT_CATALOG.media_left_choices_right;
  return { id: meta.id, meta };
}
