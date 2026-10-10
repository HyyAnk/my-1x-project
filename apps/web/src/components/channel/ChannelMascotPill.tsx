import { Smiley } from "@phosphor-icons/react";
import type { MascotProfile } from "@studio/shared";

export type ChannelMascotPillProps = {
  mascot: MascotProfile | undefined;
};

export function ChannelMascotPill({ mascot }: ChannelMascotPillProps) {
  return (
    <div className="channel-card-meta">
      <span className="channel-mascot-pill" title={mascot?.description || mascot?.name || "Mascot"}>
        {mascot?.master_image_url ? (
          <img src={mascot.master_image_url} alt={mascot.name} className="channel-mascot-avatar" />
        ) : (
          <span className="channel-mascot-avatar-fallback">
            <Smiley size={11} weight="fill" />
          </span>
        )}
        <span>{mascot?.name || "Mascot"}</span>
      </span>
    </div>
  );
}
