import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { CalendarDays, ClipboardCheck, Home, LogOut, Scale, TrendingUp, Users, UtensilsCrossed } from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Avatar } from '../components/ui'
import { api } from '../lib/api'
import { time } from '../lib/format'
import type { NutritionistToday } from '../lib/types'

export function Brand({ light, className }: { light?: boolean; className?: string }) {
  return (
    <div className={clsx('leading-none', className)}>
      <p className={clsx('font-display text-lg tracking-[0.28em]', light ? 'text-white' : 'text-olive-deep')}>MALU LAGE</p>
      <p className={clsx('mt-1 text-[0.6rem] tracking-[0.42em]', light ? 'text-white/70' : 'text-muted')}>NUTRICIONISTA</p>
    </div>
  )
}

type NavItem = { to: string; label: string; icon: ReactNode; end?: boolean }

function BottomNav({ items }: { items: NavItem[] }) {
  return (
    <nav aria-label="Navegação principal"
         className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="mx-auto flex max-w-lg justify-around">
        {items.map((it) => (
          <li key={it.to} className="flex-1">
            <NavLink
              to={it.to}
              end={it.end}
              className={({ isActive }) => clsx(
                'flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.7rem] transition-colors',
                isActive ? 'text-terracotta' : 'text-muted hover:text-ink',
              )}
            >
              {it.icon}
              {it.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

// ---------------------------------------------------------------- Nutricionista

const nutriNav: NavItem[] = [
  { to: '/', label: 'Hoje', icon: <CalendarDays className="size-5" aria-hidden />, end: true },
  { to: '/pacientes', label: 'Pacientes', icon: <Users className="size-5" aria-hidden /> },
]

export function NutriLayout() {
  const { me, signOut } = useAuth()
  const today = useQuery({ queryKey: ['today'], queryFn: () => api.get<NutritionistToday>('/dashboard/today') })

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[16rem_1fr]">
      {/* Barra lateral marrom (desktop) */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-8 overflow-y-auto bg-brown px-5 py-7 text-white md:flex">
        <Brand light />
        <nav aria-label="Navegação principal" className="flex flex-col gap-1">
          {nutriNav.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              className={({ isActive }) => clsx(
                'flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors',
                isActive ? 'bg-white/15 text-white' : 'text-white/75 hover:bg-white/10 hover:text-white',
              )}
            >
              {it.icon}
              {it.label}
            </NavLink>
          ))}
        </nav>

        <div>
          <p className="eyebrow !text-white/60">Hoje</p>
          <ul className="mt-3 flex flex-col gap-1">
            {today.data?.consultations.length === 0 && <li className="text-sm text-white/60">Sem consultas.</li>}
            {today.data?.consultations.map((c) => (
              <li key={c.id}>
                <NavLink to={`/pacientes/${c.patientId}?consulta=${c.id}`}
                         className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/10">
                  <Avatar name={c.patientName} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm">{c.patientName}</span>
                    <span className="block text-xs text-white/60">
                      {time(c.scheduledAt)} · {c.kind === 'primeira' ? '1ª consulta' : 'retorno'}
                    </span>
                  </span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="eyebrow !text-white/60">Pendências</p>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            <li className="flex items-center gap-3">
              <span className="inline-flex size-6 items-center justify-center rounded-full bg-terracotta text-xs">
                {today.data?.plansToBuild ?? '·'}
              </span>
              planos pra montar
            </li>
            <li className="flex items-center gap-3">
              <span className="inline-flex size-6 items-center justify-center rounded-full bg-olive text-xs">
                {today.data?.newCheckIns ?? '·'}
              </span>
              check-ins novos
            </li>
          </ul>
        </div>

        <div className="mt-auto flex items-center gap-3 border-t border-white/15 pt-5">
          <Avatar name={me?.fullName ?? '?'} size="sm" />
          <span className="min-w-0 flex-1 truncate text-sm">{me?.fullName}</span>
          <button onClick={signOut} aria-label="Sair" title="Sair"
                  className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full hover:bg-white/10">
            <LogOut className="size-4" />
          </button>
        </div>
      </aside>

      {/* Topo (mobile) */}
      <header className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-2 md:hidden">
        <Brand />
        <button onClick={signOut} aria-label="Sair"
                className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-sand">
          <LogOut className="size-5" />
        </button>
      </header>

      <main className="pb-safe min-w-0 px-4 md:px-10 md:py-8 md:pb-10">
        <Outlet />
      </main>
      <BottomNav items={nutriNav} />
    </div>
  )
}

// ---------------------------------------------------------------- Paciente (mobile-first)

const patientNav: NavItem[] = [
  { to: '/', label: 'Hoje', icon: <Home className="size-5" aria-hidden />, end: true },
  { to: '/plano', label: 'Plano', icon: <UtensilsCrossed className="size-5" aria-hidden /> },
  { to: '/trocas', label: 'Trocas', icon: <Scale className="size-5" aria-hidden /> },
  { to: '/check-in', label: 'Check-in', icon: <ClipboardCheck className="size-5" aria-hidden /> },
  { to: '/evolucao', label: 'Evolução', icon: <TrendingUp className="size-5" aria-hidden /> },
]

export function PatientLayout() {
  const { me, signOut } = useAuth()
  return (
    <div className="mx-auto min-h-dvh max-w-lg md:max-w-2xl">
      <header className="flex items-center justify-between px-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-2">
        <Brand />
        <div className="flex items-center gap-1">
          <button onClick={signOut} aria-label="Sair" title="Sair"
                  className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-sand">
            <LogOut className="size-4" />
          </button>
          <Avatar name={me?.fullName ?? '?'} />
        </div>
      </header>
      <nav aria-label="Navegação principal" className="hidden px-5 md:block">
        <ul className="flex gap-1">
          {patientNav.map((it) => (
            <li key={it.to}>
              <NavLink to={it.to} end={it.end}
                       className={({ isActive }) => clsx(
                         'flex min-h-11 items-center gap-2 rounded-full px-4 text-sm',
                         isActive ? 'bg-olive-deep text-white' : 'text-muted hover:bg-sand',
                       )}>
                {it.icon}
                {it.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <main className="pb-safe px-5 pt-2 md:pb-10">
        <Outlet />
      </main>
      <BottomNav items={patientNav} />
    </div>
  )
}
