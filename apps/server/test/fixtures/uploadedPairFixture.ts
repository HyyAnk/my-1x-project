import { execFile } from "node:child_process";
import { copyFile, mkdir, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { ChannelSchema, IntroOutroStyleSchema, resolveBuiltInPresetCategoryId } from "@studio/shared";
import { RepositoryService } from "../../src/repository.js";
import { buildEpisodeRecord } from "../../src/quiz/bank/bridge/bootstrapperHelpers.js";

export async function uploadedPairFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "uploaded-pair-"));
  const repository = new RepositoryService(root);
  const timestamp = new Date().toISOString();
  const channel = ChannelSchema.parse({
    channel_id: "channel",
    slug: "channel",
    display_name: "Channel",
    channel_dna_path: "channel_dna.md",
    status: "ACTIVE",
    created_at: timestamp,
    updated_at: timestamp,
  });
  await repository.writeJsonAtomic(repository.resolvePath("channels", channel.slug, "channel.json"), channel);
  const episode = (id: string) =>
    buildEpisodeRecord({
      episodeId: id,
      channelId: channel.channel_id,
      channelSlug: channel.slug,
      episodeSlug: id,
      title: "Test",
      premise: "Test",
      hook: "Test",
      targetDurationMinutes: 3,
      targetWordCount: 50,
      questionCount: 3,
      quizFormat: "knowledge",
      ageBand: "7-9",
      visualTheme: "candy_pop",
      requestedStyle: "pixar_3d",
      resolvedStyle: "pixar_3d",
      channel,
      renderAspect: "16:9",
      targetLayout: "full_stack_list",
      timestamp,
    });
  const source = path.join(root, "source.mp4");
  await promisify(execFile)(
    "ffmpeg",
    [
      "-y",
      "-f",
      "lavfi",
      "-i",
      "color=c=blue:s=1920x1080:r=30:d=0.6",
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-pix_fmt",
      "yuv420p",
      source,
    ],
    { windowsHide: true },
  );
  const addPair = async (id: string, category = resolveBuiltInPresetCategoryId(episode("probe").quiz_config)) => {
    const style = IntroOutroStyleSchema.parse({
      style_id: id,
      channel_id: channel.channel_id,
      style_preset_id: category,
      name: id,
      intro: { filename: "intro.mp4", duration_seconds: 99, width: 1920, height: 1080, fps: 30, has_audio: false },
      outro: { filename: "outro.mp4", duration_seconds: 99, width: 1920, height: 1080, fps: 30, has_audio: false },
      transition_type: "cut",
      audio_mode: "overlay_bgm",
      created_at: timestamp,
      updated_at: timestamp,
    });
    await repository.saveChannelIntroOutroStyle(channel.channel_id, style);
    const directory = repository.resolvePath("channels", channel.slug, "intro_outro_styles", id);
    await mkdir(directory, { recursive: true });
    await Promise.all([copyFile(source, path.join(directory, "intro.mp4")), copyFile(source, path.join(directory, "outro.mp4"))]);
    return style;
  };
  return { root, repository, channel, episode, addPair };
}
