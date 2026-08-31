import { useState } from "react";
import type { ChannelFilterTab } from "../types";

export function useStageChannelFilter() {
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([]);
  const [channelSearchQuery, setChannelSearchQuery] = useState("");
  const [channelFilterTab, setChannelFilterTab] = useState<ChannelFilterTab>("all");

  return {
    selectedChannelIds,
    setSelectedChannelIds,
    channelSearchQuery,
    setChannelSearchQuery,
    channelFilterTab,
    setChannelFilterTab,
  };
}
