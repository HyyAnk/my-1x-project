import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { StageAspectRatio } from "../types";

export interface UseStageViewportDragProps {
  isOpen: boolean;
  aspectRatio: StageAspectRatio;
  scale: number;
  setScale: (scale: number) => void;
  offsetX: number;
  setOffsetX: (x: number) => void;
  offsetY: number;
  setOffsetY: (y: number) => void;
}

export function useStageViewportDrag({
  isOpen,
  aspectRatio,
  scale,
  setScale,
  offsetX,
  setOffsetX,
  offsetY,
  setOffsetY,
}: UseStageViewportDragProps) {
  const stageViewportRef = useRef<HTMLDivElement | null>(null);
  const [viewportDims, setViewportDims] = useState<{ width: number; height: number }>({ width: 800, height: 450 });

  useLayoutEffect(() => {
    if (!stageViewportRef.current || !isOpen) return;
    const el = stageViewportRef.current;
    const updateSize = () => {
      if (el.clientWidth > 0 && el.clientHeight > 0) {
        setViewportDims({ width: el.clientWidth, height: el.clientHeight });
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isOpen]);

  const targetStageWidth = aspectRatio === "16:9" ? 1920 : 1080;
  const targetStageHeight = aspectRatio === "16:9" ? 1080 : 1920;

  // Fit the selected canvas within the container while keeping its aspect ratio.
  const stageScale = useMemo(() => {
    const scaleX = (viewportDims.width - 32) / targetStageWidth;
    const scaleY = (viewportDims.height - 32) / targetStageHeight;
    return Math.max(0.1, Math.min(scaleX, scaleY, 1.0));
  }, [viewportDims, targetStageWidth, targetStageHeight]);

  // Interactive Direct Dragging on Stage
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null);

  const handleMascotMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: offsetX,
      initY: offsetY,
    };
  };

  useEffect(() => {
    if (!isDragging) return;
    const onMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      const dx = (e.clientX - dragStartRef.current.startX) / stageScale;
      const dy = (e.clientY - dragStartRef.current.startY) / stageScale;
      setOffsetX(Math.max(-1500, Math.min(1500, Math.round(dragStartRef.current.initX + dx))));
      setOffsetY(Math.max(-1500, Math.min(1500, Math.round(dragStartRef.current.initY + dy))));
    };
    const onMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging, stageScale, setOffsetX, setOffsetY]);

  // Interactive Corner Resize Dragging
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef<{ startY: number; initScale: number } | null>(null);

  const handleResizeHandleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = {
      startY: e.clientY,
      initScale: scale,
    };
  };

  useEffect(() => {
    if (!isResizing) return;
    const onMouseMove = (e: MouseEvent) => {
      if (!resizeStartRef.current) return;
      const dy = (resizeStartRef.current.startY - e.clientY) / (200 * stageScale);
      const nextScale = Math.max(0.3, Math.min(3.0, Number((resizeStartRef.current.initScale + dy).toFixed(2))));
      setScale(nextScale);
    };
    const onMouseUp = () => {
      setIsResizing(false);
      resizeStartRef.current = null;
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isResizing, stageScale, scale, setScale]);

  return {
    stageViewportRef,
    targetStageWidth,
    targetStageHeight,
    stageScale,
    isDragging,
    isResizing,
    handleMascotMouseDown,
    handleResizeHandleMouseDown,
  };
}
