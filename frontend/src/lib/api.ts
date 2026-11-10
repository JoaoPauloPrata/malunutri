import { supabase } from './supabase'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? ''

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token

  let res: Response
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'Sem conexão. Verifique sua internet e tente de novo.')
  }

  if (res.status === 204) return undefined as T
  if (!res.ok) {
    let message = 'Algo deu errado. Tente novamente.'
    try {
      const problem = await res.json()
      if (problem?.title) message = problem.title
      if (problem?.errors) message = Object.values(problem.errors).flat().join(' ')
    } catch {
      /* corpo vazio */
    }
    if (res.status === 401) message = 'Sua sessão expirou. Entre novamente.'
    if (res.status === 429) message = 'Muitas tentativas seguidas. Aguarde um minuto.'
    throw new ApiError(res.status, message)
  }
  return (await res.json()) as T
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  del: (path: string) => request<void>('DELETE', path),
}
