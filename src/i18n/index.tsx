"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import zhCN from "./zh-CN.json";
import zhTW from "./zh-TW.json";
import en from "./en.json";
import ja from "./ja.json";
import it from "./it.json";
import fr from "./fr.json";
import he from "./he.json";
import pt from "./pt.json";
import es from "./es.json";

export type Language = "zh-CN" | "zh-TW" | "en" | "ja" | "it" | "fr" | "he" | "pt" | "es";

/** Single source of truth for supported languages, display labels and text direction. */
export const LANGUAGES: { code: Language; label: string; dir: "ltr" | "rtl" }[] = [
  { code: "zh-CN", label: "简体中文", dir: "ltr" },
  { code: "zh-TW", label: "繁體中文", dir: "ltr" },
  { code: "en", label: "English", dir: "ltr" },
  { code: "ja", label: "日本語", dir: "ltr" },
  { code: "it", label: "Italiano", dir: "ltr" },
  { code: "fr", label: "Français", dir: "ltr" },
  { code: "he", label: "עברית", dir: "rtl" },
  { code: "pt", label: "Português", dir: "ltr" },
  { code: "es", label: "Español", dir: "ltr" },
];

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
  dir: "ltr" | "rtl";
}

const I18nContext = createContext<I18nContextType | null>(null);

const translations: Record<Language, Record<string, string>> = {
  "zh-CN": zhCN,
  "zh-TW": zhTW,
  "en": en,
  "ja": ja,
  "it": it,
  "fr": fr,
  "he": he,
  "pt": pt,
  "es": es,
};

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>("zh-CN");

  const dir = LANGUAGES.find((l) => l.code === lang)?.dir ?? "ltr";

  // Keep the document's text direction in sync with the active language so the
  // whole app (and the dropdown menu anchor) flips for RTL scripts like Hebrew.
  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [dir, lang]);

  const t = (key: string): string => {
    return translations[lang][key] || key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t, dir }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used within I18nProvider");
  return context;
}
