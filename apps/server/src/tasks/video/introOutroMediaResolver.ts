import { copyFile } from "node:fs/promises";
import path from "node:path";
import type { Channel, Episode, IntroOutroTransitionType } from "@studio/shared";
import type { RepositoryService } from "../../repository.js";

export interface IntroOutroMediaResolution {
  introVideoPath?: string;
  outroVideoPath?: string;
  transitionType?: IntroOutroTransitionType;
  transitionDurationSeconds?: number;
  audioMode?: "use_video_audio" | "overlay_bgm";
}

export async function resolveAndCopyIntroOutro(
  repository: RepositoryService,
  channel: Channel,
  episode: Episode,
  renderRoot: string,
): Promise<IntroOutroMediaResolution> {
  const styleId =
    episode.quiz_config?.intro_outro_style_id !== undefined
      ? episode.quiz_config.intro_outro_style_id
      : (channel.default_intro_outro_style_id ?? null);

  if (!styleId || styleId === "none") {
    return {};
  }

  const style = await repository.getChannelIntroOutroStyle(channel.channel_id, styleId).catch(() => null);
  if (!style) {
    return {};
  }

  const sourceIntroPath = repository.resolvePath("channels", channel.slug, "intro_outro_styles", style.style_id, "intro.mp4");
  const sourceOutroPath = repository.resolvePath("channels", channel.slug, "intro_outro_styles", style.style_id, "outro.mp4");
  const targetIntroPath = path.join(renderRoot, "intro.mp4");
  const targetOutroPath = path.join(renderRoot, "outro.mp4");

  let introVideoPath: string | undefined;
  let outroVideoPath: string | undefined;

  try {
    await copyFile(sourceIntroPath, targetIntroPath);
    introVideoPath = "./intro.mp4";
  } catch {
    // Fallback if file not found
  }

  try {
    await copyFile(sourceOutroPath, targetOutroPath);
    outroVideoPath = "./outro.mp4";
  } catch {
    // Fallback if file not found
  }

  return {
    introVideoPath,
    outroVideoPath,
    transitionType: style.transition_type,
    transitionDurationSeconds: style.transition_duration_seconds,
    audioMode: style.audio_mode ?? "use_video_audio",
  };
}
