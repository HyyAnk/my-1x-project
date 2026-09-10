import { useEffect, useState } from "react";
import { Copy, Check, ArrowClockwise } from "@phosphor-icons/react";
import type { Channel, ReelUnitStatus, ShortReelRecord, Task } from "@studio/shared";
import { api } from "../../../api";
import { ReelAssetCard } from "./ReelAssetCard";

function getUnitTone(state: ReelUnitStatus, isPending: boolean): "ready" | "pending" | "failed" | "stale" | "missing" | "neutral" {
  if (isPending) return "pending";
  if (state === "cancelled") return "neutral";
  return state;
}

export interface ReelAssetsProps {
  reel: ShortReelRecord;
  channel?: Channel;
  onCopyText: (text: string, label?: string) => Promise<boolean>;
  onRegenerateUnit: (target: "cover" | "references") => void;
  isGenerating: boolean;
  activeTask?: Task | null;
}

interface MascotAssetCardProps {
  acceptedMascotRef?: { width: number; height: number; mime_type: string; checksum: string };
  mascotDisplayUrl: string | null;
  channelMasterUrl: string | null;
}

function MascotAssetCard({ acceptedMascotRef, mascotDisplayUrl, channelMasterUrl }: MascotAssetCardProps) {
  return (
    <ReelAssetCard
      title="Channel Mascot Reference"
      roleLabel="Mascot"
      badge={{
        label: acceptedMascotRef ? "Accepted Asset" : channelMasterUrl ? "Channel Master" : "Not Assigned",
        tone: acceptedMascotRef ? "ready" : channelMasterUrl ? "neutral" : "missing",
      }}
      aspectRatio="1:1"
      imageUrl={mascotDisplayUrl}
      imageAlt="Mascot reference"
      meta={
        acceptedMascotRef
          ? {
              dimensions: `${acceptedMascotRef.width}×${acceptedMascotRef.height}`,
              mimeType: acceptedMascotRef.mime_type,
              checksum: acceptedMascotRef.checksum,
            }
          : undefined
      }
      downloadUrl={mascotDisplayUrl}
      downloadName="mascot-master.png"
      emptyState={{
        title: "No Mascot Assigned",
        description: "Assign a mascot to this channel in Mascot Studio to generate portrait packages.",
        actionLink: {
          label: "Open Mascot Studio",
          href: "#mascots",
        },
      }}
      ariaLabel="Mascot Reference"
    />
  );
}

interface StyleAssetCardProps {
  referencesState: ReelUnitStatus;
  isStylePending: boolean;
  acceptedStyleRef?: { width: number; height: number; mime_type: string; checksum: string };
  styleDisplayUrl: string | null;
  styleStageMessage?: string;
  styleError: string | null;
  onRegenerate: () => void;
}

function StyleAssetCard({
  referencesState,
  isStylePending,
  acceptedStyleRef,
  styleDisplayUrl,
  styleStageMessage,
  styleError,
  onRegenerate,
}: StyleAssetCardProps) {
  return (
    <ReelAssetCard
      title="Portrait Style Reference"
      roleLabel="9:16 Style"
      badge={{
        label: isStylePending ? "Generating" : referencesState,
        tone: getUnitTone(referencesState, isStylePending),
      }}
      aspectRatio="9:16"
      imageUrl={isStylePending && acceptedStyleRef ? null : styleDisplayUrl}
      previousImageUrl={styleDisplayUrl}
      imageAlt="Short-Reel 9:16 portrait style reference"
      isGenerating={isStylePending}
      statusMessage={styleStageMessage || "Generating portrait style 9:16..."}
      error={styleError}
      actionButton={{
        label: acceptedStyleRef ? "Regenerate Style" : "Generate Style",
        onClick: onRegenerate,
        ariaLabel: acceptedStyleRef ? "Regenerate Style Reference" : "Generate Style Reference",
        icon: <ArrowClockwise size={14} />,
      }}
      retryButton={
        styleError
          ? {
              label: "Retry Style",
              onClick: onRegenerate,
              ariaLabel: "Retry Style Generation",
            }
          : undefined
      }
      meta={
        acceptedStyleRef
          ? {
              dimensions: `${acceptedStyleRef.width}×${acceptedStyleRef.height}`,
              mimeType: acceptedStyleRef.mime_type,
              checksum: acceptedStyleRef.checksum,
            }
          : undefined
      }
      downloadUrl={styleDisplayUrl}
      downloadName="portrait-style.png"
      emptyState={{
        title: "Style Not Generated",
        description: "Click 'Generate Style' to produce a 9:16 portrait style scene conditioned on the mascot.",
      }}
      ariaLabel="Portrait Style Reference"
    />
  );
}

interface CoverAssetCardProps {
  coverState: ReelUnitStatus;
  isCoverPending: boolean;
  coverPayload?: { width: number; height: number; mime_type: string; checksum: string } | null;
  coverDisplayUrl: string | null;
  coverStageMessage?: string;
  coverError: string | null;
  onRegenerate: () => void;
}

function CoverAssetCard({
  coverState,
  isCoverPending,
  coverPayload,
  coverDisplayUrl,
  coverStageMessage,
  coverError,
  onRegenerate,
}: CoverAssetCardProps) {
  return (
    <ReelAssetCard
      title="Cover Image"
      roleLabel="9:16 Cover"
      badge={{
        label: isCoverPending ? "Generating" : coverState,
        tone: getUnitTone(coverState, isCoverPending),
      }}
      aspectRatio="9:16"
      imageUrl={isCoverPending && coverPayload ? null : coverDisplayUrl}
      previousImageUrl={coverDisplayUrl}
      imageAlt="Short-Reel cover"
      isGenerating={isCoverPending}
      statusMessage={coverStageMessage || "Generating 1080x1920 cover image..."}
      error={coverError}
      actionButton={{
        label: coverPayload ? "Regenerate Cover" : "Generate Cover",
        onClick: onRegenerate,
        ariaLabel: coverPayload ? "Regenerate Cover Image" : "Generate Cover Image",
        icon: <ArrowClockwise size={14} />,
      }}
      retryButton={
        coverError
          ? {
              label: "Retry Cover",
              onClick: onRegenerate,
              ariaLabel: "Retry Cover Generation",
            }
          : undefined
      }
      meta={
        coverPayload
          ? {
              dimensions: `${coverPayload.width}×${coverPayload.height}`,
              mimeType: coverPayload.mime_type,
              checksum: coverPayload.checksum,
            }
          : undefined
      }
      downloadUrl={coverDisplayUrl}
      downloadName="short-reel-cover.png"
      downloadAriaLabel="Download cover"
      emptyState={{
        title: "Cover Not Generated",
        description: "Cover image is conditioned on the accepted style reference and script.",
      }}
      ariaLabel="Cover Image"
    />
  );
}

interface CompiledFlowPromptsProps {
  compiledPrompts: string[];
  copiedPromptIndex: number | null;
  onCopyPrompt: (index: number, text: string) => void;
}

function CompiledFlowPrompts({ compiledPrompts, copiedPromptIndex, onCopyPrompt }: CompiledFlowPromptsProps) {
  return (
    <section className="short-reel-card short-reel-card-fullwidth" aria-label="Flow Prompts">
      <div className="short-reel-card-header">
        <div className="short-reel-card-title-group">
          <h3 className="short-reel-card-title">Compiled Flow Generation Prompts</h3>
          <span className="short-reel-badge">3 Segments</span>
        </div>
      </div>

      {compiledPrompts.length === 3 ? (
        <div className="short-reel-prompts-grid">
          {compiledPrompts.map((promptText, pIdx) => {
            const isCopied = copiedPromptIndex === pIdx;
            return (
              <div key={pIdx} className="short-reel-prompt-item">
                <div className="short-reel-prompt-header">
                  <span className="short-reel-prompt-title">
                    Segment {pIdx + 1} ({pIdx === 0 ? "Generate" : "Extend"})
                  </span>
                  <button
                    type="button"
                    className="short-reel-copy-btn"
                    onClick={() => onCopyPrompt(pIdx, promptText)}
                    aria-label={`Copy Prompt for Segment ${pIdx + 1}`}
                  >
                    {isCopied ? <Check size={14} weight="bold" /> : <Copy size={14} />}
                    <span>{isCopied ? "Copied" : "Copy Prompt"}</span>
                  </button>
                </div>
                <pre className="short-reel-prompt-code">{promptText}</pre>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="short-reel-empty-text">Prompts will be compiled once the script is generated and accepted.</p>
      )}
    </section>
  );
}

function resolveStageStatuses(units: ShortReelRecord["units"], activeTask?: Task | null, isGenerating = false) {
  const stages = activeTask?.short_reel_progress?.stages;
  const styleStage = Array.isArray(stages) ? stages.find((s) => s.stage === "style" || (s.stage as string) === "references") : undefined;
  const coverStage = Array.isArray(stages) ? stages.find((s) => s.stage === "cover") : undefined;

  const isStylePending =
    units.references.state === "pending" || (isGenerating && (styleStage?.state === "running" || styleStage?.state === "pending"));
  const isCoverPending =
    units.cover.state === "pending" || (isGenerating && (coverStage?.state === "running" || coverStage?.state === "pending"));

  const styleError =
    units.references.state === "failed"
      ? units.references.current_attempt?.error_message ||
        (styleStage?.state === "failed" ? styleStage.message : null) ||
        "Style generation failed."
      : null;
  const coverError =
    units.cover.state === "failed"
      ? units.cover.current_attempt?.error_message ||
        (coverStage?.state === "failed" ? coverStage.message : null) ||
        "Cover generation failed."
      : null;

  return {
    styleStage,
    coverStage,
    isStylePending,
    isCoverPending,
    styleError,
    coverError,
  };
}

export function ReelAssets({ reel, channel, onCopyText, onRegenerateUnit, isGenerating, activeTask }: ReelAssetsProps) {
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
    const success = await onCopyText(text, `Prompt ${index + 1}`);
    if (success) {
      setCopiedPromptIndex(index);
      setTimeout(() => setCopiedPromptIndex(null), 2500);
    }
  };

  const { styleStage, coverStage, isStylePending, isCoverPending, styleError, coverError } = resolveStageStatuses(
    units,
    activeTask,
    isGenerating,
  );

  const mascotDisplayUrl = acceptedMascotRef ? assetUrl(acceptedMascotRef.asset_id) : channelMasterUrl;
  const styleDisplayUrl = acceptedStyleRef ? assetUrl(acceptedStyleRef.asset_id) : null;
  const coverDisplayUrl = coverPayload ? assetUrl(coverPayload.asset_id) : null;

  return (
    <div className="short-reel-assets-container">
      <div className="short-reel-asset-cards-grid">
        <MascotAssetCard acceptedMascotRef={acceptedMascotRef} mascotDisplayUrl={mascotDisplayUrl} channelMasterUrl={channelMasterUrl} />
        <StyleAssetCard
          referencesState={units.references.state}
          isStylePending={isStylePending}
          acceptedStyleRef={acceptedStyleRef}
          styleDisplayUrl={styleDisplayUrl}
          styleStageMessage={styleStage?.message}
          styleError={styleError}
          onRegenerate={() => onRegenerateUnit("references")}
        />
        <CoverAssetCard
          coverState={units.cover.state}
          isCoverPending={isCoverPending}
          coverPayload={coverPayload}
          coverDisplayUrl={coverDisplayUrl}
          coverStageMessage={coverStage?.message}
          coverError={coverError}
          onRegenerate={() => onRegenerateUnit("cover")}
        />
      </div>

      <CompiledFlowPrompts compiledPrompts={compiledPrompts} copiedPromptIndex={copiedPromptIndex} onCopyPrompt={handleCopyPrompt} />
    </div>
  );
}
