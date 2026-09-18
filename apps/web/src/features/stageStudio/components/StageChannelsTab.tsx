import type { Channel, MascotProfile } from "@studio/shared";
import type { useStageStudio } from "../hooks/useStageStudio";
import { StageSingleChannelMascotPicker } from "./StageSingleChannelMascotPicker";
import { StageMultiChannelSelector } from "./StageMultiChannelSelector";

type StageChannelsTabProps = {
  studio: ReturnType<typeof useStageStudio>;
  channels: Channel[];
  allMascots: MascotProfile[];
};

export function StageChannelsTab({ studio, channels, allMascots }: StageChannelsTabProps) {
  if (studio.isSingleChannelMode && studio.targetChannel) {
    return <StageSingleChannelMascotPicker studio={studio} targetChannel={studio.targetChannel} allMascots={allMascots} />;
  }

  return <StageMultiChannelSelector studio={studio} channels={channels} allMascots={allMascots} />;
}
