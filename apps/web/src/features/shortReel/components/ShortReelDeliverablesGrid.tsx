import type { ReelDeliverableUnits, ReelUnitStatus } from "@studio/shared";

const DELIVERABLE_UNIT_KEYS = ["references", "script", "cover", "publishing"] as const;

function getUnitStateClass(state: ReelUnitStatus): string {
  switch (state) {
    case "ready":
      return "short-reel-unit-state-ready";
    case "pending":
      return "short-reel-unit-state-pending";
    case "stale":
      return "short-reel-unit-state-stale";
    case "failed":
      return "short-reel-unit-state-failed";
    default:
      return "short-reel-unit-state-missing";
  }
}

export interface ShortReelDeliverablesGridProps {
  units: ReelDeliverableUnits;
}

/** Overview grid of the four creative deliverable units and their generation states. */
export function ShortReelDeliverablesGrid({ units }: ShortReelDeliverablesGridProps) {
  return (
    <section className="short-reel-card short-reel-units-section" aria-label="Creative Deliverables">
      <div className="short-reel-card-header">
        <h3 className="short-reel-card-title">Creative Deliverables Status</h3>
      </div>
      <div className="short-reel-units-grid">
        {DELIVERABLE_UNIT_KEYS.map((unitKey) => {
          const unit = units[unitKey];
          return (
            <div key={unitKey} className="short-reel-unit-card">
              <span className="short-reel-unit-title">{unitKey}</span>
              <span className="short-reel-unit-status">
                Status: <strong className={getUnitStateClass(unit.state)}>{unit.state}</strong>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
