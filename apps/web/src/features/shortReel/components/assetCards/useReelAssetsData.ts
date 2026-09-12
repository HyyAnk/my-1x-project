import { useEffect, useState } from "react";
import type { Channel, ShortReelRecord, Task } from "@studio/shared";
import { api } from "../../../../api";
import { resolveStageStatuses } from "./assetCardUtils";

export function useReelAssetsData(
  reel: ShortReelRecord,
  channel?: Channel,
  activeTask?: Task | null,
  isGenerating = false,
  onCopyText?: (text: string, label?: string) => Promise<boolean>,
) {
  const [copiedPromptIndex, setCopiedPromptIndex] = useState<number | null>(null);
  const [channelMasterUrl, setChannelMasterUrl] = useState<string | null>(null);

  const { units } = reel;
  const referencesPayload = units.references.last_accepted_payload;
  const coverPayload = units.cover.last_accepted_payload;
  const scriptPayload = units.script.last_accepted_payload;
  const compiledPrompts = scriptPayload?.compiled_prompts ?? [];

  const assetUrl = (assetId: string) => api.getAssetUrl(reel.channel_id, reel.reel_id, assetId);
  const acceptedMascotRef = referencesPayload?.references?.find((r) => r.role === "mascot");
  const acceptedStyleRef = referencesPayload?.references?.find((r) => r.role === "style");

  useEffect(() => {
    let cancelled = false;
    if (!acceptedMascotRef && channel?.mascot_id) {
      void api
        .mascot(channel.mascot_id)
        .then((res) => {
          if (!cancelled && res.mascot?.master_image_url) {
            setChannelMasterUrl(res.mascot.master_image_url);
          }
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [acceptedMascotRef, channel?.mascot_id]);

  const handleCopyPrompt = async (index: number, text: string) => {
    if (!onCopyText) return;
    const success = await onCopyText(text, `Prompt ${index + 1}`);
    if (success) {
      setCopiedPromptIndex(index);
      setTimeout(() => setCopiedPromptIndex(null), 2500);
    }
  };

  const { styleStage, coverStage, isStylePending, isCoverPending, styleError, coverError } =
    resolveStageStatuses(units, activeTask, isGenerating);

  const mascotDisplayUrl = acceptedMascotRef ? assetUrl(acceptedMascotRef.asset_id) : channelMasterUrl;
  const styleDisplayUrl = acceptedStyleRef ? assetUrl(acceptedStyleRef.asset_id) : null;
  const coverDisplayUrl = coverPayload ? assetUrl(coverPayload.asset_id) : null;

  return {
    acceptedMascotRef,
    acceptedStyleRef,
    coverPayload,
    compiledPrompts,
    channelMasterUrl,
    mascotDisplayUrl,
    styleDisplayUrl,
    coverDisplayUrl,
    copiedPromptIndex,
    handleCopyPrompt,
    styleStage,
    coverStage,
    isStylePending,
    isCoverPending,
    styleError,
    coverError,
  };
}
