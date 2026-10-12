import type { QuizShort, QuizTimeline } from "@studio/shared";
import type { RepositoryService } from "../../repository.js";
import { RepositoryError } from "../../repository/errors.js";
import { createQuizShortBookendDeps, resolveQuizShortBookends } from "../../quizShortBookends/index.js";
import type { QuizShortBookendRenderMedia } from "../../quiz/render/candyArcade/shortBookends/quizShortBookendClips.js";
import { QUIZ_SHORT_STAGE_SEGMENT_IDS } from "../../quiz/timeline/quizShortTimelinePolicy.js";
import { prepareBookendMedia } from "./bookendMediaPreparation.js";
import type { IntroOutroMediaResolution } from "./introOutroMediaResolver.js";

export type PreparedQuizShortBookends = {
  media?: QuizShortBookendRenderMedia;
  introOutro: IntroOutroMediaResolution;
  renderDependencies: string[];
  /** BGM starts on frame 0 and, with an outro, fades out across the whole outro. */
  fullLengthBgm: { startSeconds: number; finalFadeOutSeconds?: number };
};

const DURATION_TOLERANCE_SECONDS = 0.05;

function stageDuration(timeline: QuizTimeline, segmentId: string): number | null {
  const event = timeline.events.find((item) => item.type === "background.motion" && item.segment_id === segmentId);
  return event ? event.duration_seconds : null;
}

/** The timeline is compiled during voice; a pair change after that needs the pipeline to run again. */
function assertTimelineMatches(timeline: QuizTimeline, introSeconds: number, outroSeconds: number): void {
  const hasIntroStage = stageDuration(timeline, QUIZ_SHORT_STAGE_SEGMENT_IDS.shortIntro) !== null;
  const outroStage = stageDuration(timeline, QUIZ_SHORT_STAGE_SEGMENT_IDS.shortOutro);
  const outroMatches =
    outroSeconds > 0 ? outroStage !== null && Math.abs(outroStage - outroSeconds) <= DURATION_TOLERANCE_SECONDS : outroStage === null;
  if (hasIntroStage !== introSeconds > 0 || !outroMatches) {
    throw new RepositoryError(
      "Short Intro & Outro changed after the voice and timeline were built. Run the Quiz Short pipeline again before rendering.",
      "QUIZ_SHORT_BOOKEND_TIMELINE_STALE",
    );
  }
}

/** Resolves the pinned Short Intro & Outro pair, checks it against the timeline and copies its media. */
export async function prepareQuizShortBookends(input: {
  repository: RepositoryService;
  quizShort: QuizShort;
  timeline: QuizTimeline;
  renderRoot: string;
}): Promise<PreparedQuizShortBookends> {
  const resolved = await resolveQuizShortBookends(createQuizShortBookendDeps(input.repository), input.quizShort);
  assertTimelineMatches(input.timeline, resolved?.snapshot.intro_duration_seconds ?? 0, resolved?.snapshot.outro_duration_seconds ?? 0);
  if (!resolved) {
    return {
      introOutro: { selectionSource: "none", unavailableReason: "No Short Intro & Outro pair for this style" },
      renderDependencies: [],
      fullLengthBgm: { startSeconds: 0 },
    };
  }
  const [intro, outro] = await Promise.all([
    prepareBookendMedia("intro", resolved.introSourcePath, input.renderRoot),
    prepareBookendMedia("outro", resolved.outroSourcePath, input.renderRoot),
  ]);
  const { pair, snapshot } = resolved;
  return {
    media: {
      introVideoPath: intro.videoPath,
      introLoopDurationSeconds: snapshot.intro_duration_seconds,
      outroVideoPath: outro.videoPath,
      outroHasAudio: snapshot.outro_has_audio,
      titleCanvas: pair.title_canvas,
      transitionType: pair.transition_type,
      transitionDurationSeconds: pair.transition_duration_seconds,
    },
    introOutro: {
      selectionSource: input.quizShort.quiz_config.bookend_selection.mode === "specific_pair" ? "specific_pair" : "style_builtin",
      styleId: pair.pair_id,
      stylePresetId: snapshot.style_preset_id,
      introVideoPath: intro.videoPath,
      outroVideoPath: outro.videoPath,
      introHasAudio: false,
      outroHasAudio: snapshot.outro_has_audio,
      transitionType: pair.transition_type,
      transitionDurationSeconds: pair.transition_duration_seconds,
      selectionFingerprint: snapshot.fingerprint ?? undefined,
    },
    renderDependencies: [`short-bookends:${snapshot.fingerprint}:${JSON.stringify(pair.title_canvas)}`],
    fullLengthBgm: { startSeconds: 0, finalFadeOutSeconds: snapshot.outro_duration_seconds },
  };
}
