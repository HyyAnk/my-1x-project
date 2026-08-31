import { PREFERRED_LANGUAGE_COUNTRIES, PREFERRED_LANGUAGE_FLAGS, TARGET_COUNTRY_OPTIONS, TARGET_LANGUAGE_OPTIONS } from "./data.js";
import type { SyncedCountryLanguage, TargetCountryOption, TargetLanguageOption } from "./types.js";

export function getCountryOption(code: string | null | undefined): TargetCountryOption | undefined {
  if (!code) return undefined;
  const upper = code.trim().toUpperCase();
  return TARGET_COUNTRY_OPTIONS.find((c) => c.code === upper);
}

export function getCountryDefaultLanguage(code: string | null | undefined): string {
  const opt = getCountryOption(code);
  return opt ? opt.defaultLanguage : "English";
}

export function getCountryDefaultLanguageVi(code: string | null | undefined): string {
  const opt = getCountryOption(code);
  return opt ? opt.languageNameVi : "Tiếng Anh";
}

export function getLanguageOption(codeOrName: string | null | undefined): TargetLanguageOption | undefined {
  if (!codeOrName) return undefined;
  const lower = codeOrName.trim().toLowerCase();
  return TARGET_LANGUAGE_OPTIONS.find(
    (l) => l.code.toLowerCase() === lower || l.name.toLowerCase() === lower || l.nativeName.toLowerCase() === lower,
  );
}

export function getLanguageDisplay(codeOrName: string | null | undefined): string {
  const opt = getLanguageOption(codeOrName);
  return opt ? opt.name : codeOrName || "English";
}

export function getLanguageDisplayVi(codeOrName: string | null | undefined): string {
  const opt = getLanguageOption(codeOrName);
  if (!opt) return codeOrName || "Tiếng Anh";
  const country = TARGET_COUNTRY_OPTIONS.find((c) => c.defaultLanguage === opt.name);
  return country ? country.languageNameVi : opt.name;
}

export function getCountryFlag(code: string | null | undefined): string {
  if (!code || code === "GLOBAL") return "🌐";
  const opt = getCountryOption(code);
  return opt ? opt.flag : "🌐";
}

export function getCountryName(code: string | null | undefined): string {
  if (!code) return "Unknown";
  if (code === "GLOBAL") return "Global";
  const opt = getCountryOption(code);
  return opt ? opt.nameEn || opt.name : code;
}

export function getCountryRank(code: string | null | undefined): number {
  const opt = getCountryOption(code);
  return opt ? opt.rank : 999;
}

export function formatCountryWithRank(code: string | null | undefined): string {
  const opt = getCountryOption(code);
  if (!opt) return code || "Unknown";
  return `#${opt.rank} ${opt.flag} ${opt.name}`;
}

export function getSyncedCountryLanguages(): SyncedCountryLanguage[] {
  const langMap = new Map<string, SyncedCountryLanguage>();
  for (const c of TARGET_COUNTRY_OPTIONS) {
    if (!PREFERRED_LANGUAGE_COUNTRIES[c.defaultLanguage]) continue;
    const existing = langMap.get(c.defaultLanguage);
    if (!existing) {
      langMap.set(c.defaultLanguage, {
        key: c.defaultLanguage,
        name: c.defaultLanguage,
        nameVi: c.languageNameVi,
        primaryFlag: PREFERRED_LANGUAGE_FLAGS[c.defaultLanguage] || c.flag,
        primaryCountryCode: PREFERRED_LANGUAGE_COUNTRIES[c.defaultLanguage] || c.code,
        countryCodes: [c.code],
      });
    } else {
      existing.countryCodes.push(c.code);
    }
  }
  return Array.from(langMap.values());
}

export const TARGET_COUNTRY_LANGUAGES: SyncedCountryLanguage[] = getSyncedCountryLanguages();

export function matchChannelLanguage(
  channel: { language?: string | null; country?: string | null; market?: string | null },
  targetLanguageKey: string,
): boolean {
  if (!targetLanguageKey || targetLanguageKey === "all") return true;
  const targetKeyLower = targetLanguageKey.trim().toLowerCase();
  const chLang = (channel.language || "").trim().toLowerCase();
  const chCountry = (channel.country || channel.market || "").trim().toUpperCase();

  // Direct match with stored language
  if (chLang === targetKeyLower) return true;

  // Display name match
  if (channel.language && getLanguageDisplay(channel.language).toLowerCase() === targetKeyLower) return true;

  // Country default language match
  const countryOption = getCountryOption(chCountry);
  if (countryOption && countryOption.defaultLanguage.toLowerCase() === targetKeyLower) return true;

  // Synced country list match
  const synced = TARGET_COUNTRY_LANGUAGES.find((l) => l.key.toLowerCase() === targetKeyLower);
  if (synced && synced.countryCodes.includes(chCountry)) return true;

  return false;
}
