"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type Language = "zh-CN" | "zh-TW" | "en" | "yue" | "ja";

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

const translations: Record<Language, Record<string, string>> = {
  "zh-CN": require("./zh-CN.json"),
  "zh-TW": require("./zh-TW.json"),
  "en": require("./en.json"),
  "yue": require("./yue.json"),
  "ja": require("./ja.json"),
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