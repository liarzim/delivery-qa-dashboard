import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import en from '../i18n/en';
import he from '../i18n/he';
import { useSettings } from './SettingsContext';

const LanguageContext = createContext(null);
const TRANSLATIONS = { en, he };

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'en');
  const { settings, updateSettings } = useSettings();

  useEffect(() => {
    localStorage.setItem('lang', lang);
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  // Parsed title overrides from settings — reactive to admin saves
  const titleOverrides = useMemo(() => {
    try { return JSON.parse(settings?.title_overrides || '{}'); }
    catch { return {}; }
  }, [settings?.title_overrides]);

  // t() checks admin overrides first, then static translations, then falls back to key
  const t = (key, vars) => {
    const override = titleOverrides[key]?.[lang];
    let str = override !== undefined && override !== ''
      ? override
      : (TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.en[key] ?? key);
    if (vars) Object.entries(vars).forEach(([k, v]) => { str = str.replace(`{{${k}}}`, v); });
    return str;
  };

  // Admin helpers — write directly into the settings JSON blob
  const setTitleOverride = (key, enVal, heVal) => {
    const next = { ...titleOverrides };
    if (enVal === '' && heVal === '') {
      delete next[key];
    } else {
      next[key] = { en: enVal, he: heVal };
    }
    updateSettings({ title_overrides: JSON.stringify(next) });
  };

  const removeTitleOverride = (key) => {
    const next = { ...titleOverrides };
    delete next[key];
    updateSettings({ title_overrides: JSON.stringify(next) });
  };

  const toggleLang = () => setLang(l => l === 'en' ? 'he' : 'en');
  const isRTL = lang === 'he';

  return (
    <LanguageContext.Provider value={{
      lang, setLang, toggleLang, t, isRTL,
      titleOverrides, setTitleOverride, removeTitleOverride,
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
