import type { MotionCategoryFilter, MotionPlacementFilter } from "../types/motionUi.types";

interface MotionFilterBarProps {
  placementFilter: MotionPlacementFilter;
  categoryFilter: MotionCategoryFilter;
  searchQuery: string;
  onPlacementChange: (placement: MotionPlacementFilter) => void;
  onCategoryChange: (category: MotionCategoryFilter) => void;
  onSearchChange: (query: string) => void;
}

export function MotionFilterBar({
  placementFilter,
  categoryFilter,
  searchQuery,
  onPlacementChange,
  onCategoryChange,
  onSearchChange,
}: MotionFilterBarProps) {
  return (
    <div className="motion-filter-bar">
      <div className="motion-filter-tabs">
        <button
          type="button"
          className={`motion-tab-btn ${placementFilter === "all" ? "is-active" : ""}`}
          onClick={() => onPlacementChange("all")}
        >
          All
        </button>
        <button
          type="button"
          className={`motion-tab-btn ${placementFilter === "intro" ? "is-active" : ""}`}
          onClick={() => onPlacementChange("intro")}
        >
          Intros
        </button>
        <button
          type="button"
          className={`motion-tab-btn ${placementFilter === "outro" ? "is-active" : ""}`}
          onClick={() => onPlacementChange("outro")}
        >
          Outros
        </button>
      </div>

      <div className="motion-filter-right">
        <select
          className="motion-select"
          value={categoryFilter}
          onChange={(e) => onCategoryChange(e.target.value as MotionCategoryFilter)}
          aria-label="Filter by category"
        >
          <option value="all">All Styles</option>
          <option value="kinetic">⚡ Kinetic Typography</option>
          <option value="cyber">👾 Cyber Neon</option>
          <option value="minimal">✨ Minimal Sleek</option>
          <option value="gamified">🎮 Gamified Arcade</option>
        </select>

        <input
          type="text"
          className="motion-search-input"
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search motion templates"
        />
      </div>
    </div>
  );
}
