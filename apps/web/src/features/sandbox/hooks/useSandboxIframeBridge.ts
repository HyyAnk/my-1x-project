import { useCallback, useRef } from "react";

/**
 * Manages communication with the preview iframe via postMessage
 * and direct window invocation for rehearsal playback.
 */
export function useSandboxIframeBridge() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const seekIframe = useCallback((time: number) => {
    const frame = iframeRef.current;
    if (!frame?.contentWindow) return;
    try {
      frame.contentWindow.postMessage({ type: "REHEARSAL_SEEK", time }, "*");
      const win = frame.contentWindow as unknown as {
        __hyperframesRehearsal?: { seek: (t: number) => void };
      };
      win.__hyperframesRehearsal?.seek(time);
    } catch {
      // Ignored
    }
  }, []);

  const playIframe = useCallback((time?: number) => {
    const frame = iframeRef.current;
    if (!frame?.contentWindow) return;
    try {
      frame.contentWindow.postMessage({ type: "REHEARSAL_PLAY", time }, "*");
      const win = frame.contentWindow as unknown as {
        __hyperframesRehearsal?: { play: (t?: number) => void };
      };
      win.__hyperframesRehearsal?.play(time);
    } catch {
      // Ignored
    }
  }, []);

  const pauseIframe = useCallback(() => {
    const frame = iframeRef.current;
    if (!frame?.contentWindow) return;
    try {
      frame.contentWindow.postMessage({ type: "REHEARSAL_PAUSE" }, "*");
      const win = frame.contentWindow as unknown as {
        __hyperframesRehearsal?: { pause: () => void };
      };
      win.__hyperframesRehearsal?.pause();
    } catch {
      // Ignored
    }
  }, []);

  return {
    iframeRef,
    seekIframe,
    playIframe,
    pauseIframe,
  };
}

export type SandboxIframeBridge = ReturnType<typeof useSandboxIframeBridge>;
