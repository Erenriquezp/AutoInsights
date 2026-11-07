import { createContext, useContext } from 'react';
import type { Formatters, Lang } from '../lib/format';
import type { Messages } from './en';

export interface I18n {
  lang: Lang;
  t: Messages;
  f: Formatters;
  setLang: (lang: Lang) => void;
  fill: (template: string, values: Record<string, string | number>) => string;
}

export const I18nContext = createContext<I18n | null>(null);

export function useI18n(): I18n {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside <I18nProvider>');
  return value;
}

/** Replace {name} placeholders. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
