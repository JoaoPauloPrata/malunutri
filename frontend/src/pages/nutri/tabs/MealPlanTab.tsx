import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { Copy, Plus, Send, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '../../../components/Toast'
import { Badge, Button, Card, Empty, ErrorBox, Field, IconButton, Input, Select, Spinner, Textarea } from '../../../components/ui'
import { api } from '../../../lib/api'
import { dateTime, foodGroupLabel, mealLabel } from '../../../lib/format'
import type { Food, Meal, MealPlan, MealPlanInput, MealPlanSummary } from '../../../lib/types'

type ItemDraft = MealPlanInput['items'][number] & { key: string }

const defaultItems = (): ItemDraft[] => [
  { key: crypto.randomUUID(), meal: 'cafe', mealTime: '07:00', description: '', tip: null, proteinG: null, foods: [] },
  { key: crypto.randomUUID(), meal: 'almoco', mealTime: '12:30', description: '', tip: null, proteinG: null, foods: [] },
  { key: crypto.randomUUID(), meal: 'lanche_tarde', mealTime: '16:00', description: '', tip: null, proteinG: null, foods: [] },
  { key: crypto.randomUUID(), meal: 'jantar', mealTime: '20:00', description: '', tip: null, proteinG: null, foods: [] },
]

const toDraft = (p: MealPlan): ItemDraft[] =>
  p.items.map((i) => ({
    key: i.id, meal: i.meal, mealTime: i.mealTime, description: i.description, tip: i.tip, proteinG: i.proteinG,
    foods: i.foods.map((f) => ({ foodId: f.foodId, grams: f.grams })),
  }))

const statusTone = { ativo: 'olive', rascunho: 'neutral', arquivado: 'neutral' } as const

export function MealPlanTab({ patientId }: { patientId: string }) {
  const plans = useQuery({ queryKey: ['meal-plans', patientId], queryFn: () => api.get<MealPlanSummary[]>(`/patients/${patientId}/meal-plans`) })
  const [selected, setSelected] = useState<string | 'new' | null>(null)
  const [copy, setCopy] = useState<MealPlan | undefined>()
  const current = selected ?? plans.data?.find((p) => p.status === 'ativo')?.id ?? plans.data?.[0]?.id ?? 'new'

  const plan = useQuery({
    queryKey: ['meal-plan', current],
    queryFn: () => api.get<MealPlan>(`/meal-plans/${current}`),
    enabled: current !== 'new',
  })

  if (plans.isPending) return <Spinner />
  return (
    <div className="grid gap-4 lg:grid-cols-[15rem_1fr]">
      <div className="flex flex-col gap-3">
        <Button variant="olive" icon={<Plus className="size-4" />} onClick={() => { setCopy(undefined); setSelected('new') }}>Novo plano</Button>
        <ul className="card divide-y divide-line overflow-hidden">
          {plans.data?.length === 0 && <li className="p-4 text-sm text-muted">Nenhum plano ainda.</li>}
          {plans.data?.map((p) => (
            <li key={p.id}>
              <button onClick={() => setSelected(p.id)}
                      className={clsx('flex min-h-14 w-full cursor-pointer flex-col items-start gap-1 px-4 py-3 text-left',
                        p.id === current ? 'bg-olive-soft' : 'hover:bg-sand/60')}>
                <span className="text-sm font-medium">{p.title}</span>
                <span className="flex items-center gap-2 text-xs text-muted">
                  <Badge tone={statusTone[p.status]}>{p.status}</Badge>
                  {dateTime(p.publishedAt ?? p.createdAt, { day: '2-digit', month: 'short' })}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {current === 'new' ? (
        <PlanEditor key={`new-${copy?.id ?? ''}`} patientId={patientId} onSaved={setSelected} copyFrom={copy} />
      ) : plan.isPending ? <Spinner /> : plan.error ? <ErrorBox error={plan.error} /> : (
        <PlanEditor key={plan.data.id} patientId={patientId} plan={plan.data} onSaved={setSelected}
                    onDuplicate={() => { setCopy(plan.data); setSelected('new') }} />
      )}
    </div>
  )
}

function PlanEditor({
  patientId, plan, copyFrom, onSaved, onDuplicate,
}: { patientId: string; plan?: MealPlan; copyFrom?: MealPlan; onSaved: (id: string) => void; onDuplicate?: () => void }) {
  const qc = useQueryClient()
  const toast = useToast()
  const base = plan ?? copyFrom
  const [title, setTitle] = useState(plan?.title ?? (copyFrom ? `${copyFrom.title} (cópia)` : 'Plano alimentar'))
  const [notes, setNotes] = useState(base?.notes ?? '')
  const [items, setItems] = useState<ItemDraft[]>(base ? toDraft(base).map((i) => ({ ...i, key: crypto.randomUUID() })) : defaultItems())
  const readOnly = plan?.status === 'arquivado'

  const foods = useQuery({ queryKey: ['foods', ''], queryFn: () => api.get<Food[]>('/foods'), staleTime: 10 * 60_000 })

  const payload = (): MealPlanInput => ({
    title, notes: notes.trim() || null,
    items: items.filter((i) => i.description.trim()).map(({ key: _k, ...i }) => i),
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['meal-plans', patientId] })
    qc.invalidateQueries({ queryKey: ['meal-plan'] })
    qc.invalidateQueries({ queryKey: ['today'] })
    qc.invalidateQueries({ queryKey: ['patients'] })
  }

  const save = useMutation({
    mutationFn: () => plan
      ? api.put<MealPlan>(`/meal-plans/${plan.id}`, payload())
      : api.post<MealPlan>(`/patients/${patientId}/meal-plans`, payload()),
    onSuccess: (p) => { invalidate(); onSaved(p.id); toast('Plano salvo.') },
  })

  const publish = useMutation({
    mutationFn: async () => {
      const saved = plan ? await api.put<MealPlan>(`/meal-plans/${plan.id}`, payload()) : await api.post<MealPlan>(`/patients/${patientId}/meal-plans`, payload())
      return api.post<MealPlan>(`/meal-plans/${saved.id}/publish`)
    },
    onSuccess: (p) => { invalidate(); onSaved(p.id); toast('Plano enviado pro app!') },
  })

  const del = useMutation({
    mutationFn: () => api.del(`/meal-plans/${plan!.id}`),
    onSuccess: () => { invalidate(); onSaved('new') },
  })

  const update = (key: string, patch: Partial<ItemDraft>) => setItems((xs) => xs.map((x) => (x.key === key ? { ...x, ...patch } : x)))

  const grouped = new Map<string, Food[]>()
  for (const f of foods.data ?? []) grouped.set(f.foodGroup, [...(grouped.get(f.foodGroup) ?? []), f])

  return (
    <Card className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Field label="Título do plano" className="min-w-60 flex-1">
          {(id) => <Input id={id} value={title} disabled={readOnly} onChange={(e) => setTitle(e.target.value)} />}
        </Field>
        {plan && <Badge tone={statusTone[plan.status]}>{plan.status}</Badge>}
      </div>

      {items.length === 0 && <Empty title="Sem refeições">Adicione a primeira refeição do plano.</Empty>}
      <ol className="flex flex-col gap-3">
        {[...items].sort((a, b) => a.mealTime.localeCompare(b.mealTime)).map((it) => (
          <li key={it.key} className="rounded-2xl border border-line bg-paper/60 p-4">
            <div className="grid gap-3 sm:grid-cols-[11rem_7rem_1fr_auto]">
              <Select aria-label="Refeição" value={it.meal} disabled={readOnly}
                      onChange={(e) => update(it.key, { meal: e.target.value as Meal })}>
                {(Object.keys(mealLabel) as Meal[]).map((m) => <option key={m} value={m}>{mealLabel[m]}</option>)}
              </Select>
              <Input aria-label="Horário" type="time" value={it.mealTime} disabled={readOnly}
                     onChange={(e) => update(it.key, { mealTime: e.target.value })} />
              <Input aria-label="Proteína estimada (g)" placeholder="Proteína (g)" inputMode="numeric" disabled={readOnly}
                     value={it.proteinG ?? ''} onChange={(e) => update(it.key, { proteinG: e.target.value ? Number(e.target.value) : null })} />
              {!readOnly && (
                <IconButton label="Remover refeição" onClick={() => setItems((xs) => xs.filter((x) => x.key !== it.key))}>
                  <Trash2 className="size-4" />
                </IconButton>
              )}
            </div>
            <Textarea aria-label="Descrição da refeição" rows={2} className="mt-3" disabled={readOnly}
                      placeholder="Ex.: Arroz, feijão, frango grelhado e salada à vontade. Fruta de sobremesa."
                      value={it.description} onChange={(e) => update(it.key, { description: e.target.value })} />
            <Input aria-label="Dica em destaque" className="mt-2 bg-highlight/20" disabled={readOnly}
                   placeholder="Dica em destaque (opcional) — ex.: Dá pra tomar no caminho"
                   value={it.tip ?? ''} onChange={(e) => update(it.key, { tip: e.target.value || null })} />

            <div className="mt-3">
              <p className="eyebrow mb-2 !text-[0.65rem]">Alimentos-base (liberam a balança de trocas no app)</p>
              <ul className="flex flex-wrap gap-2">
                {it.foods.map((f, idx) => (
                  <li key={idx} className="flex items-center gap-1 rounded-full bg-olive-soft py-1 pr-1 pl-3 text-sm text-olive-deep">
                    {foods.data?.find((x) => x.id === f.foodId)?.name ?? '…'}
                    <input aria-label="Gramas" type="number" min={1} value={f.grams} disabled={readOnly}
                           onChange={(e) => update(it.key, { foods: it.foods.map((x, j) => (j === idx ? { ...x, grams: Number(e.target.value) } : x)) })}
                           className="w-16 rounded-full bg-surface px-2 py-1 text-right" />
                    g
                    {!readOnly && (
                      <button aria-label="Remover alimento" onClick={() => update(it.key, { foods: it.foods.filter((_, j) => j !== idx) })}
                              className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full hover:bg-sage-soft">
                        <X className="size-3.5" />
                      </button>
                    )}
                  </li>
                ))}
                {!readOnly && (
                  <li>
                    <Select aria-label="Adicionar alimento" value="" className="min-h-9 w-auto rounded-full py-1 text-sm"
                            onChange={(e) => e.target.value && update(it.key, { foods: [...it.foods, { foodId: e.target.value, grams: 100 }] })}>
                      <option value="">+ alimento</option>
                      {[...grouped.entries()].map(([g, list]) => (
                        <optgroup key={g} label={foodGroupLabel[g] ?? g}>
                          {list.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </optgroup>
                      ))}
                    </Select>
                  </li>
                )}
              </ul>
            </div>
          </li>
        ))}
      </ol>

      {!readOnly && (
        <Button variant="outline" icon={<Plus className="size-4" />} className="self-start"
                onClick={() => setItems((xs) => [...xs, { key: crypto.randomUUID(), meal: 'lanche_manha', mealTime: '10:00', description: '', tip: null, proteinG: null, foods: [] }])}>
          Adicionar refeição
        </Button>
      )}

      <Field label="Orientações gerais">
        {(id) => <Textarea id={id} rows={3} disabled={readOnly} value={notes} onChange={(e) => setNotes(e.target.value)} />}
      </Field>

      <ErrorBox error={save.error ?? publish.error ?? del.error} />
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <div className="flex gap-2">
          {plan && plan.status !== 'ativo' && (
            <Button variant="danger" icon={<Trash2 className="size-4" />} loading={del.isPending}
                    onClick={() => { if (window.confirm('Excluir este plano?')) del.mutate() }}>Excluir</Button>
          )}
          {plan && onDuplicate && <Button variant="ghost" icon={<Copy className="size-4" />} onClick={onDuplicate}>Duplicar</Button>}
        </div>
        {!readOnly && (
          <div className="flex items-center gap-2">
            <Button variant="outline" loading={save.isPending} onClick={() => save.mutate()}>Salvar rascunho</Button>
            <Button icon={<Send className="size-4" />} loading={publish.isPending} onClick={() => publish.mutate()}
                    className="uppercase tracking-[0.12em]">
              Enviar pro app
            </Button>
          </div>
        )}
      </div>
      {plan?.status === 'ativo' && <p className="text-right font-hand text-xl text-terracotta">plano ativo no app da paciente</p>}
    </Card>
  )
}
