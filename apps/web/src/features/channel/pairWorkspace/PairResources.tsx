import { ArrowClockwise } from "@phosphor-icons/react";
import { usePairResources } from "./usePairResources";
import { PairResourceCard } from "./PairResourceCard";
import "./pairResources.css";

export function PairResources({ channelId, stylePresetId }: { channelId: string; stylePresetId: string }) {
  const { resources, loading, error, refresh } = usePairResources(channelId, stylePresetId);
  return (
    <section className="pair-resources" aria-label="Video resources" aria-busy={loading}>
      {loading && !resources.length ? <span role="status">Loading resources...</span> : null}
      {error ? <span role="alert">Resources could not be loaded. Retry using Refresh resources.</span> : null}
      <div className="pair-resource-grid">
        {resources.map((resource) => (
          <PairResourceCard
            key={`${resource.kind}:${resource.preview_url}:${resource.transparent_url}`}
            resource={resource}
            filename={`${channelId}_${stylePresetId}_${resource.kind}_transparent.png`}
          />
        ))}
      </div>
      <button
        type="button"
        className="quiet-button pair-resource-refresh"
        aria-label="Refresh resources"
        disabled={loading}
        onClick={() => void refresh()}
      >
        <ArrowClockwise size={16} />
      </button>
    </section>
  );
}
