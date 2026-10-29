"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { translator, type Locale } from "@/lib/i18n";
import { readPreference, writePreference } from "@/lib/preferences";

const LanguageContext = createContext({
  locale: "en" as Locale,
  t: translator("en"),
  setLocale: (_locale: Locale) => {},
});
export function LanguageProvider({
  children,
  initialLocale = "en",
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, updateLocale] = useState<Locale>(initialLocale);
  useEffect(() => {
    const saved = readPreference("language");
    if (saved === "en" || saved === "es") updateLocale(saved);
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  function setLocale(value: Locale) {
    updateLocale(value);
    try {
      writePreference("language", value);
    } catch {}
  }
  return (
    <LanguageContext.Provider
      value={{ locale, t: translator(locale), setLocale }}
    >
      {children}
    </LanguageContext.Provider>
  );
}
export function useLanguage() {
  return useContext(LanguageContext);
}
