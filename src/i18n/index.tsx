"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import zhCN from "./zh-CN.json";
import zhTW from "./zh-TW.json";
import en from "./en.json";
import yue from "./yue.json";
import ja from "./ja.json";

export type Language = "zh-CN" | "zh-TW" | "en" | "yue" | "ja";

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

const translations: Record<Language, Record<string, string>> = {
  "zh-CN": zhCN,
  "zh-TW": zhTW,
  "en": en,
  "yue": yue,
  "ja": ja,
};

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>("zh-CN");

  const t = (key: string): string => {
    return translations[lang][key] || key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used within I18nProvider");
  return context;
}
