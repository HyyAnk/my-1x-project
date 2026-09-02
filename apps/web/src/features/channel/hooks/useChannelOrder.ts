import { useCallback, useEffect, useMemo, useState } from "react";
import type { Channel } from "@studio/shared";

export const CHANNEL_ORDER_STORAGE_KEY = "studio_channels_custom_order";

/**
 * Pure helper to compute ordered channels based on saved custom order.
 * Any new channels not present in savedOrder are automatically placed at the end.
 */
export function computeOrderedChannels(channels: Channel[], savedOrder: string[] | null): Channel[] {
  if (!channels || channels.length === 0) return [];
  if (!savedOrder || savedOrder.length === 0) return [...channels];

  const channelMap = new Map<string, Channel>();
  for (const ch of channels) {
    channelMap.set(ch.channel_id, ch);
  }

  const result: Channel[] = [];
  const visitedIds = new Set<string>();

  // 1. Position channels present in savedOrder
  for (const id of savedOrder) {
    const ch = channelMap.get(id);
    if (ch) {
      result.push(ch);
      visitedIds.add(id);
    }
  }

  // 2. Any channel not in savedOrder (e.g. newly created channels) is appended to the end
  for (const ch of channels) {
    if (!visitedIds.has(ch.channel_id)) {
      result.push(ch);
    }
  }

  return result;
}

export function loadSavedOrder(): string[] | null {
  try {
    const raw = window.localStorage.getItem(CHANNEL_ORDER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0
      ? (parsed.filter((id) => typeof id === "string") as string[])
      : null;
  } catch {
    return null;
  }
}

export function saveOrderToStorage(order: string[] | null): void {
  try {
    if (!order || order.length === 0) {
      window.localStorage.removeItem(CHANNEL_ORDER_STORAGE_KEY);
    } else {
      window.localStorage.setItem(CHANNEL_ORDER_STORAGE_KEY, JSON.stringify(order));
    }
  } catch {
    // Gracefully ignore storage quota / sandbox write errors
  }
}

export function useChannelOrder(channels: Channel[]) {
  const [customOrderIds, setCustomOrderIds] = useState<string[] | null>(() => loadSavedOrder());

  // Compute ordered channel list
  const orderedChannels = useMemo(() => {
    return computeOrderedChannels(channels, customOrderIds);
  }, [channels, customOrderIds]);

  // If a custom order is active, keep it in sync when new channels are added or removed
  useEffect(() => {
    if (!customOrderIds || !channels || channels.length === 0) return;

    const currentChannelIds = new Set(channels.map((c) => c.channel_id));
    const validSavedIds = customOrderIds.filter((id) => currentChannelIds.has(id));
    const unlistedIds = channels.filter((c) => !customOrderIds.includes(c.channel_id)).map((c) => c.channel_id);

    // If new channels were added or old channels deleted, update the custom order list
    if (unlistedIds.length > 0 || validSavedIds.length !== customOrderIds.length) {
      const updatedOrder = [...validSavedIds, ...unlistedIds];
      setCustomOrderIds(updatedOrder);
      saveOrderToStorage(updatedOrder);
    }
  }, [channels, customOrderIds]);

  /**
   * Set an explicit order of channel IDs and persist to localStorage
   */
  const updateOrder = useCallback((newOrderIds: string[]) => {
    setCustomOrderIds(newOrderIds);
    saveOrderToStorage(newOrderIds);
  }, []);

  /**
   * Move a channel from sourceIndex to destinationIndex
   */
  const reorderChannel = useCallback(
    (sourceIndex: number, destinationIndex: number) => {
      if (sourceIndex === destinationIndex || sourceIndex < 0 || destinationIndex < 0) return;

      const currentList = [...orderedChannels];
      if (sourceIndex >= currentList.length || destinationIndex >= currentList.length) return;

      const [movedItem] = currentList.splice(sourceIndex, 1);
      currentList.splice(destinationIndex, 0, movedItem);

      const newIds = currentList.map((c) => c.channel_id);
      updateOrder(newIds);
    },
    [orderedChannels, updateOrder]
  );

  /**
   * Pin a channel directly to the top (index 0)
   */
  const pinToTop = useCallback(
    (channelId: string) => {
      const sourceIndex = orderedChannels.findIndex((c) => c.channel_id === channelId);
      if (sourceIndex > 0) {
        reorderChannel(sourceIndex, 0);
      }
    },
    [orderedChannels, reorderChannel]
  );

  /**
   * Reset custom order and clear persisted storage
   */
  const resetOrder = useCallback(() => {
    saveOrderToStorage(null);
    setCustomOrderIds(null);
  }, []);

  return {
    orderedChannels,
    customOrderIds,
    updateOrder,
    reorderChannel,
    pinToTop,
    resetOrder,
    hasCustomOrder: Boolean(customOrderIds && customOrderIds.length > 0),
  };
}
