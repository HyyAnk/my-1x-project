import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { formatDuration } from "../../types";

type ShotPlanToolbarProps = {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredScenesCount: number;
  totalScenesCount: number;
  filteredTotalSeconds: number;
  sequences: Array<{ id: string; title: string; count: number }>;
  selectedSequenceId: string;
  setSelectedSequenceId: (id: string) => void;
  selectedStatusFilter: string;
  setSelectedStatusFilter: (status: string) => void;
  filterCounts: { missingAudio: number; audioMismatch: number; hasOverlay: number; multiCut: number };
};

export function ShotPlanToolbar({
  searchQuery,
  setSearchQuery,
  filteredScenesCount,
  totalScenesCount,
  filteredTotalSeconds,
  sequences,
  selectedSequenceId,
  setSelectedSequenceId,
  selectedStatusFilter,
  setSelectedStatusFilter,
  filterCounts,
}: ShotPlanToolbarProps) {
  const hasActiveFilters = selectedSequenceId !== "all" || selectedStatusFilter !== "all" || Boolean(searchQuery);

  const resetFilters = () => {
    setSelectedSequenceId("all");
    setSelectedStatusFilter("all");
    setSearchQuery("");
  };

  return (
    <div className="shot-plan-toolbar">
      <div className="toolbar-top-row">
        <div className="search-box">
          <MagnifyingGlass size={15} className="search-icon" />
          <input
            type="text"
            placeholder="Search dialogue, prompt, sequence, or shot #…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery ? (
            <button type="button" className="search-clear-btn" onClick={() => setSearchQuery("")} title="Clear search query">
              <X size={14} />
            </button>
          ) : null}
        </div>

        <div className="toolbar-summary-meta">
          <span>
            Showing <strong>{filteredScenesCount}</strong> of <strong>{totalScenesCount}</strong> shots (
            {formatDuration(filteredTotalSeconds)})
          </span>
          {hasActiveFilters ? (
            <button type="button" className="link-button" style={{ fontSize: "12px", marginLeft: "6px" }} onClick={resetFilters}>
              Reset filters
            </button>
          ) : null}
        </div>
      </div>

      <div className="toolbar-filters-row">
        {sequences.length > 1 ? (
          <div className="filter-group">
            <span className="filter-label">Sequence:</span>
            <div className="filter-pills" role="group" aria-label="Filter by sequence">
              <button
                type="button"
                className={`filter-pill ${selectedSequenceId === "all" ? "is-active" : ""}`}
                onClick={() => setSelectedSequenceId("all")}
              >
                All ({totalScenesCount})
              </button>
              {sequences.map((seq) => (
                <button
                  key={seq.id}
                  type="button"
                  className={`filter-pill ${selectedSequenceId === seq.id ? "is-active" : ""}`}
                  onClick={() => setSelectedSequenceId(seq.id)}
                  title={seq.title}
                >
                  {seq.title} ({seq.count})
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="filter-group">
          <span className="filter-label">Filter:</span>
          <div className="filter-pills" role="group" aria-label="Filter by status">
            <button
              type="button"
              className={`filter-pill ${selectedStatusFilter === "all" ? "is-active" : ""}`}
              onClick={() => setSelectedStatusFilter("all")}
            >
              All
            </button>
            {filterCounts.missingAudio > 0 ? (
              <button
                type="button"
                className={`filter-pill is-warning ${selectedStatusFilter === "missing_audio" ? "is-active" : ""}`}
                onClick={() => setSelectedStatusFilter(selectedStatusFilter === "missing_audio" ? "all" : "missing_audio")}
              >
                🎙️ Missing Audio ({filterCounts.missingAudio})
              </button>
            ) : null}
            {filterCounts.audioMismatch > 0 ? (
              <button
                type="button"
                className={`filter-pill is-warning ${selectedStatusFilter === "audio_mismatch" ? "is-active" : ""}`}
                onClick={() => setSelectedStatusFilter(selectedStatusFilter === "audio_mismatch" ? "all" : "audio_mismatch")}
              >
                ⚠️ Audio Mismatch ({filterCounts.audioMismatch})
              </button>
            ) : null}
            {filterCounts.hasOverlay > 0 ? (
              <button
                type="button"
                className={`filter-pill ${selectedStatusFilter === "has_overlay" ? "is-active" : ""}`}
                onClick={() => setSelectedStatusFilter(selectedStatusFilter === "has_overlay" ? "all" : "has_overlay")}
              >
                🎨 Overlays ({filterCounts.hasOverlay})
              </button>
            ) : null}
            {filterCounts.multiCut > 0 ? (
              <button
                type="button"
                className={`filter-pill ${selectedStatusFilter === "multi_cut" ? "is-active" : ""}`}
                onClick={() => setSelectedStatusFilter(selectedStatusFilter === "multi_cut" ? "all" : "multi_cut")}
              >
                ✂️ Multi-cut ({filterCounts.multiCut})
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
