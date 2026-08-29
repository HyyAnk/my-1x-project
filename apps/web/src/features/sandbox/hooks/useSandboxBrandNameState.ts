import { useState } from "react";

export const SANDBOX_DEFAULT_BRAND_NAME = "Tino";

export function useSandboxBrandNameState(initialName = SANDBOX_DEFAULT_BRAND_NAME) {
  const [channelBrandName, setChannelBrandName] = useState(initialName);
  return {
    channelBrandName,
    setChannelBrandName,
  };
}

export type SandboxBrandNameState = ReturnType<typeof useSandboxBrandNameState>;
