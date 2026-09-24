import { useEffect, useState } from "react";
import { resolveChannelMascotPlacement, RECOMMENDED_MASCOT_PLACEMENT_PRESET, type Channel } from "@studio/shared";
import { useStageSource } from "../../stageStudio/hooks/useStageSource";
import type { SandboxMascotState } from "./useSandboxMascotState";

export function useSandboxStageSource(draft: SandboxMascotState, channels: Channel[]) {
  const source = useStageSource(channels);
  const [channelId, setChannelId] = useState("");
  const channel = source.channels.find((item) => item.channel_id === channelId);
  const placement = channel?.mascot_id ? resolveChannelMascotPlacement(channel.mascot_config, "16:9") : source.defaultPlacement;
  const resolved = placement ?? RECOMMENDED_MASCOT_PLACEMENT_PRESET;
  const mascotId = channel ? channel.mascot_id || "none" : draft.mascotId;
  useEffect(() => {
    if (channel) draft.setMascotId(channel.mascot_id || "none");
  }, [channel?.mascot_id, channelId, draft.setMascotId]);
  const mascot: SandboxMascotState = {
    ...draft,
    mascotId,
    activeMascot: draft.mascots.find((item) => item.id === mascotId) ?? null,
    mascotEnabled:
      Boolean(placement) &&
      !source.error &&
      (!channelId || Boolean(channel)) &&
      (channel ? Boolean(channel.mascot_id && channel.mascot_config?.enabled) : draft.mascotEnabled),
    mascotPosition: resolved.position,
    mascotScale: resolved.scale,
    mascotOffsetX: resolved.offset_x,
    mascotOffsetY: resolved.offset_y,
    mascotFlipX: resolved.flip_x,
  };
  return { ...source, channelId, setChannelId, mascot, ready: Boolean(placement) };
}
