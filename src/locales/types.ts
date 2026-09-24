import type { ptBR } from './pt-BR.ts'

export const LOCALES = ['pt-BR', 'en', 'es'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'pt-BR'

type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> }
type DeepPartial<T> = { [K in keyof T]?: T[K] extends string ? string : DeepPartial<T[K]> }

export type Dictionary = Widen<typeof ptBR>
/** Traduções podem ser parciais: chaves ausentes caem para pt-BR. */
export type PartialDictionary = DeepPartial<Dictionary>

type Join<K, P> = K extends string ? (P extends string ? `${K}.${P}` : never) : never
type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : Join<K, Paths<T[K]>>
}[keyof T & string]

/** Toda chave válida, ex: "nav.home" | "pass.benefits.noAds" */
export type TranslationKey = Paths<Dictionary>
export type TranslationVars = Record<string, string | number>
