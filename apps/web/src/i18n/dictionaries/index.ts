import { type Locale } from '../locales'
import { type Dictionary, en } from './en'
import { ptBR } from './pt-br'

export type { Dictionary }

export const dictionaries: Record<Locale, Dictionary> = { en, 'pt-BR': ptBR }
