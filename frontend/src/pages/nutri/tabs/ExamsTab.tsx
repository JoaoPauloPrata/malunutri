import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FlaskConical, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { Badge, Button, Card, Empty, ErrorBox, Field, IconButton, Input, Modal, Spinner, Textarea } from '../../../components/ui'
import { api } from '../../../lib/api'
import { dateOnly, n, todayIso } from '../../../lib/format'
import type { ExamPanel, ExamResult } from '../../../lib/types'

export function ExamStatusBadge({ status }: { status: ExamResult['status'] }) {
  return <Badge tone={status === 'normal' ? 'sage' : 'terracotta'}>{status}</Badge>
}

// Faixas de referência usuais em adultos — editáveis no formulário
const presets: Omit<Row, 'key' | 'value'>[] = [
  { examName: 'Vitamina D', unit: 'ng/mL', refMin: '30', refMax: '100' },
  { examName: 'Ferritina', unit: 'ng/mL', refMin: '15', refMax: '150' },
  { examName: 'Glicemia em jejum', unit: 'mg/dL', refMin: '70', refMax: '99' },
  { examName: 'TSH', unit: 'µUI/mL', refMin: '0.4', refMax: '4.5' },
  { examName: 'Hemoglobina', unit: 'g/dL', refMin: '12', refMax: '16' },
  { examName: 'Vitamina B12', unit: 'pg/mL', refMin: '200', refMax: '900' },
  { examName: 'Colesterol total', unit: 'mg/dL', refMin: '', refMax: '190' },
  { examName: 'HDL', unit: 'mg/dL', refMin: '40', refMax: '' },
  { examName: 'LDL', unit: 'mg/dL', refMin: '', refMax: '130' },
  { examName: 'Triglicerídeos', unit: 'mg/dL', refMin: '', refMax: '150' },
]

type Row = { key: string; examName: string; value: string; unit: string; refMin: string; refMax: string }

export function ExamsTab({ patientId }: { patientId: string }) {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const exams = useQuery({ queryKey: ['exams', patientId], queryFn: () => api.get<ExamPanel[]>(`/patients/${patientId}/exams`) })
  const del = useMutation({
    mutationFn: (id: string) => api.del(`/exams/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exams', patientId] }),
  })

  if (exams.isPending) return <Spinner />
  return (
    <div className="flex flex-col gap-4">
      <Button variant="olive" icon={<Plus className="size-4" />} className="self-start" onClick={() => setOpen(true)}>Adicionar exames</Button>
      <ErrorBox error={exams.error ?? del.error} />
      {exams.data?.length === 0 && (
        <Card><Empty icon={<FlaskConical className="size-8" />} title="Nenhum exame ainda">Registre os resultados e o status (baixo/normal/alto) é calculado automaticamente.</Empty></Card>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {exams.data?.map((panel) => {
          const attention = panel.results.filter((r) => r.status !== 'normal').length
          return (
            <Card key={panel.id}>
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-xl">{panel.title}</h3>
                  <p className="text-sm text-muted">{dateOnly(panel.collectedAt, { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                </div>
                <div className="flex items-center gap-1">
                  {attention > 0 && <Badge tone="terracotta">{attention} ponto{attention > 1 ? 's' : ''} de atenção</Badge>}
                  <IconButton label="Excluir exames" onClick={() => { if (window.confirm('Excluir este conjunto de exames?')) del.mutate(panel.id) }}>
                    <Trash2 className="size-4" />
                  </IconButton>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="eyebrow !text-[0.65rem] text-left">
                    <th className="pb-2 font-medium">Exame</th><th className="pb-2 font-medium">Resultado</th>
                    <th className="hidden pb-2 font-medium sm:table-cell">Referência</th><th />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {panel.results.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2">{r.examName}</td>
                      <td className="py-2 whitespace-nowrap">{n(r.value)} {r.unit}</td>
                      <td className="hidden py-2 text-muted sm:table-cell">
                        {r.refMin != null && r.refMax != null ? `${n(r.refMin)}–${n(r.refMax)}` : r.refMin != null ? `> ${n(r.refMin)}` : r.refMax != null ? `< ${n(r.refMax)}` : '—'}
                      </td>
                      <td className="py-2 text-right"><ExamStatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {panel.attentionNote && (
                <p className="mt-3 rounded-xl bg-sand px-3 py-2 text-sm"><strong className="font-medium">Pra validar:</strong> {panel.attentionNote}</p>
              )}
            </Card>
          )
        })}
      </div>
      <NewExamModal patientId={patientId} open={open} onClose={() => setOpen(false)} />
    </div>
  )
}

function NewExamModal({ patientId, open, onClose }: { patientId: string; open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [title, setTitle] = useState('Exames laboratoriais')
  const [date, setDate] = useState(todayIso())
  const [note, setNote] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const num = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')))

  const create = useMutation({
    mutationFn: () => api.post<ExamPanel>(`/patients/${patientId}/exams`, {
      collectedAt: date, title, attentionNote: note || null,
      results: rows.filter((r) => r.examName && r.value).map((r) => ({
        examName: r.examName, value: num(r.value), unit: r.unit, refMin: num(r.refMin), refMax: num(r.refMax),
      })),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exams', patientId] })
      setRows([]); setNote('')
      onClose()
    },
  })

  const add = (p?: (typeof presets)[number]) =>
    setRows((xs) => [...xs, { key: crypto.randomUUID(), value: '', examName: '', unit: '', refMin: '', refMax: '', ...p }])
  const upd = (key: string, patch: Partial<Row>) => setRows((xs) => xs.map((x) => (x.key === key ? { ...x, ...patch } : x)))

  return (
    <Modal open={open} onClose={onClose} title="Adicionar exames" wide>
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Título">{(id) => <Input id={id} value={title} onChange={(e) => setTitle(e.target.value)} />}</Field>
          <Field label="Data da coleta">{(id) => <Input id={id} type="date" value={date} onChange={(e) => setDate(e.target.value)} />}</Field>
        </div>
        <div>
          <p className="eyebrow mb-2">Atalhos</p>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p) => (
              <button key={p.examName} type="button" onClick={() => add(p)}
                      disabled={rows.some((r) => r.examName === p.examName)}
                      className="min-h-9 cursor-pointer rounded-full border border-line px-3 text-sm hover:border-olive/50 disabled:opacity-40">
                + {p.examName}
              </button>
            ))}
          </div>
        </div>
        <ul className="flex flex-col gap-2">
          {rows.map((r) => (
            <li key={r.key} className="grid grid-cols-2 gap-2 rounded-xl bg-paper/70 p-2 sm:grid-cols-[1.4fr_0.8fr_0.8fr_0.7fr_0.7fr_auto]">
              <Input aria-label="Exame" placeholder="Exame" value={r.examName} onChange={(e) => upd(r.key, { examName: e.target.value })} className="col-span-2 sm:col-span-1" />
              <Input aria-label="Resultado" placeholder="Resultado" inputMode="decimal" value={r.value} onChange={(e) => upd(r.key, { value: e.target.value })} />
              <Input aria-label="Unidade" placeholder="Unidade" value={r.unit} onChange={(e) => upd(r.key, { unit: e.target.value })} />
              <Input aria-label="Referência mínima" placeholder="Mín." inputMode="decimal" value={r.refMin} onChange={(e) => upd(r.key, { refMin: e.target.value })} />
              <Input aria-label="Referência máxima" placeholder="Máx." inputMode="decimal" value={r.refMax} onChange={(e) => upd(r.key, { refMax: e.target.value })} />
              <IconButton label="Remover linha" onClick={() => setRows((xs) => xs.filter((x) => x.key !== r.key))}><X className="size-4" /></IconButton>
            </li>
          ))}
        </ul>
        <Button variant="outline" icon={<Plus className="size-4" />} className="self-start" onClick={() => add()}>Outro exame</Button>
        <Field label="Pra validar (observação clínica)" hint="Ex.: ferritina baixa combina com o cansaço relatado; considerar fontes de ferro no almoço.">
          {(id) => <Textarea id={id} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />}
        </Field>
        <ErrorBox error={create.error} />
        <Button loading={create.isPending} disabled={!rows.some((r) => r.examName && r.value)} onClick={() => create.mutate()}>Salvar exames</Button>
      </div>
    </Modal>
  )
}
