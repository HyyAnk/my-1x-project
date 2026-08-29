import type { Channel, MascotProfile } from "@studio/shared";
import type { Notice } from "../../components/types";

export type StageAspectRatio = "16:9" | "9:16";
export type StageViewMode = "video_stage" | "grid";
export type StagePosition = "bottom_left" | "bottom_right";
export type StageReactionStyle = "celebrate" | "oops";
export type StageInspectorTab = "transform" | "channels";
export type ChannelFilterTab = "all" | "selected" | "unassigned" | "other";

export type StageScenarioPhase = "intro" | "question" | "thinking" | "reveal" | "explain" | "outro";
export type StageQuestionLayout = "media_left_choices_right" | "visual_choices_three";

export type MascotStageStudioModalProps = {
  isOpen: boolean;
  singleChannelId?: string;
  mascot: MascotProfile | null;
  channels: Channel[];
  allMascots?: MascotProfile[];
  onClose: () => void;
  onSaved: () => Promise<void>;
  onNotice: (notice: NonNullable<Notice>) => void;
};
