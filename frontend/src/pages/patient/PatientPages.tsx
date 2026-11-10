import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { ChevronRight, ClipboardCheck, Minus, Plus, Search, UtensilsCrossed } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { NoteCard, ProgressSummary } from '../../components/ProgressWidgets'
import { useToast } from '../../components/Toast'
import {
  Button, Card, Choice, Empty, ErrorBox, Field, IconButton, Input, ProgressBar, Skeleton, Spinner, Textarea,
} from '../../components/ui'
import { api } from '../../lib/api'
import {
  dateTime, foodGroupLabel, hardestLabel, hungerLabel, mealGreeting, mealLabel, n, sleepLabel, weekdayLabel,
} from '../../lib/format'
import type {
  CheckIn, Food, Hardest, Hunger, MealPlan, Note, PatientToday, Progress, Sleep, Substitution,
} from '../../lib/types'

type DailyLogDto = { waterMl: number; proteinG: number }

// ================================================================ Hoje

export function PatientHome() {
  const qc = useQueryClient()
  const toast = useToast()
  const today = useQuery({ queryKey: ['me', 'today'], queryFn: () => api.get<PatientToday>('/me/today') })

  const log = useMutation({
    mutationFn: (delta: { waterDeltaMl: number; proteinDeltaG: number }) => api.post<DailyLogDto>('/me/daily-log', delta),
    onMutate: async (delta) => {
      await qc.cancelQueries({ queryKey: ['me', 'today'] })
      const prev = qc.getQueryData<PatientToday>(['me', 'today'])
      if (prev) qc.setQueryData<PatientToday>(['me', 'today'], {
        ...prev,
        waterMl: Math.max(0, prev.waterMl + delta.waterDeltaMl),
        proteinG: Math.max(0, prev.proteinG + delta.proteinDeltaG),
      })
      return { prev }
    },
    onError: (e, _d, ctx) => {
      if (ctx?.prev) qc.setQueryData(['me', 'today'], ctx.prev)
      toast(e.message, 'error')
    },
    onSuccess: (r) => qc.setQueryData<PatientToday>(['me', 'today'], (p) => p && { ...p, waterMl: r.waterMl, proteinG: r.proteinG }),
  })

  if (today.isPending) return <HomeSkeleton />
  if (today.error) return <ErrorBox error={today.error} />
  const t = today.data

  const cups = Math.min(12, Math.max(4, Math.round(t.waterTargetMl / 250)))
  const filled = Math.min(cups, Math.floor(t.waterMl / 250))
  const setCups = (k: number) => log.mutate({ waterDeltaMl: k * 250 - t.waterMl, proteinDeltaG: 0 })

  return (
    <div className="flex flex-col gap-4">
      <div className="pt-2">
        <p className="eyebrow">
          {weekdayLabel()}{t.weekNumber ? ` · semana ${t.weekNumber}` : ''}
        </p>
        <h1 className="mt-2 text-[2.1rem] leading-tight font-normal text-brown">
          Oi, {t.firstName}.
          {t.currentMeal && <><br /><em className="text-brown-soft">{mealGreeting[t.currentMeal.meal]}</em></>}
        </h1>
      </div>

      {t.currentMeal ? (
        <Link to="/plano" className="group rounded-[var(--radius-card)] bg-olive p-5 text-white transition-colors hover:bg-olive-deep">
          <div className="flex items-center justify-between">
            <p className="font-medium">{mealLabel[t.currentMeal.meal]} do plano</p>
            <ChevronRight className="size-5 opacity-70 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </div>
          <p className="mt-1 text-white/90">{t.currentMeal.description}</p>
          {t.currentMeal.tip && <p className="mt-2 inline-block rounded-md bg-highlight/90 px-2 text-sm text-ink">{t.currentMeal.tip}</p>}
        </Link>
      ) : (
        <Card>
          <Empty icon={<UtensilsCrossed className="size-8" />} title="Seu plano está a caminho">
            Assim que a Malu enviar seu plano alimentar, ele aparece aqui.
          </Empty>
        </Card>
      )}

      <section className="rounded-[var(--radius-card)] bg-sand/80 p-5" aria-labelledby="protein">
        <div className="flex items-baseline justify-between">
          <h2 id="protein" className="font-sans text-base font-medium text-ink">Proteína do dia</h2>
          <p className="text-sm text-muted">{n(t.proteinG)} / {n(t.proteinTargetG)} g</p>
        </div>
        <div className="mt-3"><ProgressBar value={t.proteinG} max={t.proteinTargetG} label="Proteína consumida" /></div>
        <div className="mt-3 flex items-center gap-2">
          <IconButton label="Remover 10 g de proteína" onClick={() => log.mutate({ waterDeltaMl: 0, proteinDeltaG: -10 })}
                      className="border border-line bg-surface">
            <Minus className="size-4" />
          </IconButton>
          {[10, 25].map((g) => (
            <button key={g} onClick={() => log.mutate({ waterDeltaMl: 0, proteinDeltaG: g })}
                    className="min-h-11 cursor-pointer rounded-full border border-line bg-surface px-4 text-sm hover:border-olive/50">
              + {g} g
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-[var(--radius-card)] bg-sand/80 p-5" aria-labelledby="water">
        <div className="flex items-baseline justify-between">
          <h2 id="water" className="font-sans text-base font-medium text-ink">Água</h2>
          <p className="text-sm text-muted">{n(t.waterMl / 1000)} / {n(t.waterTargetMl / 1000)} L</p>
        </div>
        <div className="mt-3 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cups}, minmax(0, 1fr))` }}>
          {Array.from({ length: cups }, (_, i) => (
            <button
              key={i}
              aria-label={`${(i + 1) * 250} ml`}
              aria-pressed={i < filled}
              onClick={() => setCups(i + 1 === filled ? i : i + 1)}
              className={clsx('h-10 cursor-pointer rounded-md transition-colors duration-200',
                i < filled ? 'bg-sage hover:bg-olive/60' : 'bg-line/80 hover:bg-sage-soft')}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">Cada quadradinho é um copo de 250 ml. Toque para marcar.</p>
      </section>

      {!t.checkInDone && (
        <Link to="/check-in" className="card flex items-center gap-4 p-5 hover:border-terracotta/40">
          <span className="inline-flex size-11 items-center justify-center rounded-full bg-terracotta-soft text-terracotta">
            <ClipboardCheck className="size-5" aria-hidden />
          </span>
          <span className="flex-1">
            <span className="block font-medium">Check-in da semana</span>
            <span className="block text-sm text-muted">Leva um minuto.</span>
          </span>
          <ChevronRight className="size-5 text-muted" aria-hidden />
        </Link>
      )}

      {t.unreadNotes > 0 && (
        <Link to="/evolucao" className="card flex items-center justify-between p-5 hover:border-olive/40">
          <span><span className="font-medium">Você tem {t.unreadNotes} recado{t.unreadNotes > 1 ? 's' : ''} novo{t.unreadNotes > 1 ? 's' : ''}</span></span>
          <ChevronRight className="size-5 text-muted" aria-hidden />
        </Link>
      )}
    </div>
  )
}

function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-4 pt-2" aria-busy>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-20 w-64" />
      <Skeleton className="h-28" />
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
    </div>
  )
}

// ================================================================ Plano

export function PatientPlan() {
  const plan = useQuery({ queryKey: ['me', 'plan'], queryFn: () => api.get<MealPlan | undefined>('/me/meal-plan') })
  if (plan.isPending) return <Spinner />
  if (plan.error) return <ErrorBox error={plan.error} />
  if (!plan.data) {
    return <Empty icon={<UtensilsCrossed className="size-8" />} title="Seu plano está a caminho">Assim que for enviado, ele aparece aqui.</Empty>
  }
  const p = plan.data
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="eyebrow">Meu plano</p>
        <h1 className="mt-1 text-3xl">{p.title}</h1>
        {p.publishedAt && <p className="text-sm text-muted">Enviado em {dateTime(p.publishedAt, { day: '2-digit', month: 'long' })}</p>}
      </div>
      <ol className="card divide-y divide-line">
        {p.items.map((it) => (
          <li key={it.id} className="grid grid-cols-[5.5rem_1fr] gap-3 p-4">
            <div>
              <p className="eyebrow !text-[0.65rem]">{mealLabel[it.meal]}</p>
              <p className="font-display text-lg text-olive-deep">{it.mealTime}</p>
            </div>
            <div>
              <p>{it.description}</p>
              {it.tip && <p className="mt-1 inline-block rounded bg-highlight/80 px-1.5 text-sm">{it.tip}</p>}
              {it.foods.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {it.foods.map((f) => (
                    <li key={f.foodId}>
                      <Link to={`/trocas?food=${f.foodId}&g=${f.grams}`}
                            className="inline-flex min-h-8 items-center gap-1 rounded-full bg-olive-soft px-3 text-xs text-olive-deep hover:bg-sage-soft">
                        {f.foodName} · {n(f.grams)} g <span aria-hidden>⇄</span>
                        <span className="sr-only">ver trocas</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ol>
      {p.notes && <Card><p className="eyebrow mb-1">Orientações</p><p className="whitespace-pre-line text-sm">{p.notes}</p></Card>}
    </div>
  )
}

// ================================================================ Balança de substituições

export function SwapScale() {
  const [params] = useSearchParams()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [food, setFood] = useState<Food | null>(null)
  const [grams, setGrams] = useState(Number(params.get('g')) || 100)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query), 250)
    return () => clearTimeout(id)
  }, [query])

  const foods = useQuery({
    queryKey: ['foods', debounced],
    queryFn: () => api.get<Food[]>(`/foods?q=${encodeURIComponent(debounced)}`),
    staleTime: 5 * 60_000,
  })

  // pré-seleciona alimento vindo do plano (?food=)
  const preselect = params.get('food')
  useEffect(() => {
    if (!food && preselect && foods.data) setFood(foods.data.find((f) => f.id === preselect) ?? null)
  }, [food, preselect, foods.data])
  useEffect(() => {
    if (!food && !preselect && foods.data?.length) setFood(foods.data.find((f) => f.name.startsWith('Arroz branco')) ?? foods.data[0])
  }, [food, preselect, foods.data])

  const subs = useQuery({
    queryKey: ['subs', food?.id, grams],
    queryFn: () => api.get<Substitution[]>(`/foods/${food!.id}/substitutions?grams=${grams}`),
    enabled: !!food && grams > 0,
    placeholderData: (prev) => prev,
  })

  const step = (d: number) => setGrams((g) => Math.min(1000, Math.max(5, g + d)))

  const grouped = useMemo(() => {
    const m = new Map<string, Food[]>()
    for (const f of foods.data ?? []) m.set(f.foodGroup, [...(m.get(f.foodGroup) ?? []), f])
    return [...m.entries()]
  }, [foods.data])

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="eyebrow">Balança das substituições</p>
        <h1 className="mt-1 text-3xl">Posso trocar por…</h1>
      </div>

      <section className="card overflow-hidden">
        <div className="bg-olive p-5 text-white">
          <p className="eyebrow !text-highlight/90">No meu plano</p>
          <label className="sr-only" htmlFor="food">Alimento</label>
          <select
            id="food"
            value={food?.id ?? ''}
            onChange={(e) => setFood(foods.data?.find((f) => f.id === e.target.value) ?? null)}
            className="mt-1 w-full cursor-pointer border-b border-white/40 bg-transparent pb-2 text-lg text-white focus:outline-none [&>optgroup]:text-ink [&>option]:text-ink"
          >
            {grouped.map(([group, list]) => (
              <optgroup key={group} label={foodGroupLabel[group] ?? group}>
                {list.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </optgroup>
            ))}
          </select>
          <div className="mt-4 flex items-center justify-between">
            <IconButton label="Diminuir 5 gramas" onClick={() => step(-5)} className="border border-white/50 text-white hover:bg-white/10">
              <Minus className="size-5" />
            </IconButton>
            <label className="flex items-baseline gap-1">
              <span className="sr-only">Quantidade em gramas</span>
              <input
                type="number" inputMode="numeric" min={5} max={1000} value={grams}
                onChange={(e) => setGrams(Math.max(0, Number(e.target.value)))}
                className="w-28 bg-transparent text-center font-display text-5xl font-light text-white focus:outline-none"
              />
              <span className="text-lg">g</span>
            </label>
            <IconButton label="Aumentar 5 gramas" onClick={() => step(5)} className="border border-white/50 text-white hover:bg-white/10">
              <Plus className="size-5" />
            </IconButton>
          </div>
        </div>

        <div className="p-5">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input aria-label="Buscar alimento" placeholder="Buscar outro alimento…" value={query}
                   onChange={(e) => setQuery(e.target.value)} className="pl-9" />
          </div>
          <p className="eyebrow mb-2">Posso trocar por</p>
          {subs.isPending && food ? <Spinner label="Calculando" /> : subs.error ? <ErrorBox error={subs.error} /> : (
            <ul className={clsx('divide-y divide-line transition-opacity', subs.isFetching && 'opacity-60')}>
              {subs.data?.length === 0 && <li className="py-4 text-sm text-muted">Sem equivalências cadastradas neste grupo.</li>}
              {subs.data?.map((s) => (
                <li key={s.foodId} className="flex items-center justify-between gap-3 py-3">
                  <span>{s.name}</span>
                  <span className="text-right whitespace-nowrap">
                    <span className="font-medium">{n(s.grams)} g</span>
                    {s.household && <span className="ml-1 text-xs text-muted">{s.household}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-muted">
            Equivalências calculadas pelo nutriente principal do grupo (ex.: carboidrato). Na dúvida, fale com a Malu.
          </p>
        </div>
      </section>
    </div>
  )
}

// ================================================================ Check-in semanal

export function CheckInPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const history = useQuery({ queryKey: ['me', 'check-ins'], queryFn: () => api.get<CheckIn[]>('/me/check-ins') })
  const [adherence, setAdherence] = useState<number | null>(null)
  const [hunger, setHunger] = useState<Hunger | null>(null)
  const [sleep, setSleep] = useState<Sleep | null>(null)
  const [hardest, setHardest] = useState<Hardest[]>([])
  const [weight, setWeight] = useState('')
  const [waist, setWaist] = useState('')
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = useMutation({
    mutationFn: () => api.post<CheckIn>('/me/check-ins', {
      adherence, hunger, sleep, hardest,
      weightKg: weight ? Number(weight.replace(',', '.')) : null,
      waistCm: waist ? Number(waist.replace(',', '.')) : null,
      comment: comment || null,
    }),
    onSuccess: () => {
      toast('Check-in enviado pra Malu!')
      qc.invalidateQueries({ queryKey: ['me'] })
    },
    onError: (e) => setError(e.message),
  })

  const thisWeek = history.data?.[0]
  const done = thisWeek && isCurrentWeek(thisWeek.weekStart)

  function send() {
    setError(null)
    if (!adherence || !hunger || !sleep) return setError('Responda adesão, fome e sono para enviar.')
    submit.mutate()
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="eyebrow">Toda semana, um minuto</p>
        <h1 className="mt-1 text-3xl">Check-in</h1>
        {done && <p className="mt-1 text-sm text-olive-deep">Você já enviou o desta semana — pode atualizar se quiser.</p>}
      </div>
      <Card className="flex flex-col gap-6">
        <fieldset>
          <legend className="mb-2 font-medium">Quanto do plano você seguiu?</legend>
          <Choice label="Adesão de 1 a 5" tone="olive" value={adherence}
                  onChange={setAdherence} options={[1, 2, 3, 4, 5].map((v) => ({ value: v, label: String(v) }))} />
          <p className="mt-1 text-xs text-muted">1 = quase nada · 5 = tudo</p>
        </fieldset>
        <fieldset>
          <legend className="mb-2 font-medium">Fome ao longo do dia</legend>
          <Choice label="Fome" value={hunger} onChange={setHunger}
                  options={(Object.keys(hungerLabel) as Hunger[]).map((v) => ({ value: v, label: hungerLabel[v] }))} />
        </fieldset>
        <fieldset>
          <legend className="mb-2 font-medium">Sono</legend>
          <Choice label="Sono" value={sleep} onChange={setSleep}
                  options={(Object.keys(sleepLabel) as Sleep[]).map((v) => ({ value: v, label: sleepLabel[v] }))} />
        </fieldset>
        <fieldset>
          <legend className="mb-2 font-medium">O que foi mais difícil? <span className="font-normal text-muted">(opcional)</span></legend>
          <Choice label="O que foi mais difícil" multiple value={hardest}
                  onChange={(v) => setHardest((xs) => (xs.includes(v) ? xs.filter((x) => x !== v) : [...xs, v]))}
                  options={(Object.keys(hardestLabel) as Hardest[]).map((v) => ({ value: v, label: hardestLabel[v] }))} />
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Peso de hoje" hint="Opcional, em kg">
            {(id) => <Input id={id} inputMode="decimal" placeholder="69,4" value={weight} onChange={(e) => setWeight(e.target.value)} />}
          </Field>
          <Field label="Cintura" hint="Opcional, em cm">
            {(id) => <Input id={id} inputMode="decimal" placeholder="82" value={waist} onChange={(e) => setWaist(e.target.value)} />}
          </Field>
        </div>
        <Field label="Quer contar algo?">
          {(id) => <Textarea id={id} rows={3} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} />}
        </Field>
        <ErrorBox error={error} />
        <Button onClick={send} loading={submit.isPending} className="w-full uppercase tracking-[0.15em]">
          Enviar pra Malu
        </Button>
      </Card>
    </div>
  )
}

function isCurrentWeek(weekStart: string) {
  const now = new Date()
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7))
  const [y, m, d] = weekStart.split('-').map(Number)
  return new Date(y, m - 1, d).getTime() === monday.getTime()
}

// ================================================================ Evolução + recados

export function PatientProgress() {
  const progress = useQuery({ queryKey: ['me', 'progress'], queryFn: () => api.get<Progress>('/me/progress') })
  const notes = useQuery({ queryKey: ['me', 'notes'], queryFn: () => api.get<Note[]>('/me/notes') })

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="eyebrow">Sua evolução</p>
        <h1 className="mt-1 text-3xl">Olha o caminho até aqui</h1>
      </div>
      {progress.isPending ? <Spinner /> : progress.error ? <ErrorBox error={progress.error} /> : (
        progress.data.checkInCount === 0
          ? <Card><Empty title="Ainda sem check-ins">Faça seu primeiro check-in para acompanhar a evolução.</Empty></Card>
          : <ProgressSummary progress={progress.data} compact />
      )}

      <h2 className="mt-2 text-2xl">Recados</h2>
      {notes.isPending ? <Spinner /> : notes.data?.length === 0 ? (
        <p className="text-sm text-muted">Os recados da Malu vão aparecer aqui.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {notes.data?.map((note) => (
            <div key={note.id}>
              <NoteCard author="Malu" body={note.body} />
              <p className="mt-1 px-1 text-xs text-muted">{dateTime(note.createdAt, { day: '2-digit', month: 'long' })}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
