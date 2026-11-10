import type { Hardest, Hunger, Meal, Sleep } from './types'

const TZ = 'America/Sao_Paulo'

export const mealLabel: Record<Meal, string> = {
  cafe: 'Café da manhã',
  lanche_manha: 'Lanche da manhã',
  almoco: 'Almoço',
  lanche_tarde: 'Lanche da tarde',
  jantar: 'Jantar',
  ceia: 'Ceia',
}

export const mealGreeting: Record<Meal, string> = {
  cafe: 'Hora do café.',
  lanche_manha: 'Hora do lanche.',
  almoco: 'Hora do almoço.',
  lanche_tarde: 'Hora do lanche.',
  jantar: 'Hora do jantar.',
  ceia: 'Hora da ceia.',
}

export const hungerLabel: Record<Hunger, string> = { pouca: 'Pouca', na_medida: 'Na medida', muita_a_noite: 'Muita à noite' }
export const sleepLabel: Record<Sleep, string> = { bem: 'Dormi bem', mais_ou_menos: 'Mais ou menos', mal: 'Mal' }
export const hardestLabel: Record<Hardest, string> = {
  cafe_da_manha: 'Café da manhã',
  almoco: 'Almoço',
  lanche_da_tarde: 'Lanche da tarde',
  jantar: 'Jantar',
  fim_de_semana: 'Fim de semana',
  agua: 'Água',
}

export const foodGroupLabel: Record<string, string> = {
  carboidrato: 'Carboidratos',
  proteina: 'Proteínas',
  leguminosa: 'Leguminosas',
  fruta: 'Frutas',
  laticinio: 'Laticínios',
  gordura: 'Gorduras',
  vegetal: 'Vegetais',
}

const num1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const num0 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

export const kg = (v: number | null | undefined) => (v == null ? '—' : `${num1.format(v)} kg`)
export const n = (v: number | null | undefined) => (v == null ? '—' : num0.format(v))
export const signed = (v: number | null | undefined, unit: string) =>
  v == null ? '—' : `${v > 0 ? '+' : v < 0 ? '−' : ''} ${num1.format(Math.abs(v))} ${unit}`.trim()

/** Datas "YYYY-MM-DD" (DateOnly) são locais; não passar por Date UTC. */
export function dateOnly(iso: string, opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' }) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', opts).format(new Date(y, m - 1, d))
}

export const dateTime = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, ...opts }).format(new Date(iso))

export const time = (iso: string) => dateTime(iso, { hour: '2-digit', minute: '2-digit' })

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')

export function todayIso() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
  return parts // YYYY-MM-DD
}

export function weekdayLabel() {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, weekday: 'long' }).format(new Date())
}

/** Converte "YYYY-MM-DDTHH:mm" (input datetime-local, horário de Brasília) em ISO com offset. */
export const localInputToIso = (v: string) => `${v}:00-03:00`

export function isoToLocalInput(iso: string) {
  const d = new Date(iso)
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d)
  const get = (t: string) => p.find((x) => x.type === t)?.value
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}
