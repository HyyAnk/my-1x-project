import type { ThumbnailLayoutType } from "@studio/shared";

export type SupportedLanguage = "en" | "ja" | "ko" | "es" | "de" | "fr" | "nl" | "no" | "sv" | "da" | "fi";

export type ThumbnailLocalization = {
  hookText: Record<ThumbnailLayoutType, string>;
  badgeTemplate: Record<ThumbnailLayoutType, (count: number) => string>;
};
