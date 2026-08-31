export interface TargetLanguageOption {
  code: string;
  name: string;
  nativeName: string;
}

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

export interface SyncedCountryLanguage {
  key: string;
  name: string;
  nameVi: string;
  primaryFlag: string;
  primaryCountryCode: string;
  countryCodes: string[];
}
