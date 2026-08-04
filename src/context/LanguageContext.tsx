import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, LANGUAGES, translations, LanguageInfo } from '../i18n/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations['SK']) => string;
  langInfo: LanguageInfo;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('family_budget_language');
    if (saved && (saved === 'SK' || saved === 'CZ' || saved === 'HU' || saved === 'EN')) {
      return saved as Language;
    }
    return 'SK';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('family_budget_language', lang);
  };

  const t = (key: keyof typeof translations['SK']): string => {
    const dict = translations[language] || translations['SK'];
    return dict[key] || translations['SK'][key] || key;
  };

  const langInfo = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, langInfo }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
