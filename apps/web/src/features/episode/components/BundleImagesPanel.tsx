import { CircleNotch, DownloadSimple, Eye, Play } from "@phosphor-icons/react";
import { QUIZ_IMAGE_STYLE_LABELS, type QuizImageStyle, type Task } from "@studio/shared";
import { api, type BundleImage } from "../../../api";
import { isTaskActive, latestTask } from "../../../lib/utils";
import type { parseContinuityBundles } from "../../../lib/continuity";
import { TaskProgressPanel } from "../../../components/TaskProgressPanel";
import type { PreviewImageData } from "../types";
import { PromptCollapsible } from "./PromptCollapsible";

export function BundleImagesPanel({
  bundles,
  images,
  tasks,
  now,
  channelId,
  episodeId,
  imagesPerBundle,
  resolvedStyle,
  busy,
  disabled,
  onGenerate,
  onGenerateAll,
  onPreviewImage,
}: {
  bundles: ReturnType<typeof parseContinuityBundles>;
  images: BundleImage[];
  tasks: Task[];
  now: number;
  channelId: string;
  episodeId: string;
  imagesPerBundle: number;
  resolvedStyle?: QuizImageStyle;
  busy: string | null;
  disabled: boolean;
  onGenerate: (bundleNumber: number) => void;
  onGenerateAll: () => void;
  onPreviewImage: (data: PreviewImageData) => void;
}) {
  const activeImageTask = tasks.some((task) => task.task_type === "GENERATE_BUNDLE_IMAGE" && isTaskActive(task));
  return (
    <section className="panel bundle-images-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Style lock</p>
          <div className="bundle-heading-with-badge">
            <h2>Continuity images</h2>
            {resolvedStyle ? (
              <span className="style-lock-badge" title="Resolved style for this episode">
                ✨ {QUIZ_IMAGE_STYLE_LABELS[resolvedStyle] || resolvedStyle}
              </span>
            ) : null}
          </div>
        </div>
        <div className="panel-heading-actions">
          <a
            className="quiet-button compact"
            href={images.length ? api.downloadBundleImagesUrl(channelId, episodeId) : undefined}
            aria-disabled={!images.length}
            download
          >
            <DownloadSimple size={15} />
            Download all
          </a>
          <button
            className="primary-button compact"
            disabled={disabled || activeImageTask || busy === "bundle-images-all" || bundles.length === 0}
            onClick={onGenerateAll}
          >
            {busy === "bundle-images-all" || activeImageTask ? <CircleNotch className="spin" size={15} /> : <Play size={15} />}
            {activeImageTask ? "Generating…" : "Generate all"}
          </button>
        </div>
      </div>
      {bundles.length === 0 ? (
        <p className="artifact-empty">Generate the visual bible to define continuity bundles.</p>
      ) : (
        <div className="bundle-image-list">
          {bundles.map((bundle) => {
            const currentBundleImages = images.filter((image) => image.bundle_id === bundle.bundle_id);
            const task = latestTask(tasks, ["GENERATE_BUNDLE_IMAGE"], bundle.bundle_number);
            const taskActive = Boolean(task && isTaskActive(task));
            return (
              <article className="bundle-image-card" key={bundle.bundle_id}>
                <div className="bundle-image-copy">
                  <div>
                    <span className="continuity-badge">{bundle.bundle_id}</span>
                    <strong>{bundle.title}</strong>
                  </div>
                  <PromptCollapsible prompt={bundle.anchor_prompt} />
                  <span className="bundle-image-count">
                    {currentBundleImages.length} / {imagesPerBundle} image{imagesPerBundle === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="bundle-image-assets">
                  {currentBundleImages.map((image) => (
                    <div className="bundle-image-item" key={image.filename}>
                      <button
                        type="button"
                        className="bundle-image-thumb-btn"
                        onClick={() =>
                          onPreviewImage({
                            url: api.bundleImageUrl(channelId, episodeId, image.filename),
                            filename: image.filename,
                            bundleId: bundle.bundle_id,
                            title: bundle.title,
                            prompt: bundle.anchor_prompt,
                            priceVnd: image.price_vnd,
                            model: image.model,
                            aspectRatio: image.aspect_ratio,
                          })
                        }
                        title="Click to enlarge image"
                      >
                        <img src={api.bundleImageUrl(channelId, episodeId, image.filename)} alt={`${bundle.bundle_id} anchor`} />
                        <span className="bundle-image-zoom-overlay">
                          <Eye size={16} weight="bold" />
                          <span>Zoom</span>
                        </span>
                      </button>
                      {typeof image.price_vnd === "number" ? (
                        <div
                          className="bundle-image-cost-tag"
                          title={
                            image.price_breakdown
                              ? Object.entries(image.price_breakdown)
                                  .map(([k, v]) => `${k}: ${v} VND`)
                                  .join(", ")
                              : `${image.price_vnd} VND`
                          }
                        >
                          <span className="cost-badge">💰 {image.price_vnd.toLocaleString("en-US")} VND</span>
                          {image.aspect_ratio ? <span className="aspect-badge">{image.aspect_ratio}</span> : null}
                          {image.model ? <span className="cost-model">{image.model}</span> : null}
                        </div>
                      ) : null}
                    </div>
                  ))}
                  <button
                    className="quiet-button compact"
                    disabled={disabled || taskActive || busy === `bundle-image-${bundle.bundle_number}`}
                    onClick={() => onGenerate(bundle.bundle_number)}
                  >
                    {taskActive || busy === `bundle-image-${bundle.bundle_number}` ? (
                      <CircleNotch className="spin" size={14} />
                    ) : (
                      <Play size={14} />
                    )}
                    {currentBundleImages.length ? "Regenerate" : "Generate anchor"}
                  </button>
                </div>
                {task ? (
                  <TaskProgressPanel
                    task={task}
                    title={bundle.bundle_id}
                    activeLabel="Generating anchor image"
                    completionLabel="Anchor image ready"
                    now={now}
                    compact
                  />
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
