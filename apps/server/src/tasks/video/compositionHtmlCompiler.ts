import type { Channel, Episode, MascotProfile, Scene } from "@studio/shared";
import type { RequiredQuizRenderArtifacts } from "./quizRenderArtifacts.js";
import type { IntroOutroMediaResolution } from "./introOutroMediaResolver.js";
import { prepareQuizVideoRender } from "./quizVideoRenderPreparation.js";

export interface CompileCompositionHtmlParams {
  artifacts: RequiredQuizRenderArtifacts;
  channel: Channel;
  episode: Episode;
  scenes: Scene[];
  renderAspectRatio: "16:9" | "9:16" | "1:1";
  renderFps: number;
  assetSources: Record<string, string>;
  bgmHistory: Array<{ track_id: string }>;
  mascotProfile: MascotProfile | null;
  introOutro: IntroOutroMediaResolution;
}

export async function compileCompositionHtml(
  params: CompileCompositionHtmlParams,
): Promise<{ html: string; compositionFiles?: Record<string, string> }> {
  const { artifacts, channel, episode, scenes, renderAspectRatio, renderFps, assetSources, bgmHistory, mascotProfile, introOutro } = params;
  const mascotAspectRatio = renderAspectRatio === "9:16" ? "9:16" : "16:9";

  const preparedQuizRender = await prepareQuizVideoRender({
    channel,
    episodeQuizConfig: episode.quiz_config,
    quiz: artifacts.quiz,
    director: artifacts.director,
    timeline: artifacts.timeline,
    scenes,
    audioPath: "./soundtrack.wav",
    premixedAudio: true,
    aspectRatio: mascotAspectRatio,
    narrationDurationSeconds: episode.narration_duration_seconds ?? undefined,
    assets: assetSources,
    bgmOptions: {
      recentTrackIds: bgmHistory.map((entry) => entry.track_id),
      seed: episode.episode_id,
    },
    mascot: mascotProfile,
    mascotConfig: channel.mascot_config,
    fps: renderFps,
    introVideoPath: introOutro.introVideoPath,
    outroVideoPath: introOutro.outroVideoPath,
    transitionType: introOutro.transitionType,
    transitionDurationSeconds: introOutro.transitionDurationSeconds,
    audioMode: introOutro.audioMode,
  });

  return {
    html: preparedQuizRender.html,
    compositionFiles: preparedQuizRender.compositionFiles,
  };
}
