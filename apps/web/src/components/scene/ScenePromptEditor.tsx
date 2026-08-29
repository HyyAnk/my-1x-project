import { ArrowsOutSimple, CaretDown, CaretUp, Check, Copy } from "@phosphor-icons/react";
import type { Scene } from "@studio/shared";
import { api } from "../../api";

export interface ScenePromptEditorProps {
  scene: Scene;
  channelId: string;
  episodeId: string;
  isPromptExpanded: boolean;
  setLocalPromptExpanded: (expanded: boolean) => void;
  promptRef: React.RefObject<HTMLTextAreaElement | null>;
  processing: boolean;
  mergePending: boolean;
  copied: string | null;
  onCopy: (key: string, value: string) => Promise<void>;
  onChange: (scene: Scene) => void;
  onOpenPromptModal?: (scene: Scene) => void;
  autoGrow: (element: HTMLTextAreaElement) => void;
}

export function ScenePromptEditor({
  scene,
  channelId,
  episodeId,
  isPromptExpanded,
  setLocalPromptExpanded,
  promptRef,
  processing,
  mergePending,
  copied,
  onCopy,
  onChange,
  onOpenPromptModal,
  autoGrow,
}: ScenePromptEditorProps) {
  const referenceAsset = scene.reference_asset_ids.find((asset) => /(?:CB-\d{2,})(?:-alt)?\.png$/i.test(asset));
  const referenceFilename = referenceAsset?.split("/").pop() ?? null;

  return (
    <div className={`scene-block prompt-block ${isPromptExpanded ? "is-expanded" : "is-collapsed"}`}>
      <div className="block-heading">
        <span>Video generation prompt</span>
        <div className="scene-block-actions">
          {scene.continuity_bundle_id ? <span className="reference-asset-tag">Ref: {scene.continuity_bundle_id}</span> : null}
          {referenceFilename ? (
            <a
              className="copy-button"
              href={api.bundleImageUrl(channelId, episodeId, referenceFilename)}
              target="_blank"
              rel="noreferrer"
              download={referenceFilename}
            >
              Download Ref
            </a>
          ) : null}
          {onOpenPromptModal ? (
            <button type="button" className="copy-button" onClick={() => onOpenPromptModal(scene)} title="Open full prompt editor modal">
              <ArrowsOutSimple size={13} />
              <span>Modal</span>
            </button>
          ) : null}
          <button type="button" className="copy-button" onClick={() => void onCopy(`${scene.scene_id}-prompt`, scene.visual_prompt)}>
            {copied === `${scene.scene_id}-prompt` ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied === `${scene.scene_id}-prompt` ? "Copied" : "Copy"}</span>
          </button>
          <button
            type="button"
            className="copy-button prompt-expand-btn"
            onClick={() => setLocalPromptExpanded(!isPromptExpanded)}
            title={isPromptExpanded ? "Collapse prompt view" : "Expand full prompt view"}
          >
            {isPromptExpanded ? <CaretUp size={13} /> : <CaretDown size={13} />}
            <span>{isPromptExpanded ? "Collapse" : "Expand"}</span>
          </button>
        </div>
      </div>
      <div className="prompt-textarea-wrap">
        <textarea
          ref={promptRef}
          rows={2}
          className={`scene-prompt-textarea ${isPromptExpanded ? "is-expanded" : "is-collapsed"}`}
          value={scene.visual_prompt}
          disabled={processing || mergePending}
          onInput={(event) => {
            if (isPromptExpanded) autoGrow(event.currentTarget);
          }}
          onChange={(event) => onChange({ ...scene, visual_prompt: event.target.value })}
        />
        {!isPromptExpanded && scene.visual_prompt.length > 120 ? (
          <div className="prompt-expand-overlay" onClick={() => setLocalPromptExpanded(true)} title="Click to expand prompt">
            <span>Click to view full prompt ({scene.visual_prompt.length} chars)</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
