"use client";

// 这个文件是"国际化（多语言）"功能的中心。
// 它加载 9 种语言的翻译文字，并提供 I18nProvider（提供者）和 useI18n（钩子），
// 让整个应用能根据用户选择的语言显示对应文字。

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

/**
 * 支持的语言代码类型。每个值是一种语言的标识。
 */
export type Language = "zh-CN" | "zh-TW" | "en" | "ja" | "it" | "fr" | "he" | "pt" | "es";

/**
 * 所有支持语言的"权威清单"。
 * 每一项包含：语言代码 code、显示名称 label、文字方向 dir（ltr=从左到右，rtl=从右到左）。
 */
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

/**
 * i18n 上下文提供的功能集合。
 */
interface I18nContextType {
  /** 当前选中的语言代码。 */
  lang: Language;
  /** 切换语言的函数。 */
  setLang: (lang: Language) => void;
  /** 翻译函数：传一个文字 key，返回当前语言对应的文字。 */
  t: (key: string) => string;
  /** 当前语言的文字方向（ltr 或 rtl）。 */
  dir: "ltr" | "rtl";
}

// 创建一个 React 上下文，用来在整个应用里共享当前语言设置
const I18nContext = createContext<I18nContextType | null>(null);

// 所有语言的翻译文字字典：语言代码 → { 文字key: 翻译 }
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

/**
 * 国际化（多语言）的"提供者"组件。
 * 把它套在应用最外层，所有子组件就能用 useI18n() 拿到当前语言和翻译函数。
 *
 * @param children - 包在里面的子组件
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  // 当前语言，默认简体中文
  const [lang, setLang] = useState<Language>("zh-CN");

  // 根据当前语言查出文字方向（希伯来语等是从右到左）
  const dir = LANGUAGES.find((l) => l.code === lang)?.dir ?? "ltr";

  // 语言变化时，同步更新 <html> 标签的 dir 和 lang 属性，
  // 这样整个页面（包括下拉菜单位置）会针对 RTL 语言翻转。
  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [dir, lang]);

  /**
   * 翻译函数：传入一个文字 key，返回当前语言对应的文字。
   * 如果没找到对应翻译，就直接返回 key 本身。
   */
  const t = (key: string): string => {
    return translations[lang][key] || key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t, dir }}>
      {children}
    </I18nContext.Provider>
  );
}

/**
 * 在组件里获取当前语言设置的 hook。
 * 必须在 I18nProvider 包裹的组件内使用，否则会报错。
 * @returns 当前语言、切换函数、翻译函数 t、文字方向
 */
export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used within I18nProvider");
  return context;
}
