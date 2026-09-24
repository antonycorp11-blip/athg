// Tradução pura (sem React) — usada pelo provider e pelo gerador de SEO no build.
import { ptBR } from '../locales/pt-BR.ts'
import { en } from '../locales/en.ts'
import { es } from '../locales/es.ts'
import type { Locale, PartialDictionary, TranslationKey, TranslationVars } from '../locales/types.ts'

const dictionaries: Record<Locale, PartialDictionary> = { 'pt-BR': ptBR, en, es }

function lookup(dict: unknown, key: string): string | undefined {
  let node: unknown = dict
  for (const part of key.split('.')) {
    if (node && typeof node === 'object' && part in node) node = (node as Record<string, unknown>)[part]
    else return undefined
  }
  return typeof node === 'string' ? node : undefined
}

export function interpolate(template: string, vars?: TranslationVars) {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, name: string) => (name in vars ? String(vars[name]) : `{${name}}`))
}

export function translate(locale: Locale, key: TranslationKey, vars?: TranslationVars) {
  const value = lookup(dictionaries[locale], key) ?? lookup(ptBR, key) ?? key
  return interpolate(value, vars)
}

export type Translator = (key: TranslationKey, vars?: TranslationVars) => string
