import { useCallback } from "react";
import type { UseScriptStudioProps } from "./introOutroScriptStudio.types";
import type { IntroOutroScriptData } from "./useIntroOutroScriptData";

export function useScriptStudioOperation(props: UseScriptStudioProps, data: IntroOutroScriptData) {
  return useCallback(
    async (label: string, operation: () => Promise<void>) => {
      data.setBusy(label);
      data.setError(null);
      try {
        await operation();
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Script Studio operation failed";
        data.setError(message);
        props.onNotice({ tone: "bad", message });
        throw cause;
      } finally {
        data.setBusy(null);
      }
    },
    [data, props.onNotice],
  );
}
