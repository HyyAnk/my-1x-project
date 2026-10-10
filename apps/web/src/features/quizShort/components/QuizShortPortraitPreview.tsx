import { DeviceMobile, DownloadSimple } from "@phosphor-icons/react";
import type { QuizShort, Task } from "@studio/shared";
import { quizShortApi } from "../../../api/quizShortApi";
import { InlineTaskState } from "../../../components/InlineTaskState";
import { describeQuizShortRender } from "../services/quizShortViewModel";

export type QuizShortPortraitPreviewProps = {
  quizShort: QuizShort;
  coverUrl: string | null;
  activeTask: Task | null;
  now: number;
};

/** 9:16 stage showing the rendered video, or the cover while no video exists yet. */
export function QuizShortPortraitPreview({ quizShort, coverUrl, activeTask, now }: QuizShortPortraitPreviewProps) {
  const videoUrl = quizShort.video_asset_path
    ? quizShortApi.quizShortVideoUrl(quizShort.channel_id, quizShort.quiz_short_id, quizShort.video_generated_at)
    : null;

  return (
    <section className="quiz-short-preview" aria-label="Portrait preview" data-testid="quiz-short-portrait-preview">
      <div className={`quiz-short-portrait-frame ${quizShort.render_stale ? "is-stale" : ""}`}>
        {videoUrl ? (
          <video controls preload="metadata" src={videoUrl} aria-label="Rendered Quiz Short" className="quiz-short-portrait-video" />
        ) : coverUrl ? (
          <img src={coverUrl} alt={`Cover for ${quizShort.topic.title}`} className="quiz-short-portrait-cover" />
        ) : (
          <div className="quiz-short-portrait-placeholder" data-testid="quiz-short-portrait-placeholder">
            <DeviceMobile size={36} weight="duotone" />
            <strong>1080 x 1920</strong>
            <span>{quizShort.topic.hook || "Portrait preview appears after the first render."}</span>
          </div>
        )}
      </div>
      <div className="quiz-short-preview-meta">
        <p className="quiz-short-preview-copy">{describeQuizShortRender(quizShort)}</p>
        {activeTask ? <InlineTaskState task={activeTask} now={now} /> : null}
        {videoUrl ? (
          <a className="quiet-button compact" href={videoUrl} download={`${quizShort.slug}.mp4`}>
            <DownloadSimple size={15} />
            <span>Download MP4</span>
          </a>
        ) : null}
      </div>
    </section>
  );
}
