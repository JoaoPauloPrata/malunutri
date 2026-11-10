import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, Search, Smartphone, UserPlus, Users } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useToast } from '../../components/Toast'
import { Avatar, Badge, Button, Choice, Empty, ErrorBox, Field, Input, Modal, Select, Skeleton, Textarea } from '../../components/ui'
import { api } from '../../lib/api'
import { dateTime, kg } from '../../lib/format'
import type { Patient, PatientInput, PatientOverview } from '../../lib/types'

export function PatientsPage() {
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [status, setStatus] = useState<'active' | 'paused' | 'archived'>('active')
  const [newOpen, setNewOpen] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 250)
    return () => clearTimeout(id)
  }, [search])

  const list = useQuery({
    queryKey: ['patients', debounced, status],
    queryFn: () => api.get<PatientOverview[]>(`/patients?status=${status}&search=${encodeURIComponent(debounced)}`),
    placeholderData: (prev) => prev,
  })

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Central de pacientes</p>
          <h1 className="mt-1 text-4xl font-normal">Pacientes</h1>
        </div>
        <Button icon={<UserPlus className="size-4" />} onClick={() => setNewOpen(true)}>Novo paciente</Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input aria-label="Buscar paciente" placeholder="Buscar por nome…" value={search}
                 onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Choice label="Situação" tone="olive" value={status} onChange={setStatus}
                options={[{ value: 'active', label: 'Ativos' }, { value: 'paused', label: 'Pausados' }, { value: 'archived', label: 'Arquivados' }]} />
      </div>

      <ErrorBox error={list.error} />

      {list.isPending ? (
        <div className="flex flex-col gap-2">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : list.data?.length === 0 ? (
        <div className="card">
          <Empty icon={<Users className="size-8" />} title={debounced ? 'Ninguém com esse nome' : 'Nenhum paciente aqui ainda'}>
            {!debounced && 'Cadastre o primeiro paciente para começar a organizar consultas, planos e exames.'}
          </Empty>
        </div>
      ) : (
        <ul className="card divide-y divide-line">
          {list.data?.map((p) => (
            <li key={p.id}>
              <Link to={`/pacientes/${p.id}`} className="flex min-h-20 items-center gap-4 px-4 py-3 transition-colors hover:bg-sand/50 md:px-5">
                <Avatar name={p.fullName} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {p.fullName}
                    {p.age != null && <span className="font-normal text-muted">, {p.age} anos</span>}
                  </p>
                  <p className="truncate text-sm text-muted">
                    {p.goal ?? 'Sem objetivo registrado'}
                    {p.lastWeightKg != null && ` · ${kg(p.lastWeightKg)}`}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5 md:hidden">
                    <PatientBadges p={p} />
                  </div>
                </div>
                <div className="hidden flex-wrap justify-end gap-1.5 md:flex">
                  <PatientBadges p={p} />
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <NewPatientModal open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  )
}

function PatientBadges({ p }: { p: PatientOverview }) {
  return (
    <>
      {!p.hasActivePlan && <Badge tone="terracotta">sem plano</Badge>}
      {p.pendingCheckIns > 0 && <Badge tone="olive">{p.pendingCheckIns} check-in{p.pendingCheckIns > 1 ? 's' : ''}</Badge>}
      {p.nextConsultation && <Badge>{dateTime(p.nextConsultation, { day: '2-digit', month: 'short' })}</Badge>}
      {p.hasAppAccess && (
        <span title="Usa o app" className="inline-flex items-center text-sage"><Smartphone className="size-4" aria-label="Usa o app" /></span>
      )}
    </>
  )
}

// ---------------------------------------------------------------- Formulário de cadastro

const empty: PatientInput = {
  fullName: '', email: null, phone: null, birthDate: null, sex: null, heightCm: null,
  goal: null, notes: null, proteinTargetG: 100, waterTargetMl: 2500,
}

export function PatientForm({
  initial, submitLabel, onSubmit, loading, error, lockEmail,
}: {
  initial?: Patient
  submitLabel: string
  onSubmit: (input: PatientInput, invite: boolean) => void
  loading: boolean
  error: unknown
  lockEmail?: boolean
}) {
  const [f, setF] = useState<PatientInput>(initial ?? empty)
  const [invite, setInvite] = useState(true)
  const set = <K extends keyof PatientInput>(k: K, v: PatientInput[K]) => setF((x) => ({ ...x, [k]: v }))
  const str = (v: string) => (v.trim() === '' ? null : v)
  const num = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')))

  function submit(e: FormEvent) {
    e.preventDefault()
    onSubmit(f, !initial && invite && !!f.email)
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Nome completo" className="sm:col-span-2">
        {(id) => <Input id={id} required autoComplete="off" value={f.fullName} onChange={(e) => set('fullName', e.target.value)} />}
      </Field>
      <Field label="E-mail" hint={lockEmail ? 'Já vinculado ao app.' : 'Usado para o acesso ao app.'}>
        {(id) => <Input id={id} type="email" disabled={lockEmail} value={f.email ?? ''} onChange={(e) => set('email', str(e.target.value))} />}
      </Field>
      <Field label="Telefone">
        {(id) => <Input id={id} type="tel" inputMode="tel" value={f.phone ?? ''} onChange={(e) => set('phone', str(e.target.value))} />}
      </Field>
      <Field label="Data de nascimento">
        {(id) => <Input id={id} type="date" value={f.birthDate ?? ''} onChange={(e) => set('birthDate', str(e.target.value))} />}
      </Field>
      <Field label="Sexo">
        {(id) => (
          <Select id={id} value={f.sex ?? ''} onChange={(e) => set('sex', (str(e.target.value) as PatientInput['sex']))}>
            <option value="">Não informado</option>
            <option value="F">Feminino</option>
            <option value="M">Masculino</option>
            <option value="O">Outro</option>
          </Select>
        )}
      </Field>
      <Field label="Altura (cm)">
        {(id) => <Input id={id} inputMode="decimal" value={f.heightCm ?? ''} onChange={(e) => set('heightCm', num(e.target.value))} />}
      </Field>
      <Field label="Objetivo">
        {(id) => <Input id={id} placeholder="Ex.: reduzir medidas e ter energia" value={f.goal ?? ''} onChange={(e) => set('goal', str(e.target.value))} />}
      </Field>
      <Field label="Meta de proteína (g/dia)">
        {(id) => <Input id={id} inputMode="numeric" required value={f.proteinTargetG}
                        onChange={(e) => set('proteinTargetG', Number(e.target.value) || 0)} />}
      </Field>
      <Field label="Meta de água (ml/dia)">
        {(id) => <Input id={id} inputMode="numeric" step={250} required value={f.waterTargetMl}
                        onChange={(e) => set('waterTargetMl', Number(e.target.value) || 0)} />}
      </Field>
      <Field label="Observações" className="sm:col-span-2">
        {(id) => <Textarea id={id} rows={3} value={f.notes ?? ''} onChange={(e) => set('notes', str(e.target.value))} />}
      </Field>
      {!initial && (
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm sm:col-span-2">
          <input type="checkbox" checked={invite} onChange={(e) => setInvite(e.target.checked)} className="size-5 accent-olive" />
          Enviar convite do app por e-mail
        </label>
      )}
      <div className="sm:col-span-2"><ErrorBox error={error} /></div>
      <div className="flex justify-end sm:col-span-2">
        <Button type="submit" loading={loading}>{submitLabel}</Button>
      </div>
    </form>
  )
}

export function NewPatientModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const toast = useToast()
  const navigate = useNavigate()
  const create = useMutation({
    mutationFn: async ({ input, invite }: { input: PatientInput; invite: boolean }) => {
      const p = await api.post<Patient>('/patients', input)
      if (invite) {
        try {
          await api.post(`/patients/${p.id}/invite`)
          toast('Paciente cadastrado e convite enviado.')
        } catch (e) {
          toast(`Cadastrado, mas o convite falhou: ${(e as Error).message}`, 'error')
        }
      } else toast('Paciente cadastrado.')
      return p
    },
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['patients'] })
      qc.invalidateQueries({ queryKey: ['today'] })
      onClose()
      navigate(`/pacientes/${p.id}`)
    },
  })

  return (
    <Modal open={open} onClose={onClose} title="Novo paciente" wide>
      <PatientForm submitLabel="Cadastrar" loading={create.isPending} error={create.error}
                   onSubmit={(input, invite) => create.mutate({ input, invite })} />
    </Modal>
  )
}
