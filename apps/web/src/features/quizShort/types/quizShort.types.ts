import type { Channel, QuizShortSettingsInput, Task } from "@studio/shared";
import type { Notice } from "../../../components/types";
import type { QuizShortStageState, QuizShortWorkspaceResponse } from "../../../api/quizShortApi";

export type { QuizShortStageState, QuizShortWorkspaceResponse };
export type { VideoDescriptionClient, VideoTitleClient } from "../../quizProduct/types/videoMetadataClient.types";

export type QuizShortStageKey = keyof QuizShortWorkspaceResponse["stages"];

export type QuizShortStageSummary = {
  key: QuizShortStageKey;
  label: string;
  state: QuizShortStageState;
  stateLabel: string;
};

export type QuizShortPipelineAction = {
  label: string;
  intent: "start" | "rebuild" | "retry";
};

export type QuizShortSettingsPatch = QuizShortSettingsInput;

export type QuizShortViewProps = {
  channel: Channel;
  quizShortId: string;
  tasks: Task[];
  onBack: () => void;
  onNavigateHome?: () => void;
  onNavigateChannels?: () => void;
  onNavigateChannel?: () => void;
  onTaskSubmitted: (task: Task) => void;
  onNotice: (notice: NonNullable<Notice>) => void;
};
