/* Lightweight i18n: no external dependency, auto-detects device language,
 * falls back to English. Add a language by adding a dictionary file. */
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { loadLang, saveLang } from '../state/uiPreferences';
import { Ctx, detectLang, dicts, type I18nCtx, type Lang } from './useT';

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => loadLang() ?? detectLang());
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    saveLang(l);
  }, []);
  const value = useMemo<I18nCtx>(
    () => ({
      lang,
      setLang,
      t: (key, vars) => {
        let s: string = dicts[lang][key] ?? dicts.en[key] ?? String(key);
        if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
        return s;
      },
    }),
    [lang, setLang],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
