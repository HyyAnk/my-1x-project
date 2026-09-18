import { useEffect } from "react";

export interface UseBeforeUnloadWarningOptions {
  enabled?: boolean;
  message?: string;
}

export const DEFAULT_BEFORE_UNLOAD_WARNING =
  "Mascot slot generation is currently in progress. If you leave or reload now, the operation will continue in the background.";

/**
 * Custom hook to guard against accidental navigation, reload, or tab close
 * while mascot slot generation is actively in progress.
 */
export function useBeforeUnloadWarning(enabledOrOptions?: boolean | UseBeforeUnloadWarningOptions, customMessage?: string): void {
  const isEnabled =
    typeof enabledOrOptions === "object" && enabledOrOptions !== null ? Boolean(enabledOrOptions.enabled) : Boolean(enabledOrOptions);

  const message =
    (typeof enabledOrOptions === "object" && enabledOrOptions !== null ? enabledOrOptions.message : customMessage) ||
    DEFAULT_BEFORE_UNLOAD_WARNING;

  useEffect(() => {
    if (!isEnabled || typeof window === "undefined") {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = message;
      return message;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isEnabled, message]);
}
