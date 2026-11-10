import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Send } from 'lucide-react'
import { useState } from 'react'
import { NoteCard, ProgressSummary } from '../../../components/ProgressWidgets'
import { useToast } from '../../../components/Toast'
import { Badge, Button, Card, Empty, ErrorBox, Spinner, Textarea } from '../../../components/ui'
import { api } from '../../../lib/api'
import { dateOnly, dateTime, hardestLabel, hungerLabel, kg, n, sleepLabel } from '../../../lib/format'
import type { CheckIn, Note, Progress } from '../../../lib/types'

export function ProgressTab({ patientId }: { patientId: string }) {
  const qc = useQueryClient()
  const toast = useToast()
  const progress = useQuery({ queryKey: ['progress', patientId], queryFn: () => api.get<Progress>(`/patients/${patientId}/progress`) })
  const checkIns = useQuery({ queryKey: ['check-ins', patientId], queryFn: () => api.get<CheckIn[]>(`/patients/${patientId}/check-ins`) })
  const notes = useQuery({ queryKey: ['notes', patientId], queryFn: () => api.get<Note[]>(`/patients/${patientId}/notes`) })
  const [draft, setDraft] = useState('')

  const review = useMutation({
    mutationFn: (id: string) => api.post<CheckIn>(`/check-ins/${id}/review`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['check-ins', patientId] })
      qc.invalidateQueries({ queryKey: ['today'] })
      qc.invalidateQueries({ queryKey: ['patients'] })
    },
  })
  const write = useMutation({
    mutationFn: () => api.post<Note>(`/patients/${patientId}/notes`, { body: draft }),
    onSuccess: () => {
      setDraft('')
      qc.invalidateQueries({ queryKey: ['notes', patientId] })
      qc.invalidateQueries({ queryKey: ['progress', patientId] })
      toast('Recado enviado para o app.')
    },
  })

  return (
    <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
      <div className="flex flex-col gap-4">
        <Card>
          <h3 className="mb-3 text-xl">Evolução</h3>
          {progress.isPending ? <Spinner /> : progress.error ? <ErrorBox error={progress.error} /> :
            progress.data.checkInCount === 0 ? <Empty title="Sem check-ins ainda">Quando o paciente enviar o check-in semanal pelo app, a evolução aparece aqui.</Empty> :
              <ProgressSummary progress={progress.data} />}
        </Card>

        <Card>
          <h3 className="mb-3 text-xl">Check-ins semanais</h3>
          {checkIns.data?.length === 0 && <p className="text-sm text-muted">Nenhum check-in.</p>}
          <ul className="flex flex-col gap-3">
            {checkIns.data?.map((c) => (
              <li key={c.id} className="rounded-2xl border border-line p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">Semana de {dateOnly(c.weekStart, { day: '2-digit', month: 'long' })}</p>
                  {c.reviewedAt ? <Badge tone="sage">lido</Badge> : (
                    <Button variant="ghost" className="!min-h-9 !px-3" icon={<Check className="size-4" />}
                            loading={review.isPending && review.variables === c.id} onClick={() => review.mutate(c.id)}>
                      Marcar como lido
                    </Button>
                  )}
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
                  <div><dt className="text-muted">Adesão</dt><dd>{c.adherence}/5</dd></div>
                  <div><dt className="text-muted">Fome</dt><dd>{hungerLabel[c.hunger]}</dd></div>
                  <div><dt className="text-muted">Sono</dt><dd>{sleepLabel[c.sleep]}</dd></div>
                  <div><dt className="text-muted">Peso</dt><dd>{kg(c.weightKg)}{c.waistCm != null && ` · ${n(c.waistCm)} cm`}</dd></div>
                </dl>
                {c.hardest.length > 0 && (
                  <p className="mt-2 text-sm"><span className="text-muted">Mais difícil:</span> {c.hardest.map((h) => hardestLabel[h]).join(', ')}</p>
                )}
                {c.comment && <p className="mt-2 rounded-xl bg-sand/70 px-3 py-2 text-sm italic">“{c.comment}”</p>}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <h3 className="mb-1 text-xl">Recado para o app</h3>
          <p className="mb-3 text-sm text-muted">Aparece na tela de evolução do paciente, com a sua letra.</p>
          <Textarea aria-label="Recado" rows={4} maxLength={2000} value={draft} onChange={(e) => setDraft(e.target.value)}
                    placeholder="Você manteve o almoço até nas semanas de viagem. Agora a gente ajusta o lanche da tarde." />
          <ErrorBox error={write.error} />
          <Button className="mt-3 w-full" icon={<Send className="size-4" />} disabled={!draft.trim()} loading={write.isPending}
                  onClick={() => write.mutate()}>Enviar recado</Button>
        </Card>
        {notes.data?.map((note) => (
          <div key={note.id}>
            <NoteCard author="Malu" body={note.body} />
            <p className="mt-1 px-1 text-xs text-muted">
              {dateTime(note.createdAt, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              {note.readAt ? ' · lido' : ' · ainda não lido'}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
