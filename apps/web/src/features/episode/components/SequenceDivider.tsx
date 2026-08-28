import type { Scene } from "@studio/shared";
import { api, type BundleImage } from "../../../api";
import type { PreviewImageData } from "../types";

export function SequenceDivider({
  scene,
  images,
  channelId,
  episodeId,
  onPreviewImage,
}: {
  scene: Scene;
  images: BundleImage[];
  channelId: string;
  episodeId: string;
  onPreviewImage?: (data: PreviewImageData) => void;
}) {
  const image = images.find((item) => item.bundle_id === scene.continuity_bundle_id && item.variant === 0);
  return (
    <div className="sequence-divider">
      <span>{scene.sequence_id}</span>
      <strong>{scene.sequence_title}</strong>
      {image ? (
        <button
          type="button"
          className="sequence-anchor-btn"
          onClick={() =>
            onPreviewImage?.({
              url: api.bundleImageUrl(channelId, episodeId, image.filename),
              filename: image.filename,
              bundleId: scene.continuity_bundle_id,
              title: scene.sequence_title,
              prompt: scene.visual_prompt,
            })
          }
          title="Click to enlarge image"
        >
          <img src={api.bundleImageUrl(channelId, episodeId, image.filename)} alt={`${scene.continuity_bundle_id} anchor`} />
          <span>{scene.continuity_bundle_id}</span>
        </button>
      ) : null}
    </div>
  );
}
