import { useQuery } from '@tanstack/react-query'
import { CalendarDays, ChevronRight, ClipboardCheck, UserPlus, Users, UtensilsCrossed } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { Avatar, Badge, Button, Card, Empty, ErrorBox, Skeleton } from '../../components/ui'
import { api } from '../../lib/api'
import { dateTime, kg, time } from '../../lib/format'
import type { NutritionistToday } from '../../lib/types'
import { NewPatientModal } from './PatientsPage'

function greeting() {
  const h = Number(new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }).format(new Date()))
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

function Stat({ label, value, icon, tone }: { label: string; value: ReactNode; icon: ReactNode; tone: string }) {
  return (
    <div className="card flex items-center gap-4 p-4">
      <span className={`inline-flex size-11 items-center justify-center rounded-full ${tone}`}>{icon}</span>
      <div>
        <p className="font-display text-2xl leading-none text-ink">{value}</p>
        <p className="mt-1 text-sm text-muted">{label}</p>
      </div>
    </div>
  )
}

export function TodayPage() {
  const { me } = useAuth()
  const [newOpen, setNewOpen] = useState(false)
  const today = useQuery({ queryKey: ['today'], queryFn: () => api.get<NutritionistToday>('/dashboard/today') })
  const t = today.data

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">
            {dateTime(new Date().toISOString(), { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="mt-1 text-4xl font-normal">
            {greeting()}, <em>{me?.fullName.split(' ')[0]}</em>.
          </h1>
        </div>
        <Button icon={<UserPlus className="size-4" />} onClick={() => setNewOpen(true)}>Novo paciente</Button>
      </div>

      <ErrorBox error={today.error} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {t ? (
          <>
            <Stat label="consultas hoje" value={t.consultations.length} tone="bg-olive-soft text-olive-deep"
                  icon={<CalendarDays className="size-5" aria-hidden />} />
            <Stat label="planos pra montar" value={t.plansToBuild} tone="bg-terracotta-soft text-terracotta"
                  icon={<UtensilsCrossed className="size-5" aria-hidden />} />
            <Stat label="check-ins novos" value={t.newCheckIns} tone="bg-sage-soft text-olive-deep"
                  icon={<ClipboardCheck className="size-5" aria-hidden />} />
            <Stat label="pacientes ativos" value={t.activePatients} tone="bg-sand text-brown"
                  icon={<Users className="size-5" aria-hidden />} />
          </>
        ) : Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-20" />)}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <h2 className="mb-3 text-xl">Agenda de hoje</h2>
          {t?.consultations.length === 0 && (
            <Empty icon={<CalendarDays className="size-8" />} title="Agenda livre">
              Agende consultas na ficha de cada paciente.
            </Empty>
          )}
          <ul className="divide-y divide-line">
            {t?.consultations.map((c) => (
              <li key={c.id}>
                <Link to={`/pacientes/${c.patientId}?aba=consultas&consulta=${c.id}`}
                      className="-mx-2 flex min-h-16 items-center gap-3 rounded-xl px-2 py-2 hover:bg-sand/60">
                  <span className="w-14 font-display text-lg text-olive-deep">{time(c.scheduledAt)}</span>
                  <Avatar name={c.patientName} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{c.patientName}</span>
                    <span className="block text-sm text-muted">{c.durationMin} min</span>
                  </span>
                  <Badge tone={c.kind === 'primeira' ? 'terracotta' : 'sage'}>{c.kind === 'primeira' ? '1ª consulta' : 'retorno'}</Badge>
                  <ChevronRight className="size-4 text-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="mb-3 text-xl">Check-ins para ler</h2>
          {t?.recentCheckIns.length === 0 && <p className="py-6 text-center text-sm text-muted">Tudo lido por aqui.</p>}
          <ul className="divide-y divide-line">
            {t?.recentCheckIns.map((c) => (
              <li key={c.id}>
                <Link to={`/pacientes/${c.patientId}?aba=evolucao`}
                      className="-mx-2 flex min-h-14 items-center gap-3 rounded-xl px-2 py-2 hover:bg-sand/60">
                  <Avatar name={c.patientName} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{c.patientName}</span>
                    <span className="block text-sm text-muted">adesão {c.adherence}/5 · {kg(c.weightKg)}</span>
                  </span>
                  <ChevronRight className="size-4 text-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <NewPatientModal open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  )
}
