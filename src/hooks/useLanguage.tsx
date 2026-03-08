import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import en, { TranslationKeys } from "@/i18n/en";
import hi from "@/i18n/hi";

type Language = "en" | "hi";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKeys) => string;
}

const translations: Record<Language, Record<string, string>> = { en, hi };

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem("raksha-lang");
    return (saved === "hi" ? "hi" : "en") as Language;
  });

  useEffect(() => {
    localStorage.setItem("raksha-lang", language);
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((lang: Language) => setLang(lang), []);

  const t = useCallback(
    (key: TranslationKeys): string => {
      return translations[language]?.[key] || translations.en[key] || key;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};
