import clsx from 'clsx'
import { dateOnly, kg, n, signed } from '../lib/format'
import type { Progress } from '../lib/types'

/** Linha de peso semanal (S1…Sn), no estilo do card "PESO" do relatório. */
export function WeightChart({ points }: { points: Progress['points'] }) {
  const data = points.filter((p) => p.weightKg != null) as { weekStart: string; weightKg: number }[]
  if (data.length < 2) {
    return <p className="py-6 text-center text-sm text-muted">O gráfico aparece a partir do segundo check-in com peso.</p>
  }

  const W = 320, H = 120, padX = 12, padY = 14
  const ws = data.map((d) => d.weightKg)
  const min = Math.min(...ws), max = Math.max(...ws)
  const span = max - min || 1
  const x = (i: number) => padX + (i * (W - padX * 2)) / (data.length - 1)
  const y = (v: number) => padY + ((max - v) * (H - padY * 2)) / span
  const path = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.weightKg).toFixed(1)}`).join(' ')
  const summary = `Peso de ${kg(data[0].weightKg)} em ${dateOnly(data[0].weekStart)} para ${kg(data.at(-1)!.weightKg)} em ${dateOnly(data.at(-1)!.weekStart)}`

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H + 18}`} role="img" aria-label={summary} className="w-full">
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={padX} x2={W - padX} y1={padY + f * (H - padY * 2)} y2={padY + f * (H - padY * 2)}
                stroke="var(--color-line)" strokeWidth="1" />
        ))}
        <path d={path} fill="none" stroke="var(--color-terracotta)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (
          <g key={d.weekStart}>
            <circle cx={x(i)} cy={y(d.weightKg)} r={i === data.length - 1 ? 4 : 2.5} fill="var(--color-terracotta)">
              <title>{`${dateOnly(d.weekStart)}: ${kg(d.weightKg)}`}</title>
            </circle>
            <text x={x(i)} y={H + 14} textAnchor="middle" fontSize="9" fill="var(--color-muted)" fontFamily="Jost">
              S{i + 1}
            </text>
          </g>
        ))}
      </svg>
    </figure>
  )
}

export function ProgressSummary({ progress, compact }: { progress: Progress; compact?: boolean }) {
  return (
    <div className={clsx('grid gap-3', compact ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-3')}>
      <div className={clsx('rounded-2xl bg-sand/70 p-4', compact && 'col-span-2')}>
        <div className="flex items-baseline justify-between gap-2">
          <p className="eyebrow">Peso</p>
          {progress.weightChangeKg != null && (
            <p className="text-sm font-medium text-terracotta-dark">
              {signed(progress.weightChangeKg, 'kg')} em {progress.weeks} sem.
            </p>
          )}
        </div>
        <p className="mt-1 font-display text-3xl text-ink">{kg(progress.currentWeightKg)}</p>
        <div className="mt-2">
          <WeightChart points={progress.points} />
        </div>
      </div>
      <div className="rounded-2xl bg-sand/70 p-4">
        <p className="text-sm font-medium">Cintura</p>
        <p className="mt-1 font-display text-2xl">{signed(progress.waistChangeCm, 'cm')}</p>
      </div>
      <div className="rounded-2xl bg-sand/70 p-4">
        <p className="text-sm font-medium">Check-ins</p>
        <p className="mt-1 font-display text-2xl">
          {progress.checkInCount} <span className="text-base text-muted">de {Math.max(progress.weeks, progress.checkInCount)}</span>
        </p>
        {progress.avgAdherence != null && <p className="text-xs text-muted">adesão média {n(progress.avgAdherence)}/5</p>}
      </div>
    </div>
  )
}

/** Recado escrito à mão, como no card marrom do relatório. */
export function NoteCard({ author, body }: { author: string; body: string }) {
  return (
    <figure className="rounded-2xl bg-brown p-5 text-white">
      <figcaption className="eyebrow !text-highlight/90">Recado da {author}</figcaption>
      <blockquote className="mt-2 font-hand text-2xl leading-snug">{body}</blockquote>
    </figure>
  )
}
