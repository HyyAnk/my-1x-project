import type { useMascotStudioActivity } from "../hooks/activity";
import type { useMascotStyles } from "../hooks/useMascotStyles";
import type { MascotStudioActivityItem } from "../types/mascotStudioActivity.types";
import { MascotStudioActivityPanel } from "./MascotStudioActivityPanel";

export interface MascotGeneratorActivityProps {
  generatorStep: number;
  onSelectStep: (step: 1 | 2 | 3 | 4) => void;
  stylesState: ReturnType<typeof useMascotStyles>;
  activityState: ReturnType<typeof useMascotStudioActivity>;
  onRefresh: () => void;
}

function isRenderedInCurrentStep(
  activity: MascotStudioActivityItem,
  generatorStep: number,
  stylesState: ReturnType<typeof useMascotStyles>,
): boolean {
  if (generatorStep === 1 && activity.kind === "style_concepts") return Boolean(stylesState.styleQueueProgress);
  if (generatorStep === 2 && activity.kind === "expressive_states") {
    return activity.styleId === stylesState.activeStyleId && Boolean(stylesState.batchProgress);
  }
  return generatorStep === 3 && activity.kind === "animation_processing" && activity.styleId === stylesState.activeStyleId;
}

export function MascotGeneratorActivity({
  generatorStep,
  onSelectStep,
  stylesState,
  activityState,
  onRefresh,
}: MascotGeneratorActivityProps) {
  const visibleActivities = activityState.activities.filter((activity) => !isRenderedInCurrentStep(activity, generatorStep, stylesState));

  const openActivity = (activity: MascotStudioActivityItem) => {
    if (activity.styleId) stylesState.setActiveStyleId(activity.styleId);
    if (activity.kind === "style_concepts") onSelectStep(1);
    if (activity.kind === "expressive_states") onSelectStep(2);
    if (activity.kind === "animation_processing") onSelectStep(3);
  };

  return (
    <MascotStudioActivityPanel
      activities={visibleActivities}
      isLoading={activityState.isLoading}
      isRefreshing={activityState.isRefreshing}
      error={activityState.error}
      hasWarnings={activityState.warnings.length > 0}
      onRefresh={onRefresh}
      onOpen={openActivity}
      onDismiss={activityState.dismiss}
    />
  );
}
