import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { formatters, type Lang } from '../lib/format';
import en from './en';
import es from './es';
import { fill, I18nContext, type I18n } from './context';

const STORAGE_KEY = 'autoinsights.lang';
const MESSAGES = { en, es };

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'es') return saved;
  } catch {
    // storage blocked: fall back to the browser language
  }
  return navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // not persisted; still works for this visit
    }
  }, [lang]);

  const value = useMemo<I18n>(
    () => ({ lang, t: MESSAGES[lang], f: formatters(lang), setLang: setLangState, fill }),
    [lang],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
