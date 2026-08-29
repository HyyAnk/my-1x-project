import type { Channel, MascotProfile } from "@studio/shared";
import type { Notice } from "./types";
import { MascotStageStudioModal } from "../features/stageStudio";

export type MascotAssignModalProps = {
  isOpen: boolean;
  singleChannelId?: string;
  mascot: MascotProfile | null;
  channels: Channel[];
  allMascots?: MascotProfile[];
  onClose: () => void;
  onSaved: () => Promise<void>;
  onNotice: (notice: NonNullable<Notice>) => void;
};

export function MascotAssignModal(props: MascotAssignModalProps) {
  return <MascotStageStudioModal {...props} />;
}
