import { useCallback, useState } from "react";

export type UseChannelDragAndDropOptions = {
  onReorder: (sourceIndex: number, destinationIndex: number) => void;
  enabled?: boolean;
};

export type DraggableCardProps = {
  draggable: boolean;
  onDragStart: (e: React.DragEvent<HTMLElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLElement>) => void;
  onDragEnter: (e: React.DragEvent<HTMLElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLElement>) => void;
  onDrop: (e: React.DragEvent<HTMLElement>) => void;
  onDragEnd: (e: React.DragEvent<HTMLElement>) => void;
  "data-dragging": boolean;
  "data-drag-over": boolean;
};

export function useChannelDragAndDrop({ onReorder, enabled = true }: UseChannelDragAndDropOptions) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLElement>, index: number, channelId: string) => {
      if (!enabled) return;
      setDraggedIndex(index);
      setDragOverIndex(index);

      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", channelId);
      e.dataTransfer.setData("application/x-channel-index", String(index));
    },
    [enabled]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLElement>, index: number) => {
      if (!enabled || draggedIndex === null) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";

      if (dragOverIndex !== index) {
        setDragOverIndex(index);
      }
    },
    [enabled, draggedIndex, dragOverIndex]
  );

  const handleDragEnter = useCallback(
    (e: React.DragEvent<HTMLElement>, index: number) => {
      if (!enabled || draggedIndex === null) return;
      e.preventDefault();
      if (dragOverIndex !== index) {
        setDragOverIndex(index);
      }
    },
    [enabled, draggedIndex, dragOverIndex]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent<HTMLElement>, index: number) => {
      if (!enabled) return;
      // Only clear if moving out of current target
      if (dragOverIndex === index && e.currentTarget === e.target) {
        setDragOverIndex(null);
      }
    },
    [enabled, dragOverIndex]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLElement>, targetIndex: number) => {
      if (!enabled) return;
      e.preventDefault();

      if (draggedIndex !== null && draggedIndex !== targetIndex) {
        onReorder(draggedIndex, targetIndex);
      }

      setDraggedIndex(null);
      setDragOverIndex(null);
    },
    [enabled, draggedIndex, onReorder]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  /**
   * Helper to generate all necessary props for a draggable card element
   */
  const getDraggableProps = useCallback(
    (index: number, channelId: string): DraggableCardProps => {
      const isCurrentDragged = draggedIndex === index;
      const isCurrentDragOver = dragOverIndex === index && draggedIndex !== null && draggedIndex !== index;

      return {
        draggable: enabled,
        onDragStart: (e: React.DragEvent<HTMLElement>) => handleDragStart(e, index, channelId),
        onDragOver: (e: React.DragEvent<HTMLElement>) => handleDragOver(e, index),
        onDragEnter: (e: React.DragEvent<HTMLElement>) => handleDragEnter(e, index),
        onDragLeave: (e: React.DragEvent<HTMLElement>) => handleDragLeave(e, index),
        onDrop: (e: React.DragEvent<HTMLElement>) => handleDrop(e, index),
        onDragEnd: handleDragEnd,
        "data-dragging": isCurrentDragged,
        "data-drag-over": isCurrentDragOver,
      };
    },
    [
      enabled,
      draggedIndex,
      dragOverIndex,
      handleDragStart,
      handleDragOver,
      handleDragEnter,
      handleDragLeave,
      handleDrop,
      handleDragEnd,
    ]
  );

  /**
   * Move item up (1 step back) - Accessibility & keyboard shortcut support
   */
  const moveUp = useCallback(
    (index: number) => {
      if (index > 0) {
        onReorder(index, index - 1);
      }
    },
    [onReorder]
  );

  /**
   * Move item down (1 step forward) - Accessibility & keyboard shortcut support
   */
  const moveDown = useCallback(
    (index: number, maxIndex: number) => {
      if (index < maxIndex) {
        onReorder(index, index + 1);
      }
    },
    [onReorder]
  );

  return {
    draggedIndex,
    dragOverIndex,
    isDragging: draggedIndex !== null,
    getDraggableProps,
    handleDragStart,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    moveUp,
    moveDown,
  };
}
