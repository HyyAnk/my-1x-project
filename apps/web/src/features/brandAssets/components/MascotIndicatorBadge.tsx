import { Smiley } from "@phosphor-icons/react";
import type { ChannelMascotSummary } from "@studio/shared";

export interface MascotIndicatorBadgeProps {
  mascot?: ChannelMascotSummary | null;
}

export function MascotIndicatorBadge({ mascot }: MascotIndicatorBadgeProps) {
  if (!mascot) {
    return (
      <div
        className="channel-mascot-badge is-unassigned"
        data-testid="mascot-indicator-unassigned"
        title="No mascot assigned to this channel"
      >
        <Smiley size={15} weight="regular" />
        <span>No Mascot Assigned</span>
      </div>
    );
  }

  return (
    <div
      className="channel-mascot-badge is-assigned"
      data-testid="mascot-indicator-assigned"
      title={`Linked Mascot: ${mascot.name}`}
    >
      {mascot.master_image_url ? (
        <img
          src={mascot.master_image_url}
          alt={`${mascot.name} Master Concept`}
          className="mascot-preview-thumb"
        />
      ) : (
        <Smiley size={15} weight="fill" />
      )}
      <span className="mascot-name-label">Mascot: {mascot.name}</span>
    </div>
  );
}
