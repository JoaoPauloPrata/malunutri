import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { CalendarPlus, Mic, Sparkles, Square, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useToast } from '../../../components/Toast'
import { Badge, Button, Card, Empty, ErrorBox, Field, Input, Modal, Select, Spinner, Textarea } from '../../../components/ui'
import { api } from '../../../lib/api'
import { dateTime, isoToLocalInput, localInputToIso } from '../../../lib/format'
import type { Consultation } from '../../../lib/types'

const statusTone = { agendada: 'sage', realizada: 'olive', cancelada: 'neutral' } as const

export function ConsultationsTab({ patientId }: { patientId: string }) {
  const [params, setParams] = useSearchParams()
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const list = useQuery({
    queryKey: ['consultations', patientId],
    queryFn: () => api.get<Consultation[]>(`/patients/${patientId}/consultations`),
  })
  const selectedId = params.get('consulta') ?? list.data?.[0]?.id
  const select = (id: string) => setParams((p) => { p.set('consulta', id); return p }, { replace: true })
  const selected = list.data?.find((c) => c.id === selectedId)

  if (list.isPending) return <Spinner />
  return (
    <div className="grid gap-4 lg:grid-cols-[17rem_1fr]">
      <div className="flex flex-col gap-3">
        <Button variant="olive" icon={<CalendarPlus className="size-4" />} onClick={() => setScheduleOpen(true)}>Agendar consulta</Button>
        <ul className="card divide-y divide-line overflow-hidden">
          {list.data?.length === 0 && <li className="p-4 text-sm text-muted">Nenhuma consulta ainda.</li>}
          {list.data?.map((c) => (
            <li key={c.id}>
              <button onClick={() => select(c.id)}
                      className={clsx('flex min-h-14 w-full cursor-pointer items-center justify-between gap-2 px-4 py-3 text-left transition-colors',
                        c.id === selectedId ? 'bg-olive-soft' : 'hover:bg-sand/60')}>
                <span>
                  <span className="block text-sm font-medium">{dateTime(c.scheduledAt, { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  <span className="block text-xs text-muted">{dateTime(c.scheduledAt, { hour: '2-digit', minute: '2-digit' })} · {c.kind}</span>
                </span>
                <Badge tone={statusTone[c.status]}>{c.status}</Badge>
              </button>
            </li>
          ))}
        </ul>
      </div>
      {selected ? <ConsultationEditor key={selected.id} consultation={selected} /> : (
        <Card><Empty title="Selecione ou agende uma consulta">Durante a consulta, grave ou cole a conversa e a IA organiza o prontuário.</Empty></Card>
      )}
      <ScheduleModal patientId={patientId} open={scheduleOpen} onClose={() => setScheduleOpen(false)} onCreated={select} />
    </div>
  )
}

function ScheduleModal({ patientId, open, onClose, onCreated }: { patientId: string; open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const qc = useQueryClient()
  const [at, setAt] = useState('')
  const [kind, setKind] = useState<Consultation['kind']>('retorno')
  const [duration, setDuration] = useState(60)
  const create = useMutation({
    mutationFn: () => api.post<Consultation>(`/patients/${patientId}/consultations`, { scheduledAt: localInputToIso(at), durationMin: duration, kind }),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ['consultations', patientId] })
      qc.invalidateQueries({ queryKey: ['today'] })
      onCreated(c.id)
      onClose()
    },
  })
  return (
    <Modal open={open} onClose={onClose} title="Agendar consulta">
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); create.mutate() }}>
        <Field label="Data e horário">{(id) => <Input id={id} type="datetime-local" required value={at} onChange={(e) => setAt(e.target.value)} />}</Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo">
            {(id) => (
              <Select id={id} value={kind} onChange={(e) => setKind(e.target.value as Consultation['kind'])}>
                <option value="primeira">Primeira consulta</option>
                <option value="retorno">Retorno</option>
              </Select>
            )}
          </Field>
          <Field label="Duração (min)">{(id) => <Input id={id} type="number" min={10} max={240} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />}</Field>
        </div>
        <ErrorBox error={create.error} />
        <Button type="submit" loading={create.isPending}>Agendar</Button>
      </form>
    </Modal>
  )
}

// ---------------------------------------------------------------- Editor: transcrição → prontuário

type SpeechRecognitionLike = {
  lang: string; continuous: boolean; interimResults: boolean
  start(): void; stop(): void
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
}
const SpeechRecognitionCtor: (new () => SpeechRecognitionLike) | undefined =
  (window as unknown as Record<string, unknown>).SpeechRecognition as never ??
  (window as unknown as Record<string, unknown>).webkitSpeechRecognition as never

function ConsultationEditor({ consultation: c }: { consultation: Consultation }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [form, setForm] = useState({
    scheduledAt: isoToLocalInput(c.scheduledAt),
    durationMin: c.durationMin,
    kind: c.kind,
    status: c.status,
    transcript: c.transcript ?? '',
    chiefComplaint: c.chiefComplaint ?? '',
    routine: c.routine ?? '',
    physicalActivity: c.physicalActivity ?? '',
    objective: c.objective ?? '',
    clinicalNotes: c.clinicalNotes ?? '',
  })
  const [dirty, setDirty] = useState(false)
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => { setForm((f) => ({ ...f, [k]: v })); setDirty(true) }

  // ---- gravação com reconhecimento de voz do navegador (pt-BR)
  const [recording, setRecording] = useState(false)
  const [interim, setInterim] = useState('')
  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const wantRef = useRef(false)

  function startRecording() {
    if (!SpeechRecognitionCtor) return toast('Seu navegador não suporta gravação. Use o Chrome ou cole a transcrição.', 'error')
    const rec = new SpeechRecognitionCtor()
    rec.lang = 'pt-BR'
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = (e) => {
      let finalText = ''
      let partial = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) finalText += r[0].transcript.trim() + '\n'
        else partial += r[0].transcript
      }
      if (finalText) {
        setForm((f) => ({ ...f, transcript: (f.transcript ? f.transcript.replace(/\n?$/, '\n') : '') + finalText.trimEnd() }))
        setDirty(true)
      }
      setInterim(partial)
    }
    rec.onerror = (e) => { if (e.error !== 'no-speech') toast(`Gravação: ${e.error}`, 'error') }
    // o Chrome encerra sozinho após silêncio; reinicia enquanto o usuário não parar
    rec.onend = () => { if (wantRef.current) rec.start(); else { setRecording(false); setInterim('') } }
    wantRef.current = true
    recRef.current = rec
    rec.start()
    setRecording(true)
  }
  function stopRecording() {
    wantRef.current = false
    recRef.current?.stop()
  }
  useEffect(() => () => { wantRef.current = false; recRef.current?.stop() }, [])

  const save = useMutation({
    mutationFn: () => api.put<Consultation>(`/consultations/${c.id}`, {
      ...form,
      scheduledAt: localInputToIso(form.scheduledAt),
      ...Object.fromEntries(
        (['transcript', 'chiefComplaint', 'routine', 'physicalActivity', 'objective', 'clinicalNotes'] as const)
          .map((k) => [k, form[k].trim() || null]),
      ),
    }),
    onSuccess: () => {
      setDirty(false)
      qc.invalidateQueries({ queryKey: ['consultations', c.patientId] })
      qc.invalidateQueries({ queryKey: ['today'] })
      toast('Consulta salva.')
    },
  })

  const analyze = useMutation({
    mutationFn: async () => {
      if (dirty) await save.mutateAsync()
      return api.post<Consultation>(`/consultations/${c.id}/analyze`)
    },
    onSuccess: (r) => {
      setForm((f) => ({
        ...f,
        chiefComplaint: r.chiefComplaint ?? '',
        routine: r.routine ?? '',
        physicalActivity: r.physicalActivity ?? '',
        objective: r.objective ?? '',
      }))
      setDirty(false)
      qc.invalidateQueries({ queryKey: ['consultations', c.patientId] })
      toast('Prontuário preenchido pela IA. Revise antes de seguir.')
    },
  })

  const del = useMutation({
    mutationFn: () => api.del(`/consultations/${c.id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['consultations', c.patientId] }),
  })

  return (
    <Card className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Data e horário" className="sm:col-span-2">
          {(id) => <Input id={id} type="datetime-local" value={form.scheduledAt} onChange={(e) => set('scheduledAt', e.target.value)} />}
        </Field>
        <Field label="Tipo">
          {(id) => (
            <Select id={id} value={form.kind} onChange={(e) => set('kind', e.target.value as Consultation['kind'])}>
              <option value="primeira">Primeira</option>
              <option value="retorno">Retorno</option>
            </Select>
          )}
        </Field>
        <Field label="Situação">
          {(id) => (
            <Select id={id} value={form.status} onChange={(e) => set('status', e.target.value as Consultation['status'])}>
              <option value="agendada">Agendada</option>
              <option value="realizada">Realizada</option>
              <option value="cancelada">Cancelada</option>
            </Select>
          )}
        </Field>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg">Transcrição</h3>
            {recording ? (
              <Button variant="danger" icon={<Square className="size-4" />} onClick={stopRecording}>
                <span className="relative mr-1 flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-terracotta opacity-75" /><span className="relative inline-flex size-2 rounded-full bg-terracotta" /></span>
                Parar
              </Button>
            ) : (
              <Button variant="outline" icon={<Mic className="size-4" />} onClick={startRecording}>Gravar consulta</Button>
            )}
          </div>
          <Textarea aria-label="Transcrição da consulta" rows={14} value={form.transcript}
                    placeholder={'Grave a consulta ou cole a conversa aqui.\n\nMalu: Me conta como é um dia normal seu.\nPaciente: Acordo 6h30, tomo só café preto…'}
                    onChange={(e) => set('transcript', e.target.value)} className="min-h-72 bg-sand/40 text-sm" />
          {interim && <p aria-live="polite" className="text-sm text-muted italic">{interim}…</p>}
          <Button variant="primary" icon={<Sparkles className="size-4" />} loading={analyze.isPending}
                  disabled={!form.transcript.trim()} onClick={() => analyze.mutate()}>
            Organizar prontuário com IA
          </Button>
          <ErrorBox error={analyze.error} />
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg">Prontuário</h3>
            {c.aiProcessedAt && <Badge tone="terracotta">feito pela IA</Badge>}
          </div>
          <Field label="Queixa principal">{(id) => <Textarea id={id} rows={2} value={form.chiefComplaint} onChange={(e) => set('chiefComplaint', e.target.value)} />}</Field>
          <Field label="Rotina">{(id) => <Textarea id={id} rows={3} value={form.routine} onChange={(e) => set('routine', e.target.value)} />}</Field>
          <Field label="Atividade física">{(id) => <Textarea id={id} rows={2} value={form.physicalActivity} onChange={(e) => set('physicalActivity', e.target.value)} />}</Field>
          <Field label="Objetivo">{(id) => <Textarea id={id} rows={2} value={form.objective} onChange={(e) => set('objective', e.target.value)} />}</Field>
          <Field label="Notas clínicas">{(id) => <Textarea id={id} rows={3} value={form.clinicalNotes} onChange={(e) => set('clinicalNotes', e.target.value)} />}</Field>
        </div>
      </div>

      <ErrorBox error={save.error} />
      <div className="flex flex-wrap justify-between gap-3 border-t border-line pt-4">
        <Button variant="danger" icon={<Trash2 className="size-4" />} loading={del.isPending}
                onClick={() => { if (window.confirm('Excluir esta consulta?')) del.mutate() }}>
          Excluir
        </Button>
        <Button variant="olive" loading={save.isPending} disabled={!dirty} onClick={() => save.mutate()}>
          {dirty ? 'Salvar consulta' : 'Salvo'}
        </Button>
      </div>
    </Card>
  )
}
