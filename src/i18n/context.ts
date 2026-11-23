import { createContext, useContext } from 'react';
import type { Language } from '../types/streak';
import { translate, type TKey } from './translations';

export interface I18nValue {
  lang: Language;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
}

const fallbackLang: Language = 'en';

export const I18nContext = createContext<I18nValue>({
  lang: fallbackLang,
  t: (key, vars) => translate(fallbackLang, key, vars),
});

export function useT(): I18nValue {
  return useContext(I18nContext);
}
