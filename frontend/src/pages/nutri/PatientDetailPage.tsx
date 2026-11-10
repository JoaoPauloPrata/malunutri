import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Mail, Sparkles } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useToast } from '../../components/Toast'
import { Badge, Button, Card, ErrorBox, SectionTitle, Select, Skeleton, Tabs } from '../../components/ui'
import { api } from '../../lib/api'
import { dateOnly, dateTime, mealLabel, n } from '../../lib/format'
import type { Consultation, ExamPanel, MealPlan, MealPlanSummary, Patient, PatientInput } from '../../lib/types'
import { PatientForm } from './PatientsPage'
import { ConsultationsTab } from './tabs/ConsultationsTab'
import { ExamsTab, ExamStatusBadge } from './tabs/ExamsTab'
import { MealPlanTab } from './tabs/MealPlanTab'
import { ProgressTab } from './tabs/ProgressTab'

type Tab = 'geral' | 'consultas' | 'plano' | 'exames' | 'evolucao' | 'cadastro'

export function PatientDetailPage() {
  const { id = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('aba') as Tab) ?? 'geral'
  const setTab = (t: Tab) => setParams((p) => { p.set('aba', t); return p }, { replace: true })

  const patient = useQuery({ queryKey: ['patient', id], queryFn: () => api.get<Patient>(`/patients/${id}`) })
  const consultations = useQuery({ queryKey: ['consultations', id], queryFn: () => api.get<Consultation[]>(`/patients/${id}/consultations`) })

  if (patient.isPending) return <div className="mx-auto max-w-6xl space-y-4"><Skeleton className="h-16 w-80" /><Skeleton className="h-64" /></div>
  if (patient.error) return <ErrorBox error={patient.error} />
  const p = patient.data
  const age = p.birthDate ? Math.floor((Date.now() - new Date(p.birthDate).getTime()) / 31_557_600_000) : null
  const next = consultations.data?.find((c) => c.status === 'agendada')

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <Link to="/pacientes" className="inline-flex min-h-11 w-fit items-center gap-2 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Pacientes
      </Link>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {next && (
            <p className="eyebrow">
              {next.kind === 'primeira' ? '1ª consulta' : 'Consulta'} · {dateTime(next.scheduledAt, { day: 'numeric', month: 'long' })} · {next.durationMin} min
            </p>
          )}
          <h1 className="mt-1 text-4xl font-normal text-brown">
            {p.fullName}{age != null && <em className="text-3xl">, {age} anos</em>}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {p.status !== 'active' && <Badge>{p.status === 'paused' ? 'pausado' : 'arquivado'}</Badge>}
          {p.hasAppAccess ? <Badge tone="sage">usa o app</Badge> : <Badge>sem acesso ao app</Badge>}
        </div>
      </header>

      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'geral', label: 'Visão geral' },
          { value: 'consultas', label: 'Consultas' },
          { value: 'plano', label: 'Plano alimentar' },
          { value: 'exames', label: 'Exames' },
          { value: 'evolucao', label: 'Evolução' },
          { value: 'cadastro', label: 'Cadastro' },
        ]}
      />

      {tab === 'geral' && <Overview patient={p} consultations={consultations.data ?? []} goTo={setTab} />}
      {tab === 'consultas' && <ConsultationsTab patientId={id} />}
      {tab === 'plano' && <MealPlanTab patientId={id} />}
      {tab === 'exames' && <ExamsTab patientId={id} />}
      {tab === 'evolucao' && <ProgressTab patientId={id} />}
      {tab === 'cadastro' && <RegistrationTab patient={p} />}
    </div>
  )
}

// ---------------------------------------------------------------- Visão geral (os 3 cards numerados)

function Overview({ patient, consultations, goTo }: { patient: Patient; consultations: Consultation[]; goTo: (t: Tab) => void }) {
  const last = consultations.find((c) => c.transcript || c.chiefComplaint) ?? consultations[0]
  const plans = useQuery({ queryKey: ['meal-plans', patient.id], queryFn: () => api.get<MealPlanSummary[]>(`/patients/${patient.id}/meal-plans`) })
  const activeId = plans.data?.find((x) => x.status === 'ativo')?.id ?? plans.data?.[0]?.id
  const plan = useQuery({ queryKey: ['meal-plan', activeId], queryFn: () => api.get<MealPlan>(`/meal-plans/${activeId}`), enabled: !!activeId })
  const exams = useQuery({ queryKey: ['exams', patient.id], queryFn: () => api.get<ExamPanel[]>(`/patients/${patient.id}/exams`) })
  const panel = exams.data?.[0]
  const attention = panel?.results.filter((r) => r.status !== 'normal').length ?? 0

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <SectionTitle index={1} title="Transcrição → prontuário" hint="A conversa vira prontuário enquanto a consulta acontece"
                      badge={last?.aiProcessedAt ? <Badge tone="terracotta">feito pela IA</Badge> : undefined} />
        {!last ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-muted">Nenhuma consulta registrada ainda.</p>
            <Button variant="olive" onClick={() => goTo('consultas')}>Agendar consulta</Button>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            <div className="max-h-56 overflow-y-auto rounded-2xl bg-sand/70 p-4 text-sm leading-relaxed whitespace-pre-line">
              {last.transcript ?? <span className="text-muted">Sem transcrição nesta consulta.</span>}
            </div>
            <dl className="flex flex-col gap-3 text-sm">
              {([
                ['Queixa principal', last.chiefComplaint],
                ['Rotina', last.routine],
                ['Atividade física', last.physicalActivity],
                ['Objetivo', last.objective ?? patient.goal],
              ] as const).map(([k, v]) => (
                <div key={k}>
                  <dt className="eyebrow !text-[0.65rem]">{k}</dt>
                  <dd className={v ? '' : 'text-muted'}>{v ?? '—'}</dd>
                </div>
              ))}
              <Button variant="ghost" className="self-start !px-0" icon={<Sparkles className="size-4" />} onClick={() => goTo('consultas')}>
                Abrir consulta
              </Button>
            </dl>
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle index={2} title="Plano alimentar" hint="Porções e substituições vão para o app"
                      badge={plan.data && <Badge tone={plan.data.status === 'ativo' ? 'olive' : 'neutral'}>{plan.data.status}</Badge>} />
        {!plan.data ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-muted">Ainda não há plano para este paciente.</p>
            <Button variant="olive" onClick={() => goTo('plano')}>Montar plano</Button>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-line text-sm">
              {plan.data.items.map((it) => (
                <li key={it.id} className="grid grid-cols-[7rem_1fr] gap-3 py-2">
                  <span className="eyebrow !text-[0.65rem] pt-0.5">{mealLabel[it.meal]} · {it.mealTime}</span>
                  <span>
                    {it.description}{' '}
                    {it.tip && <mark className="rounded bg-highlight/80 px-1">{it.tip}</mark>}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={() => goTo('plano')}>Editar</Button>
            </div>
          </>
        )}
      </Card>

      <Card>
        <SectionTitle index={3} title="Resumo dos exames"
                      hint={panel ? `${panel.title}, ${dateOnly(panel.collectedAt, { month: 'long', year: 'numeric' })}` : undefined}
                      badge={attention > 0 ? <Badge tone="terracotta">{attention} ponto{attention > 1 ? 's' : ''} de atenção</Badge> : undefined} />
        {!panel ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-muted">Nenhum exame cadastrado.</p>
            <Button variant="olive" onClick={() => goTo('exames')}>Adicionar exames</Button>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead><tr className="eyebrow !text-[0.65rem] text-left"><th className="pb-2 font-medium">Exame</th><th className="pb-2 font-medium">Resultado</th><th /></tr></thead>
              <tbody className="divide-y divide-line">
                {panel.results.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2">{r.examName}</td>
                    <td className="py-2 whitespace-nowrap">{n(r.value)} {r.unit}</td>
                    <td className="py-2 text-right"><ExamStatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {panel.attentionNote && (
              <p className="mt-3 rounded-xl bg-sand px-3 py-2 text-sm"><strong className="font-medium">Pra validar:</strong> {panel.attentionNote}</p>
            )}
          </>
        )}
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------- Cadastro

function RegistrationTab({ patient }: { patient: Patient }) {
  const qc = useQueryClient()
  const toast = useToast()
  const update = useMutation({
    mutationFn: (input: PatientInput) => api.put<Patient>(`/patients/${patient.id}`, input),
    onSuccess: (p) => {
      qc.setQueryData(['patient', patient.id], p)
      qc.invalidateQueries({ queryKey: ['patients'] })
      toast('Cadastro atualizado.')
    },
  })
  const invite = useMutation({
    mutationFn: () => api.post(`/patients/${patient.id}/invite`),
    onSuccess: () => toast('Convite enviado por e-mail.'),
    onError: (e) => toast(e.message, 'error'),
  })
  const status = useMutation({
    mutationFn: (s: string) => api.put<Patient>(`/patients/${patient.id}/status`, { status: s }),
    onSuccess: (p) => {
      qc.setQueryData(['patient', patient.id], p)
      qc.invalidateQueries({ queryKey: ['patients'] })
      qc.invalidateQueries({ queryKey: ['today'] })
    },
  })

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <Card>
        <PatientForm key={patient.id} initial={patient} lockEmail={patient.hasAppAccess} submitLabel="Salvar"
                     loading={update.isPending} error={update.error} onSubmit={(input) => update.mutate(input)} />
      </Card>
      <div className="flex flex-col gap-4">
        <Card>
          <h3 className="text-lg">Acesso ao app</h3>
          {patient.hasAppAccess ? (
            <p className="mt-1 text-sm text-muted">Paciente já entrou no app com {patient.email}.</p>
          ) : (
            <>
              <p className="mt-1 mb-3 text-sm text-muted">
                {patient.email ? `Enviaremos um convite para ${patient.email}.` : 'Cadastre um e-mail para liberar o acesso.'}
              </p>
              <Button variant="olive" icon={<Mail className="size-4" />} disabled={!patient.email}
                      loading={invite.isPending} onClick={() => invite.mutate()}>
                Enviar convite
              </Button>
            </>
          )}
        </Card>
        <Card>
          <label htmlFor="status" className="text-lg font-display text-olive-deep">Situação</label>
          <Select id="status" className="mt-2" value={patient.status} onChange={(e) => status.mutate(e.target.value)}>
            <option value="active">Ativo</option>
            <option value="paused">Pausado</option>
            <option value="archived">Arquivado</option>
          </Select>
        </Card>
      </div>
    </div>
  )
}
