import type { Channel, ShortReelRecord, Task } from "@studio/shared";
import { MascotAssetCard } from "./assetCards/MascotAssetCard";
import { StyleAssetCard } from "./assetCards/StyleAssetCard";
import { CoverAssetCard } from "./assetCards/CoverAssetCard";
import { CompiledFlowPrompts } from "./assetCards/CompiledFlowPrompts";
import { useReelAssetsData } from "./assetCards/useReelAssetsData";

export interface ReelAssetsProps {
  reel: ShortReelRecord;
  channel?: Channel;
  onCopyText: (text: string, label?: string) => Promise<boolean>;
  onRegenerateUnit: (target: "cover" | "references") => void;
  isGenerating: boolean;
  activeTask?: Task | null;
}

export function ReelAssets({
  reel,
  channel,
  onCopyText,
  onRegenerateUnit,
  isGenerating,
  activeTask,
}: ReelAssetsProps) {
  const data = useReelAssetsData(reel, channel, activeTask, isGenerating, onCopyText);

  return (
    <div className="short-reel-assets-container">
      <div className="short-reel-asset-cards-grid">
        <MascotAssetCard
          acceptedMascotRef={data.acceptedMascotRef}
          mascotDisplayUrl={data.mascotDisplayUrl}
          channelMasterUrl={data.channelMasterUrl}
        />
        <StyleAssetCard
          referencesState={reel.units.references.state}
          isStylePending={data.isStylePending}
          acceptedStyleRef={data.acceptedStyleRef}
          styleDisplayUrl={data.styleDisplayUrl}
          styleStageMessage={data.styleStage?.message}
          styleError={data.styleError}
          onRegenerate={() => onRegenerateUnit("references")}
        />
        <CoverAssetCard
          coverState={reel.units.cover.state}
          isCoverPending={data.isCoverPending}
          coverPayload={data.coverPayload}
          coverDisplayUrl={data.coverDisplayUrl}
          coverStageMessage={data.coverStage?.message}
          coverError={data.coverError}
          onRegenerate={() => onRegenerateUnit("cover")}
        />
      </div>

      <CompiledFlowPrompts
        compiledPrompts={data.compiledPrompts}
        copiedPromptIndex={data.copiedPromptIndex}
        onCopyPrompt={data.handleCopyPrompt}
      />
    </div>
  );
}
