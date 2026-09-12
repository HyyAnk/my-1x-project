import type { ImageProviderId } from "@studio/shared";

export function getProviderKeyLabel(imageProvider: ImageProviderId): string {
  if (imageProvider === "gpti2") return "gpti2.store API key";
  if (imageProvider === "shopaikey") return "ShopAiKey API key";
  return "API Key / Bearer Token";
}

export function getProviderKeyPlaceholder(
  imageProvider: ImageProviderId,
  hasKey: boolean,
  showKey: boolean,
): string {
  if (hasKey) {
    return showKey
      ? "Stored securely in local settings (enter new key to replace)"
      : "•••••••••••••••••••••••••••••••• (Key saved & active)";
  }
  if (imageProvider === "gpti2") return "Paste gpti2.store API key (sk-...)";
  if (imageProvider === "shopaikey") return "Paste ShopAiKey API key (sk-...)";
  return "Paste custom API key or Bearer token";
}

export function getProviderKeyHelpText(imageProvider: ImageProviderId, hasKey: boolean): string {
  if (hasKey) {
    return "Key stored securely in local settings (gitignored). You can edit directly to replace or click the trash icon to remove.";
  }
  if (imageProvider === "gpti2") {
    return "Get your API key from the Account tab at https://gpti2.store. Stored securely in local settings (gitignored).";
  }
  if (imageProvider === "shopaikey") {
    return "Get your API key from https://shopaikey.com. Stored securely in local settings (gitignored).";
  }
  return "Key or token for your custom OpenAI-compatible endpoint. Stored securely in local settings.";
}
