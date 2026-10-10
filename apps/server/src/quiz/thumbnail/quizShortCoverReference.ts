import sharp from "sharp";
import type { Channel } from "@studio/shared";
import type { StudioLogger } from "../../logger.js";
import type { RepositoryService } from "../../repository.js";
import type { ImageReferenceInput } from "../../providers/imageGeneration/imageGeneration.types.js";
import { loadChannelMascotVisualAnchor } from "./thumbnailLoaders.js";

const PLATE_BACKGROUND = "#1b2a4a";
const SUPPORTED_REFERENCE_MIME_TYPES = new Set<ImageReferenceInput["mimeType"]>(["image/png", "image/jpeg", "image/webp"]);

export interface QuizShortCoverReference {
  reference: ImageReferenceInput;
  /** True when the reference is the channel mascot master image. */
  hasMascotReference: boolean;
  mascotAnchorFingerprint: string | null;
}

function toReferenceMimeType(mimeType: string): ImageReferenceInput["mimeType"] {
  return SUPPORTED_REFERENCE_MIME_TYPES.has(mimeType as ImageReferenceInput["mimeType"])
    ? (mimeType as ImageReferenceInput["mimeType"])
    : "image/png";
}

/** A blank 9:16 plate keeps providers that require a reference image working for channels without a mascot. */
export async function createBlankPortraitPlate(): Promise<Uint8Array> {
  return sharp({ create: { width: 1080, height: 1920, channels: 3, background: PLATE_BACKGROUND } })
    .png()
    .toBuffer();
}

/**
 * Resolves the image the portrait provider is conditioned on: the channel mascot master image when
 * the channel has one, otherwise a blank portrait plate that the prompt tells the model to ignore.
 */
export async function resolveQuizShortCoverReference(
  repository: RepositoryService,
  channel: Pick<Channel, "channel_id" | "mascot_id">,
  quizShortId: string,
  logger?: StudioLogger,
): Promise<QuizShortCoverReference> {
  const anchor = await loadChannelMascotVisualAnchor(repository, channel.channel_id, quizShortId, channel.mascot_id, logger);
  if (anchor) {
    const base64Data = anchor.base64.includes(",") ? anchor.base64.split(",")[1] : anchor.base64;
    return {
      reference: { bytes: Buffer.from(base64Data, "base64"), mimeType: toReferenceMimeType(anchor.mimeType) },
      hasMascotReference: true,
      mascotAnchorFingerprint: anchor.fingerprint,
    };
  }
  return {
    reference: { bytes: await createBlankPortraitPlate(), mimeType: "image/png" },
    hasMascotReference: false,
    mascotAnchorFingerprint: null,
  };
}
