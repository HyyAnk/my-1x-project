import { useState } from "react";
import { usePairDraft } from "./usePairDraft";
import { usePairGeneration } from "./usePairGeneration";
import { usePairUpload } from "./usePairUpload";
import { PairScriptTab } from "./PairScriptTab";
import { PairUploadTab } from "./PairUploadTab";
import "./pairWorkspace.css";

export function NewPairCard({
  channelId,
  stylePresetId,
  onUploaded,
}: {
  channelId: string;
  stylePresetId: string;
  onUploaded: () => Promise<void>;
}) {
  const [tab, setTab] = useState<"script" | "upload">("script");
  const draft = usePairDraft(channelId, stylePresetId);
  const generation = usePairGeneration(channelId, draft);
  const upload = usePairUpload(channelId, stylePresetId, draft, onUploaded);
  return (
    <article className="new-pair-card" aria-label="New Pair">
      <header className="new-pair-header">
        <h3>New Pair</h3>
        <div role="tablist" aria-label="New pair steps" className="pair-tabs">
          {(["script", "upload"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              id={`pair-tab-${value}`}
              aria-controls={`pair-panel-${value}`}
              aria-selected={tab === value}
              tabIndex={tab === value ? 0 : -1}
              onClick={() => setTab(value)}
              onKeyDown={(event) => {
                if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
                  event.preventDefault();
                  const next = event.key === "Home" ? "script" : event.key === "End" ? "upload" : value === "script" ? "upload" : "script";
                  setTab(next);
                  document.getElementById(`pair-tab-${next}`)?.focus();
                }
              }}
            >
              {value === "script" ? "Script" : "Upload"}
            </button>
          ))}
        </div>
      </header>
      <div id="pair-panel-script" role="tabpanel" aria-labelledby="pair-tab-script" hidden={tab !== "script"}>
        <PairScriptTab
          channelId={channelId}
          stylePresetId={stylePresetId}
          draft={draft}
          generation={generation}
          uploading={upload.uploading}
        />
      </div>
      <div id="pair-panel-upload" role="tabpanel" aria-labelledby="pair-tab-upload" hidden={tab !== "upload"}>
        <PairUploadTab upload={upload} disabled={generation.pending || draft.loading || !draft.project || draft.conflict} />
        {draft.error ? (
          <div role="alert" className="script-alert error">
            {draft.error}
            <button type="button" className="quiet-button" onClick={() => void (draft.conflict ? draft.reload() : draft.open())}>
              Reload draft
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}
