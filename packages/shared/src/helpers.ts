export interface TargetLanguageOption {
  code: string;
  name: string;
  nativeName: string;
}

export const TARGET_LANGUAGE_OPTIONS: TargetLanguageOption[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "no", name: "Norwegian", nativeName: "Norsk" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands" },
  { code: "da", name: "Danish", nativeName: "Dansk" },
  { code: "sv", name: "Swedish", nativeName: "Svenska" },
  { code: "fi", name: "Finnish", nativeName: "Suomi" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "ko", name: "Korean", nativeName: "한국어" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "zh", name: "Chinese", nativeName: "中文" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "ru", name: "Russian", nativeName: "Русский" },
  { code: "th", name: "Thai", nativeName: "ไทย" },
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "tl", name: "Tagalog", nativeName: "Filipino" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe" },
  { code: "ar", name: "Arabic", nativeName: "العربية" },
];

export interface TargetCountryOption {
  rank: number;
  code: string;
  name: string;
  nameVi: string;
  nameEn: string;
  flag: string;
  defaultLanguage: string;
  languageNameVi: string;
}

export const TARGET_COUNTRY_OPTIONS: TargetCountryOption[] = [
  {
    rank: 1,
    code: "AU",
    name: "Úc (Australia)",
    nameVi: "Úc",
    nameEn: "Australia",
    flag: "🇦🇺",
    defaultLanguage: "English",
    languageNameVi: "Tiếng Anh",
  },
  {
    rank: 2,
    code: "US",
    name: "Hoa Kỳ (USA)",
    nameVi: "Hoa Kỳ",
    nameEn: "United States",
    flag: "🇺🇸",
    defaultLanguage: "English",
    languageNameVi: "Tiếng Anh",
  },
  {
    rank: 3,
    code: "CA",
    name: "Canada",
    nameVi: "Canada",
    nameEn: "Canada",
    flag: "🇨🇦",
    defaultLanguage: "English",
    languageNameVi: "Tiếng Anh",
  },
  {
    rank: 4,
    code: "NZ",
    name: "New Zealand",
    nameVi: "New Zealand",
    nameEn: "New Zealand",
    flag: "🇳🇿",
    defaultLanguage: "English",
    languageNameVi: "Tiếng Anh",
  },
  {
    rank: 5,
    code: "CH",
    name: "Thụy Sĩ (Switzerland)",
    nameVi: "Thụy Sĩ",
    nameEn: "Switzerland",
    flag: "🇨🇭",
    defaultLanguage: "German",
    languageNameVi: "Tiếng Đức",
  },
  {
    rank: 6,
    code: "GB",
    name: "Vương quốc Anh (UK)",
    nameVi: "Vương quốc Anh",
    nameEn: "United Kingdom",
    flag: "🇬🇧",
    defaultLanguage: "English",
    languageNameVi: "Tiếng Anh",
  },
  {
    rank: 7,
    code: "NO",
    name: "Na Uy (Norway)",
    nameVi: "Na Uy",
    nameEn: "Norway",
    flag: "🇳🇴",
    defaultLanguage: "Norwegian",
    languageNameVi: "Tiếng Na Uy",
  },
  {
    rank: 8,
    code: "DE",
    name: "Đức (Germany)",
    nameVi: "Đức",
    nameEn: "Germany",
    flag: "🇩🇪",
    defaultLanguage: "German",
    languageNameVi: "Tiếng Đức",
  },
  {
    rank: 9,
    code: "IE",
    name: "Ireland",
    nameVi: "Ireland",
    nameEn: "Ireland",
    flag: "🇮🇪",
    defaultLanguage: "English",
    languageNameVi: "Tiếng Anh",
  },
  {
    rank: 10,
    code: "NL",
    name: "Hà Lan (Netherlands)",
    nameVi: "Hà Lan",
    nameEn: "Netherlands",
    flag: "🇳🇱",
    defaultLanguage: "Dutch",
    languageNameVi: "Tiếng Hà Lan",
  },
  {
    rank: 11,
    code: "DK",
    name: "Đan Mạch (Denmark)",
    nameVi: "Đan Mạch",
    nameEn: "Denmark",
    flag: "🇩🇰",
    defaultLanguage: "Danish",
    languageNameVi: "Tiếng Đan Mạch",
  },
  {
    rank: 12,
    code: "SE",
    name: "Thụy Điển (Sweden)",
    nameVi: "Thụy Điển",
    nameEn: "Sweden",
    flag: "🇸🇪",
    defaultLanguage: "Swedish",
    languageNameVi: "Tiếng Thụy Điển",
  },
  {
    rank: 13,
    code: "AT",
    name: "Áo (Austria)",
    nameVi: "Áo",
    nameEn: "Austria",
    flag: "🇦🇹",
    defaultLanguage: "German",
    languageNameVi: "Tiếng Đức",
  },
  {
    rank: 14,
    code: "FI",
    name: "Phần Lan (Finland)",
    nameVi: "Phần Lan",
    nameEn: "Finland",
    flag: "🇫🇮",
    defaultLanguage: "Finnish",
    languageNameVi: "Tiếng Phần Lan",
  },
  {
    rank: 15,
    code: "BE",
    name: "Bỉ (Belgium)",
    nameVi: "Bỉ",
    nameEn: "Belgium",
    flag: "🇧🇪",
    defaultLanguage: "Dutch",
    languageNameVi: "Tiếng Hà Lan",
  },
  {
    rank: 16,
    code: "FR",
    name: "Pháp (France)",
    nameVi: "Pháp",
    nameEn: "France",
    flag: "🇫🇷",
    defaultLanguage: "French",
    languageNameVi: "Tiếng Pháp",
  },
  {
    rank: 17,
    code: "SG",
    name: "Singapore",
    nameVi: "Singapore",
    nameEn: "Singapore",
    flag: "🇸🇬",
    defaultLanguage: "English",
    languageNameVi: "Tiếng Anh",
  },
  {
    rank: 18,
    code: "KR",
    name: "Hàn Quốc (South Korea)",
    nameVi: "Hàn Quốc",
    nameEn: "South Korea",
    flag: "🇰🇷",
    defaultLanguage: "Korean",
    languageNameVi: "Tiếng Hàn",
  },
  {
    rank: 19,
    code: "JP",
    name: "Nhật Bản (Japan)",
    nameVi: "Nhật Bản",
    nameEn: "Japan",
    flag: "🇯🇵",
    defaultLanguage: "Japanese",
    languageNameVi: "Tiếng Nhật",
  },
  { rank: 20, code: "AE", name: "UAE", nameVi: "UAE", nameEn: "UAE", flag: "🇦🇪", defaultLanguage: "English", languageNameVi: "Tiếng Anh" },
];

export function getCountryOption(countryCodeOrName?: string | null): TargetCountryOption | undefined {
  if (!countryCodeOrName) return undefined;
  const normalized = countryCodeOrName.trim().toUpperCase();
  return TARGET_COUNTRY_OPTIONS.find(
    (c) =>
      c.code.toUpperCase() === normalized ||
      c.name.toUpperCase() === normalized ||
      c.nameEn.toUpperCase() === normalized ||
      c.nameVi.toUpperCase() === normalized,
  );
}

export function getCountryFlag(countryCodeOrName?: string | null): string {
  if (!countryCodeOrName) return "🌐";
  const normalized = countryCodeOrName.trim().toUpperCase();
  if (normalized === "GLOBAL" || normalized === "WORLDWIDE" || normalized === "ALL" || normalized === "") return "🌐";

  const found = getCountryOption(normalized);
  if (found) return found.flag;

  if (/^[A-Z]{2}$/.test(normalized)) {
    return String.fromCodePoint(...[...normalized].map((c) => 127397 + c.charCodeAt(0)));
  }

  return "🌐";
}

export function getCountryName(countryCodeOrName?: string | null): string {
  if (!countryCodeOrName) return "Global";
  const normalized = countryCodeOrName.trim().toUpperCase();
  if (normalized === "GLOBAL" || normalized === "WORLDWIDE" || normalized === "ALL" || normalized === "") return "Global";

  const found = getCountryOption(normalized);
  if (found) return found.nameEn;

  if (normalized === "VN" || normalized === "VIETNAM") return "Vietnam";

  return countryCodeOrName;
}

export function getCountryDisplayName(countryCodeOrName?: string | null): string {
  if (!countryCodeOrName) return "Global";
  const normalized = countryCodeOrName.trim().toUpperCase();
  if (normalized === "GLOBAL" || normalized === "WORLDWIDE" || normalized === "ALL" || normalized === "") return "Global";

  const found = getCountryOption(normalized);
  if (found) return found.name;

  if (normalized === "VN" || normalized === "VIETNAM") return "Việt Nam (Vietnam)";

  return countryCodeOrName;
}

export function getCountryDefaultLanguage(countryCodeOrName?: string | null): string {
  if (!countryCodeOrName) return "English";
  const normalized = countryCodeOrName.trim().toUpperCase();
  const found = getCountryOption(normalized);
  if (found) return found.defaultLanguage;
  if (normalized === "VN") return "Vietnamese";
  return "English";
}

export function getCountryDefaultLanguageVi(countryCodeOrName?: string | null): string {
  if (!countryCodeOrName) return "Tiếng Anh";
  const normalized = countryCodeOrName.trim().toUpperCase();
  const found = getCountryOption(normalized);
  if (found) return found.languageNameVi;
  if (normalized === "VN") return "Tiếng Việt";
  return "Tiếng Anh";
}

export function getLanguageDisplay(lang?: string | null): string {
  if (!lang || !lang.trim()) return "English";
  const normalized = lang.trim();
  const lower = normalized.toLowerCase();

  const found = TARGET_LANGUAGE_OPTIONS.find(
    (l) => l.code.toLowerCase() === lower || l.name.toLowerCase() === lower || l.nativeName.toLowerCase() === lower,
  );
  if (found) return found.name;
  return normalized;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function makeId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
}
