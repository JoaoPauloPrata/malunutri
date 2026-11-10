import clsx from 'clsx'
import { LoaderCircle, X } from 'lucide-react'
import {
  useEffect, useId, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode,
  type SelectHTMLAttributes, type TextareaHTMLAttributes,
} from 'react'
import { initials } from '../lib/format'

// ---------------------------------------------------------------- Botões

type Variant = 'primary' | 'olive' | 'outline' | 'ghost' | 'danger'

const variants: Record<Variant, string> = {
  primary: 'bg-terracotta text-white hover:bg-terracotta-dark',
  olive: 'bg-olive text-white hover:bg-olive-deep',
  outline: 'border border-line bg-surface text-ink hover:border-olive/50 hover:bg-olive-soft/40',
  ghost: 'text-olive-deep hover:bg-olive-soft/60',
  danger: 'border border-terracotta/30 text-terracotta hover:bg-terracotta-soft',
}

export function Button({
  variant = 'primary', loading, icon, className, children, disabled, ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean; icon?: ReactNode }) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full px-5 text-sm font-medium tracking-wide',
        'transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        className,
      )}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  )
}

export function IconButton({
  label, className, children, ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      {...props}
      aria-label={label}
      title={label}
      className={clsx(
        'inline-flex size-11 cursor-pointer items-center justify-center rounded-full text-olive-deep transition-colors',
        'hover:bg-olive-soft/70 disabled:opacity-50',
        className,
      )}
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------- Layout

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={clsx('card p-5', className)}>{children}</section>
}

export function SectionTitle({ index, title, hint, badge }: { index?: number; title: string; hint?: string; badge?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-xl">
          {index != null && (
            <span className="inline-flex size-6 items-center justify-center rounded-full bg-olive text-xs font-sans text-white">
              {index}
            </span>
          )}
          {title}
        </h2>
        {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
      </div>
      {badge}
    </div>
  )
}

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'olive' | 'terracotta' | 'sage'; children: ReactNode }) {
  const tones = {
    neutral: 'bg-sand text-muted',
    olive: 'bg-olive-soft text-olive-deep',
    sage: 'bg-sage-soft text-olive-deep',
    terracotta: 'bg-terracotta-soft text-terracotta-dark',
  }
  return (
    <span className={clsx('inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[0.7rem] font-medium uppercase tracking-wider', tones[tone])}>
      {children}
    </span>
  )
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-14 text-lg' }[size]
  return (
    <span aria-hidden className={clsx('inline-flex shrink-0 items-center justify-center rounded-full bg-sage-soft font-medium text-olive-deep', s)}>
      {initials(name)}
    </span>
  )
}

export function Spinner({ label = 'Carregando' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-10 text-muted">
      <LoaderCircle className="size-5 animate-spin" aria-hidden />
      <span className="text-sm">{label}…</span>
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={clsx('animate-pulse rounded-xl bg-sand', className)} />
}

export function Empty({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      {icon && <div className="text-sage">{icon}</div>}
      <p className="font-display text-lg text-olive-deep">{title}</p>
      {children && <div className="max-w-sm text-sm text-muted">{children}</div>}
    </div>
  )
}

export function ErrorBox({ error }: { error: unknown }) {
  if (!error) return null
  const msg = error instanceof Error ? error.message : String(error)
  return (
    <p role="alert" className="rounded-xl bg-terracotta-soft px-4 py-3 text-sm text-terracotta-dark">
      {msg}
    </p>
  )
}

// ---------------------------------------------------------------- Formulário

export function Field({
  label, hint, error, children, className,
}: { label: string; hint?: string; error?: string; children: (id: string) => ReactNode; className?: string }) {
  const id = useId()
  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children(id)}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && <p className="text-xs text-terracotta-dark">{error}</p>}
    </div>
  )
}

const inputBase =
  'w-full rounded-xl border border-line bg-surface px-3.5 text-base text-ink placeholder:text-muted/70 transition-colors focus:border-olive focus:outline-none focus:ring-2 focus:ring-olive/20'

export const Input = ({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) => (
  <input {...p} className={clsx(inputBase, 'min-h-11', className)} />
)

export const Textarea = ({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...p} className={clsx(inputBase, 'py-2.5 leading-relaxed', className)} />
)

export const Select = ({ className, ...p }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...p} className={clsx(inputBase, 'min-h-11 cursor-pointer', className)} />
)

/** Grupo de opções em "pílulas" (check-in, filtros). */
export function Choice<T extends string | number>({
  options, value, onChange, label, tone = 'brown', multiple,
}: {
  options: { value: T; label: string }[]
  value: T | T[] | null
  onChange: (v: T) => void
  label: string
  tone?: 'brown' | 'olive'
  multiple?: boolean
}) {
  const selected = (v: T) => (Array.isArray(value) ? value.includes(v) : value === v)
  const on = tone === 'brown' ? 'bg-brown text-white border-brown' : 'bg-olive text-white border-olive'
  return (
    <div role={multiple ? 'group' : 'radiogroup'} aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role={multiple ? 'checkbox' : 'radio'}
          aria-checked={selected(o.value)}
          onClick={() => onChange(o.value)}
          className={clsx(
            'min-h-11 cursor-pointer rounded-full border px-4 text-sm transition-colors duration-150',
            selected(o.value) ? on : 'border-line bg-sand/60 text-ink hover:border-olive/40',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Tabs<T extends string>({
  tabs, value, onChange,
}: { tabs: { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={clsx(
            'min-h-11 shrink-0 cursor-pointer rounded-full px-4 text-sm transition-colors',
            value === t.value ? 'bg-olive-deep text-white' : 'text-muted hover:bg-sand hover:text-ink',
          )}
        >
          {t.label}
          {!!t.count && (
            <span className="ml-1.5 rounded-full bg-terracotta px-1.5 text-[0.7rem] text-white">{t.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------- Progresso

export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={max}
         className="h-2 w-full overflow-hidden rounded-full bg-line/70">
      <div className="h-full rounded-full bg-terracotta transition-[width] duration-500" style={{ width: `${pct}%` }} />
    </div>
  )
}

// ---------------------------------------------------------------- Modal (dialog nativo: foco preso + Esc)

export function Modal({
  open, onClose, title, children, wide,
}: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={clsx(
        'm-auto max-h-[92dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-3xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-ink/40',
        wide ? 'max-w-3xl' : 'max-w-lg',
      )}
    >
      {open && (
        <div className="p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-2xl">{title}</h2>
            <IconButton label="Fechar" onClick={onClose}>
              <X className="size-5" />
            </IconButton>
          </div>
          {children}
        </div>
      )}
    </dialog>
  )
}
