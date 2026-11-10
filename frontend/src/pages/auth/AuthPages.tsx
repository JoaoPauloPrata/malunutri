import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { Button, ErrorBox, Field, Input } from '../../components/ui'
import { Brand } from '../../layouts/Layouts'
import { supabase } from '../../lib/supabase'

function AuthShell({ title, subtitle, children }: { title: ReactNode; subtitle: string; children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10">
      {/* formas orgânicas, como nos posts */}
      <div aria-hidden className="absolute -top-24 -left-24 size-72 rounded-full bg-sage-soft/70" />
      <div aria-hidden className="absolute -right-20 -bottom-28 size-80 rounded-full bg-olive-soft" />
      <div className="card relative w-full max-w-sm p-7">
        <Brand className="mb-8 text-center" />
        <h1 className="text-3xl leading-tight">{title}</h1>
        <p className="mt-1 mb-6 text-sm text-muted">{subtitle}</p>
        {children}
      </div>
    </div>
  )
}

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'forgot'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) setError(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message)
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/definir-senha`,
      })
      if (error) setError(error.message)
      else setSent(true)
    }
    setLoading(false)
  }

  return (
    <AuthShell
      title={mode === 'login' ? <>Oi, <em>que bom</em> te ver.</> : 'Recuperar senha'}
      subtitle={mode === 'login' ? 'Entre com o e-mail cadastrado pela sua nutricionista.' : 'Enviaremos um link para você criar uma nova senha.'}
    >
      {sent ? (
        <p role="status" className="rounded-xl bg-olive-soft px-4 py-3 text-sm text-olive-deep">
          Pronto! Se este e-mail estiver cadastrado, você vai receber o link em instantes.
        </p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="E-mail">
            {(id) => <Input id={id} type="email" autoComplete="email" inputMode="email" required value={email}
                            onChange={(e) => setEmail(e.target.value)} />}
          </Field>
          {mode === 'login' && (
            <Field label="Senha">
              {(id) => <Input id={id} type="password" autoComplete="current-password" required value={password}
                              onChange={(e) => setPassword(e.target.value)} />}
            </Field>
          )}
          <ErrorBox error={error} />
          <Button type="submit" loading={loading} className="mt-1 w-full">
            {mode === 'login' ? 'Entrar' : 'Enviar link'}
          </Button>
        </form>
      )}
      <button
        type="button"
        onClick={() => { setMode(mode === 'login' ? 'forgot' : 'login'); setError(null); setSent(false) }}
        className="mt-5 min-h-11 w-full cursor-pointer text-sm text-olive-deep underline-offset-4 hover:underline"
      >
        {mode === 'login' ? 'Esqueci minha senha' : 'Voltar para o login'}
      </button>
    </AuthShell>
  )
}

/** Convite aceito ou link de recuperação: define a senha de acesso. */
export function SetPasswordPage() {
  const { clearNeedsPassword, session } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 8) return setError('Use pelo menos 8 caracteres.')
    if (password !== confirm) return setError('As senhas não conferem.')
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) return setError(error.message)
    clearNeedsPassword()
    navigate('/', { replace: true })
  }

  if (!session) {
    return (
      <AuthShell title="Link expirado" subtitle="Peça um novo convite para sua nutricionista ou recupere a senha.">
        <Button className="w-full" onClick={() => navigate('/entrar')}>Ir para o login</Button>
      </AuthShell>
    )
  }

  return (
    <AuthShell title={<>Crie sua <em>senha</em>.</>} subtitle="Você vai usar este e-mail e senha para entrar no app.">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Nova senha" hint="Mínimo de 8 caracteres.">
          {(id) => <Input id={id} type="password" autoComplete="new-password" required value={password}
                          onChange={(e) => setPassword(e.target.value)} />}
        </Field>
        <Field label="Confirme a senha">
          {(id) => <Input id={id} type="password" autoComplete="new-password" required value={confirm}
                          onChange={(e) => setConfirm(e.target.value)} />}
        </Field>
        <ErrorBox error={error} />
        <Button type="submit" loading={loading} className="w-full">Salvar e entrar</Button>
      </form>
    </AuthShell>
  )
}
