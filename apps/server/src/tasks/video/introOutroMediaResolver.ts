import { createHash } from "node:crypto";
import { stat } from "node:fs/promises";
import type { Channel, Episode, IntroOutroTransitionType, MotionTemplateOptions } from "@studio/shared";
import type { RepositoryService } from "../../repository.js";
import { selectIntroOutroPair, type IntroOutroSelectionSource, type ResolvedIntroOutroPair } from "./introOutroSelectionService.js";
import { resolveBookendEnablement } from "../../quiz/introOutro/bookendEnablement.js";
import { pairFingerprint } from "../../quiz/introOutro/pairMedia.js";
import { RepositoryError } from "../../repository/errors.js";
import { prepareBookendMedia } from "./bookendMediaPreparation.js";

export interface IntroOutroMediaResolution {
  introHasAudio?: boolean;
  outroHasAudio?: boolean;
  introVideoPath?: string;
  outroVideoPath?: string;
  transitionType?: IntroOutroTransitionType;
  transitionDurationSeconds?: number;
  audioMode?: "use_video_audio" | "overlay_bgm";
  styleId?: string;
  stylePresetId?: string;
  selectionSource: IntroOutroSelectionSource;
  selectionFingerprint?: string;
  unavailableReason?: string;
  introMotionTemplateId?: string;
  introMotionTemplateOptions?: MotionTemplateOptions;
  outroMotionTemplateId?: string;
  outroMotionTemplateOptions?: MotionTemplateOptions;
}

async function createSelectionFingerprint(
  styleId: string,
  introPath: string,
  outroPath: string,
  metadata: Record<string, unknown>,
): Promise<string> {
  const [introStat, outroStat] = await Promise.all([stat(introPath), stat(outroPath)]);
  return createHash("sha256")
    .update(
      JSON.stringify({
        styleId,
        intro: { size: introStat.size, modifiedAt: introStat.mtimeMs },
        outro: { size: outroStat.size, modifiedAt: outroStat.mtimeMs },
        metadata,
      }),
    )
    .digest("hex");
}

export async function resolveAndCopyIntroOutro(
  repository: RepositoryService,
  channel: Channel,
  episode: Episode,
  renderRoot: string,
  taskId = `${episode.episode_id}:legacy`,
): Promise<IntroOutroMediaResolution> {
  const selection = await selectIntroOutroPair(repository, channel, episode, taskId);
  const enablement = resolveBookendEnablement(episode.quiz_config);
  if (!enablement.intro && !enablement.outro) {
    return { selectionSource: "none", stylePresetId: selection.stylePresetId, unavailableReason: "Intro and outro disabled" };
  }
  const resolution = await resolveSelectedMedia(selection, episode, renderRoot);
  return {
    ...resolution,
    ...(enablement.intro ? {} : { introVideoPath: undefined, introHasAudio: undefined, introMotionTemplateId: undefined, introMotionTemplateOptions: undefined }),
    ...(enablement.outro ? {} : { outroVideoPath: undefined, outroHasAudio: undefined, outroMotionTemplateId: undefined, outroMotionTemplateOptions: undefined }),
    ...(resolution.selectionFingerprint
      ? { selectionFingerprint: `${resolution.selectionFingerprint}:${Number(enablement.intro)}${Number(enablement.outro)}` }
      : {}),
  };
}

async function resolveSelectedMedia(
  selection: ResolvedIntroOutroPair,
  episode: Episode,
  renderRoot: string,
): Promise<IntroOutroMediaResolution> {
  if (selection.source === "motion_template") {
    const motionSelection = episode.quiz_config.intro_outro_selection;
    const isMotion = motionSelection.mode === "motion_template";
    const introTemplateId = isMotion ? (motionSelection.intro_template_id ?? motionSelection.template_id) : undefined;
    const introOptions = isMotion ? (motionSelection.intro_options ?? motionSelection.options) : undefined;
    const outroTemplateId = isMotion
      ? (motionSelection.outro_template_id ?? (motionSelection.template_id === "minimal_sleek" ? "minimal_sleek" : "interactive_cta"))
      : undefined;
    const outroOptions = isMotion ? (motionSelection.outro_options ?? motionSelection.options) : undefined;

    return {
      selectionSource: "motion_template",
      stylePresetId: selection.stylePresetId,
      introMotionTemplateId: introTemplateId,
      introMotionTemplateOptions: introOptions,
      outroMotionTemplateId: outroTemplateId,
      outroMotionTemplateOptions: outroOptions,
    };
  }
  if (!selection.style || !selection.introSourcePath || !selection.outroSourcePath) {
    return {
      selectionSource: selection.source,
      stylePresetId: selection.stylePresetId,
      unavailableReason: selection.unavailableReason,
    };
  }

  const { style } = selection;
  // Settle both copies before returning or failing so a retry cannot race an unfinished copy.
  const prepared = await Promise.allSettled([
    prepareBookendMedia("intro", selection.introSourcePath, renderRoot),
    prepareBookendMedia("outro", selection.outroSourcePath, renderRoot),
  ]);
  const [intro, outro] = prepared;
  if (intro.status === "rejected") throw intro.reason;
  if (outro.status === "rejected") throw outro.reason;
  const copiedFingerprint = await pairFingerprint({
    style,
    introSourcePath: intro.value.absolutePath,
    outroSourcePath: outro.value.absolutePath,
  });
  if (copiedFingerprint !== selection.snapshot.fingerprint) {
    throw new RepositoryError(
      "Intro/Outro media changed during preparation. Restore the selected media and retry.",
      "INTRO_OUTRO_PAIR_CHANGED",
    );
  }
  const selectionFingerprint = await createSelectionFingerprint(style.style_id, selection.introSourcePath, selection.outroSourcePath, {
    introSha256: style.intro.sha256,
    outroSha256: style.outro.sha256,
    transitionType: style.transition_type,
    transitionDurationSeconds: style.transition_duration_seconds,
    audioMode: style.audio_mode,
  });

  return {
    introVideoPath: intro.value.videoPath,
    outroVideoPath: outro.value.videoPath,
    introHasAudio: selection.snapshot.intro_has_audio,
    outroHasAudio: selection.snapshot.outro_has_audio,
    transitionType: style.transition_type,
    transitionDurationSeconds: style.transition_duration_seconds,
    audioMode: "use_video_audio",
    styleId: style.style_id,
    stylePresetId: selection.stylePresetId,
    selectionSource: selection.source,
    selectionFingerprint,
  };
}
