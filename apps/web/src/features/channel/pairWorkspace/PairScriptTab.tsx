import { AutoIdentityControl } from "./AutoIdentityControl";
import { ArrowsClockwise, Sparkle } from "@phosphor-icons/react";
import type { usePairDraft } from "./usePairDraft";
import type { usePairGeneration } from "./usePairGeneration";
import { PairGenerationStatus } from "./PairGenerationStatus";
import { PromptBox } from "./PromptBox";
import { PairResources } from "./PairResources";

export function PairScriptTab({
  draft,
  generation,
  uploading,
  channelId,
  stylePresetId,
}: {
  channelId: string;
  stylePresetId: string;
  draft: ReturnType<typeof usePairDraft>;
  generation: ReturnType<typeof usePairGeneration>;
  uploading: boolean;
}) {
  const hasText = Boolean(draft.texts.intro || draft.texts.outro);
  const { pending } = generation;
  const disabled = pending || uploading || draft.loading || !draft.project || draft.conflict;
  return (
    <div className="pair-script-tab">
      <div className="pair-script-toolbar">
        <button type="button" className="primary-button" disabled={disabled} onClick={() => void generation.generate()}>
          {hasText ? <ArrowsClockwise size={18} /> : <Sparkle size={18} />} {hasText ? "Regenerate" : "Generate Script"}
        </button>
        <AutoIdentityControl checked={generation.autoIdentity} disabled={pending || uploading} onChange={generation.setAutoIdentity} />
      </div>
      <PairGenerationStatus generation={generation} disabled={disabled} />
      <PairResources channelId={channelId} stylePresetId={stylePresetId} />
      <div className="pair-prompt-grid">
        {(["intro", "outro"] as const).map((kind) => (
          <PromptBox
            key={kind}
            kind={kind}
            value={draft.texts[kind]}
            disabled={pending || uploading || draft.loading}
            onChange={(text) => draft.edit(kind, text)}
          />
        ))}
      </div>
      <div className="pair-save-status" role="status">
        {draft.loading
          ? "Loading draft..."
          : draft.status === "saving" || draft.status === "unsaved"
            ? "Saving draft..."
            : draft.status === "failed"
              ? "Draft not saved"
              : hasText
                ? "Draft saved"
                : ""}
      </div>
      {draft.error ? (
        <div className="script-alert error" role="alert">
          <span>{draft.error}</span>
          <button
            type="button"
            className="quiet-button"
            onClick={() => void (draft.conflict ? draft.reload() : draft.project ? draft.flush() : draft.open()).catch(() => undefined)}
          >
            {draft.conflict ? "Reload draft" : draft.project ? "Retry save" : "Retry"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
