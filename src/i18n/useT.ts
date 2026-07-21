import { createContext, useContext } from 'react';
import { en } from './en';
import { es } from './es';
import { ca } from './ca';

export type Lang = 'en' | 'es' | 'ca';
export type Dict = typeof en;
/** The translator returned by useT(); shared so helpers outside components can accept it. */
export type TFunc = (key: keyof Dict, vars?: Record<string, string | number>) => string;

export const dicts: Record<Lang, Dict> = { en, es, ca };

export function detectLang(): Lang {
  const nav = typeof navigator !== 'undefined' ? navigator.language : 'en';
  const lower = nav.toLowerCase();
  if (lower.startsWith('ca')) return 'ca';
  if (lower.startsWith('es')) return 'es';
  return 'en';
}

export interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: TFunc;
}

export const Ctx = createContext<I18nCtx | null>(null);

export function useT() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useT must be used inside I18nProvider');
  return ctx;
}
