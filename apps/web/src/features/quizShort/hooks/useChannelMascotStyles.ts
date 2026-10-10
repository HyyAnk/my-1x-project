import { useEffect, useState } from "react";
import type { Channel, MascotStyle } from "@studio/shared";
import { api } from "../../../api";

/** Fetches the styles of the channel mascot so the customization bar can offer specific ones. */
export function useChannelMascotStyles(channel: Channel): MascotStyle[] {
  const [styles, setStyles] = useState<MascotStyle[]>([]);
  const mascotId = channel.mascot_id && channel.mascot_id !== "none" ? channel.mascot_id : null;

  useEffect(() => {
    if (!mascotId) {
      setStyles([]);
      return;
    }
    let cancelled = false;
    void api
      .mascot(mascotId)
      .then((response) => {
        if (!cancelled) setStyles(response.mascot.styles ?? []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [mascotId]);

  return styles;
}
