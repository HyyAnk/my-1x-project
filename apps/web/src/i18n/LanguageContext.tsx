import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Language, TranslationSchema } from "./types";
import { en } from "./en";
import { vi } from "./vi";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
  dict: TranslationSchema;
}

const dictionaries: Record<Language, TranslationSchema> = {
  en,
  vi,
};

const LanguageContext = createContext<LanguageContextType | null>(null);

const STORAGE_KEY = "studio-language";
const DEFAULT_LANGUAGE: Language = "en";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === "undefined") return DEFAULT_LANGUAGE;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "vi" || saved === "en") {
      return saved;
    }
    return DEFAULT_LANGUAGE;
  });

  const setLanguage = (nextLang: Language) => {
    setLanguageState(nextLang);
    try {
      window.localStorage.setItem(STORAGE_KEY, nextLang);
    } catch {
      // Ignore storage errors
    }
  };

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
  }, [language]);

  const dict = dictionaries[language] || dictionaries[DEFAULT_LANGUAGE];

  const t = useMemo(() => {
    return (path: string, params?: Record<string, string | number>): string => {
      const keys = path.split(".");
      let current: unknown = dict;
      let fallback: unknown = dictionaries.en;

      for (const key of keys) {
        if (current && typeof current === "object" && key in current) {
          current = (current as Record<string, unknown>)[key];
        } else {
          current = undefined;
        }

        if (fallback && typeof fallback === "object" && key in fallback) {
          fallback = (fallback as Record<string, unknown>)[key];
        } else {
          fallback = undefined;
        }
      }

      let text = typeof current === "string" ? current : typeof fallback === "string" ? fallback : path;

      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        });
      }

      return text;
    };
  }, [dict]);

  const contextValue = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      dict,
    }),
    [language, t, dict]
  );

  return <LanguageContext.Provider value={contextValue}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

export const useTranslation = useLanguage;
