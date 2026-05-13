import React, { createContext, useContext, useState, useCallback } from 'react';
import { translations, TranslationKey, Language } from '../lib/translations';

interface LanguageContextValue {
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'fr',
  setLang: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const stored = localStorage.getItem('ef-lang');
    return stored === 'en' || stored === 'fr' ? stored : 'fr';
  });

  const setLang = useCallback((l: Language) => {
    localStorage.setItem('ef-lang', l);
    setLangState(l);
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => translations[lang][key] as string,
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
