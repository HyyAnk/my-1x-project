import { resolveChannelMascotPlacement, resolveMascotStageDefaultPlacement, type SandboxPreviewInput } from "@studio/shared";
import { RepositoryError } from "../../repository.js";
import type { QuizV2RouteDeps } from "./quizV2Types.js";

type StageSourceDependencies = {
  repository: Pick<QuizV2RouteDeps["repository"], "getChannel">;
  state: Pick<QuizV2RouteDeps["state"], "config">;
};

export async function resolvePreviewStageSource(input: SandboxPreviewInput, deps: StageSourceDependencies): Promise<SandboxPreviewInput> {
  if (!input.mascot_placement_source) return input; // Stage Studio drafts and legacy callers supply explicit transforms.
  const channel =
    input.mascot_placement_source === "channel" ? await deps.repository.getChannel(requireChannelId(input.mascot_channel_id)) : null;
  const config = channel?.mascot_config;
  const placement = channel?.mascot_id
    ? resolveChannelMascotPlacement(config, "16:9")
    : resolveMascotStageDefaultPlacement(deps.state.config.mascot_stage, "16:9");
  return {
    ...input,
    ...(channel
      ? {
          mascot_id: channel.mascot_id,
          mascot_enabled: Boolean(channel.mascot_id && config?.enabled),
          mascot_show_in_intro: config?.show_in_intro ?? false,
          mascot_show_in_outro: config?.show_in_outro ?? false,
          mascot_show_in_question: config?.show_in_question ?? true,
        }
      : {}),
    mascot_position: placement.position,
    mascot_scale: placement.scale,
    mascot_offset_x: placement.offset_x,
    mascot_offset_y: placement.offset_y,
    mascot_flip_x: placement.flip_x,
  };
}

function requireChannelId(channelId?: string): string {
  if (!channelId) throw new RepositoryError("Select a Stage Studio channel source", "INVALID_INPUT");
  return channelId;
}
