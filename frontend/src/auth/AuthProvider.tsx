import type { Session } from '@supabase/supabase-js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '../lib/api'
import { supabase } from '../lib/supabase'
import type { Me } from '../lib/types'

interface AuthState {
  session: Session | null
  ready: boolean
  me: Me | undefined
  meError: Error | null
  meLoading: boolean
  /** Chegou por link de convite/recuperação: precisa definir senha. */
  needsPassword: boolean
  clearNeedsPassword: () => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

// O link do e-mail do Supabase traz "type=invite" ou "type=recovery" no hash;
// lemos antes do cliente consumir a URL.
const linkType = new URLSearchParams(window.location.hash.slice(1)).get('type')

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [needsPassword, setNeedsPassword] = useState(linkType === 'invite' || linkType === 'recovery')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'PASSWORD_RECOVERY') setNeedsPassword(true)
      if (event === 'SIGNED_OUT') qc.clear()
    })
    return () => sub.subscription.unsubscribe()
  }, [qc])

  const meQuery = useQuery({
    queryKey: ['me', session?.user.id],
    queryFn: () => api.get<Me>('/me'),
    enabled: !!session,
    staleTime: Infinity,
    retry: 1,
  })

  const value: AuthState = {
    session,
    ready,
    me: meQuery.data,
    meError: meQuery.error,
    meLoading: !!session && meQuery.isPending,
    needsPassword,
    clearNeedsPassword: () => setNeedsPassword(false),
    signOut: async () => {
      await supabase.auth.signOut()
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth fora do AuthProvider')
  return ctx
}
