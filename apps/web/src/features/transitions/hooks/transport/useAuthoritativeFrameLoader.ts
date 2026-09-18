import { useState, useRef, useCallback, useEffect } from "react";
import { getTransitionFrameUrl } from "../../services/transitionPreviewApi";
import type { UseAuthoritativeFrameLoaderOptions, UseAuthoritativeFrameLoaderResult } from "./transport.types";

/**
 * Hook to manage preloading, cancellation tracking, and image decoding
 * for authoritative server-rendered preview frames.
 */
export function useAuthoritativeFrameLoader(options?: UseAuthoritativeFrameLoaderOptions): UseAuthoritativeFrameLoaderResult {
  const [authoritativePngUrl, setAuthoritativePngUrl] = useState<string | null>(null);
  const [isLoadingFrame, setIsLoadingFrame] = useState<boolean>(false);
  const requestSequenceRef = useRef<number>(0);
  const onFrameLoadedRef = useRef(options?.onFrameLoaded);

  useEffect(() => {
    onFrameLoadedRef.current = options?.onFrameLoaded;
  }, [options?.onFrameLoaded]);

  useEffect(() => {
    return () => {
      requestSequenceRef.current += 1;
    };
  }, []);

  const loadAuthoritativeFrame = useCallback(async (frameIndex: number, artifactId: string) => {
    requestSequenceRef.current += 1;
    const currentSeq = requestSequenceRef.current;

    const url = getTransitionFrameUrl(artifactId, frameIndex);
    setIsLoadingFrame(true);

    try {
      const img = new Image();
      img.src = url;
      await img.decode();

      if (requestSequenceRef.current === currentSeq) {
        setAuthoritativePngUrl(url);
        onFrameLoadedRef.current?.(frameIndex);
        setIsLoadingFrame(false);
      }
    } catch {
      if (requestSequenceRef.current === currentSeq) {
        setIsLoadingFrame(false);
      }
    }
  }, []);

  const clearAuthoritativeFrame = useCallback(() => {
    requestSequenceRef.current += 1;
    setAuthoritativePngUrl(null);
    setIsLoadingFrame(false);
  }, []);

  return {
    authoritativePngUrl,
    isLoadingFrame,
    loadAuthoritativeFrame,
    clearAuthoritativeFrame,
  };
}
