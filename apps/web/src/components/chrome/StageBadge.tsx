export type ProductionStageCategory = "research" | "script" | "visual" | "timeline" | "assembly" | "final";

export type StageMetadata = {
  label: string;
  category: ProductionStageCategory;
  isReady: boolean;
};

export function getStageMetadata(stage: string): StageMetadata {
  switch (stage.toUpperCase()) {
    case "IDEA":
    case "SELECTED":
      return { label: "Idea Selected", category: "research", isReady: false };
    case "RESEARCH":
      return { label: "Researching", category: "research", isReady: false };
    case "RESEARCH_READY":
      return { label: "Research Ready", category: "research", isReady: true };
    case "TREATMENT":
      return { label: "Drafting Story", category: "research", isReady: false };
    case "TREATMENT_READY":
      return { label: "Treatment Ready", category: "research", isReady: true };
    case "SCRIPT":
      return { label: "Writing Script", category: "script", isReady: false };
    case "SCRIPT_READY":
      return { label: "Script Ready", category: "script", isReady: true };
    case "VISUAL_BIBLE":
      return { label: "Styling Visuals", category: "visual", isReady: false };
    case "VISUAL_BIBLE_READY":
      return { label: "Visual Ready", category: "visual", isReady: true };
    case "SCENE_BREAKDOWN":
      return { label: "Breaking Shots", category: "timeline", isReady: false };
    case "SCENE_READY":
      return { label: "Shots Ready", category: "timeline", isReady: true };
    case "NARRATION_READY":
      return { label: "Audio Ready", category: "assembly", isReady: true };
    case "READY_FOR_GENERATION":
      return { label: "Ready to Render", category: "assembly", isReady: true };
    case "VIDEO_RENDERING":
      return { label: "Rendering Video", category: "assembly", isReady: false };
    case "VIDEO_READY":
      return { label: "Video Ready", category: "final", isReady: true };
    default:
      return { label: stage.replaceAll("_", " ").toLowerCase(), category: "research", isReady: false };
  }
}

export function StageBadge({ stage, size = "md" }: { stage: string; size?: "sm" | "md" }) {
  const meta = getStageMetadata(stage);
  return (
    <span className={`stage-badge stage-cat-${meta.category} stage-size-${size} ${meta.isReady ? "is-ready" : "is-progress"}`}>
      <span className="stage-dot" />
      <span>{meta.label}</span>
    </span>
  );
}
