import type { MascotRenderAspectRatio, QuizAnswerCardStyle, ResolvedQuizLayoutId } from "@studio/shared";

export type Phase08cSurface = "production" | "sandbox";
export type Phase08cBackground = "candy_rays" | "aurora_glow";

export type Phase08cArtifactCase = {
  id: string;
  surface: Phase08cSurface;
  layoutId: ResolvedQuizLayoutId;
  aspectRatio: MascotRenderAspectRatio;
  backgroundStyle: Phase08cBackground;
  answerCardStyle: Exclude<QuizAnswerCardStyle, "auto">;
  mascotEnabled: boolean;
  longText: boolean;
  visualChoices: boolean;
};

export type Phase08cInspection = {
  result: "PASS";
  backgroundFillsStage: boolean;
  contentWithinStage: boolean;
  noDocumentOverflow: boolean;
  noMascotChoiceOcclusion: boolean;
  noPhaseContentOcclusion: boolean;
  mascotStateMatches: boolean;
  reducedMotionStatic: boolean;
  fontsReady: boolean;
  visibleChoiceCount: number;
};

const layouts: ResolvedQuizLayoutId[] = ["media_left_choices_right", "visual_choices_three", "media_top_choices_bottom", "full_stack_list"];
const aspects: MascotRenderAspectRatio[] = ["16:9", "9:16"];
const backgrounds: Phase08cBackground[] = ["candy_rays", "aurora_glow"];
const skins = ["glossy_arcade", "comic_chunky", "glass_neon", "minimal_soft"] as const;

export const PHASE_08C_ARTIFACT_CASES: Phase08cArtifactCase[] = layouts.flatMap((layoutId, layoutIndex) =>
  aspects.flatMap((aspectRatio, aspectIndex) =>
    backgrounds.map((backgroundStyle, backgroundIndex) => {
      const ordinal = layoutIndex * 4 + aspectIndex * 2 + backgroundIndex + 1;
      return {
        id: String(ordinal).padStart(2, "0"),
        surface: (layoutIndex + aspectIndex + backgroundIndex) % 2 === 0 ? "production" : "sandbox",
        layoutId,
        aspectRatio,
        backgroundStyle,
        answerCardStyle: skins[(layoutIndex + aspectIndex + backgroundIndex) % skins.length],
        mascotEnabled:
          !(layoutId === "visual_choices_three" && aspectRatio === "9:16") && (layoutIndex + aspectIndex + backgroundIndex) % 2 === 0,
        longText: layoutId === "full_stack_list" || (layoutId === "media_left_choices_right" && aspectRatio === "9:16"),
        visualChoices: layoutId === "visual_choices_three",
      } satisfies Phase08cArtifactCase;
    }),
  ),
);

export function artifactFilename(item: Phase08cArtifactCase): string {
  const aspect = item.aspectRatio.replace(":", "x");
  return `${item.id}-${item.surface}-${item.layoutId}-${aspect}-${item.backgroundStyle}.png`;
}
