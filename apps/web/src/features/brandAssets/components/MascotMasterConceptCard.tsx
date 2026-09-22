import { ArrowSquareOut, Info, Sparkle, UserCircle } from "@phosphor-icons/react";
import type { ChannelMascotSummary } from "@studio/shared";

export interface MascotMasterConceptCardProps {
  mascot: ChannelMascotSummary | null | undefined;
  onOpenMascot?: (mascotId?: string | null) => void;
}

export function MascotMasterConceptCard({
  mascot,
  onOpenMascot,
}: MascotMasterConceptCardProps) {
  const handleOpenStudio = () => {
    if (onOpenMascot) {
      onOpenMascot(mascot?.mascot_id ?? null);
    } else {
      window.location.hash = mascot?.mascot_id
        ? `#/mascots/${encodeURIComponent(mascot.mascot_id)}`
        : "#/mascots";
    }
  };

  if (!mascot) {
    return (
      <div className="brand-asset-card mascot-concept-card" data-testid="mascot-concept-empty">
        <div className="card-header">
          <div className="card-header-titles">
            <h3 className="card-title">Channel Mascot Concept</h3>
            <span className="card-guidance">Character identity for this channel</span>
          </div>
          <span className="status-pill pill-missing">Unassigned</span>
        </div>

        <div className="empty-mascot-concept">
          <div className="empty-mascot-icon">
            <UserCircle size={40} weight="duotone" />
          </div>
          <p className="empty-mascot-title">No mascot assigned to this channel</p>
          <p className="empty-mascot-desc">
            Assign or create a character in Mascot Studio to establish this channel's brand personality.
          </p>
          <button
            type="button"
            className="button secondary open-mascot-studio-btn"
            onClick={handleOpenStudio}
          >
            <Sparkle size={16} weight="bold" />
            <span>Open Mascot Studio</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="brand-asset-card mascot-concept-card" data-testid="mascot-concept-card">
      <div className="card-header">
        <div className="card-header-titles">
          <div className="card-title-row">
            <Sparkle size={18} weight="fill" className="card-title-icon" />
            <h3 className="card-title">Channel Mascot Concept</h3>
          </div>
          <span className="card-guidance">Synchronized from Mascot Studio (Master Concept)</span>
        </div>
        <span className="status-pill pill-configured" data-testid="active-mascot-badge">
          Active Channel Mascot
        </span>
      </div>

      <div className="mascot-concept-body">
        <div className="mascot-preview-area transparent-checkerboard">
          {mascot.master_image_url ? (
            <img
              src={mascot.master_image_url}
              alt={mascot.name}
              className="mascot-concept-image"
              data-testid="mascot-master-image"
            />
          ) : (
            <div className="mascot-image-placeholder">
              <UserCircle size={48} weight="duotone" />
              <span>Concept pending generation</span>
            </div>
          )}
        </div>

        <div className="mascot-info-panel">
          <div className="mascot-meta-row">
            <span className="meta-label">Mascot Name</span>
            <strong className="meta-value mascot-name" data-testid="mascot-name">
              {mascot.name}
            </strong>
          </div>
          <div className="mascot-meta-row">
            <span className="meta-label">Mascot ID</span>
            <span className="meta-value mascot-id-code" data-testid="mascot-id">
              {mascot.mascot_id}
            </span>
          </div>

          <div className="mascot-sync-note" role="note">
            <Info size={16} className="note-icon" />
            <span>
              Synchronized from Mascot Studio. Master concept is read-only here; poses and variations are managed in Mascot Studio.
            </span>
          </div>

          <div className="mascot-card-actions">
            <button
              type="button"
              className="button secondary open-mascot-studio-btn"
              onClick={handleOpenStudio}
              aria-label={`Open ${mascot.name} in Mascot Studio`}
            >
              <ArrowSquareOut size={16} weight="bold" />
              <span>Open in Mascot Studio</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
