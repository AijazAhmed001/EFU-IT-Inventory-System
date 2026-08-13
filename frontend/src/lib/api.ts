export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5002/api').replace(/\/$/, '')

export interface User {
  id: string
  name: string
  email: string
  role: string
  status: string
  employeeCode?: string | null
  phone?: string | null
  departmentId?: string | null
  locationId?: string | null
  department?: string | null
  location?: string | null
  lastLoginAt?: string | null
  permissions?: string[]
}

export interface Session {
  accessToken: string
  refreshToken: string
  expiresAt: string
  user: User
}

export interface PageMeta {
  page: number
  limit: number
  total: number
  totalPages?: number
}

interface ApiEnvelope<T> {
  success: boolean
  data: T
  message?: string
  errors?: Record<string, string[]>
  meta?: PageMeta
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors?: Record<string, string[]>,
  ) {
    super(message)
  }
}

let refreshPromise: Promise<Session | null> | null = null
const REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 15000)

function sessionStore() {
  return localStorage.getItem('efu.session') ? localStorage : sessionStorage
}

function decodeError<T>(response: Response, payload: ApiEnvelope<T> | null) {
  const validation = payload?.errors
    ? Object.values(payload.errors).flat().join(' ')
    : ''
  return new ApiError(
    validation || payload?.message || (response.status === 403
      ? 'You do not have permission to perform this action. Ask a Super Admin to review your assigned work.'
      : response.status === 401
        ? 'Your session has expired. Please sign in again.'
        : `Request failed with status ${response.status}`),
    response.status,
    payload?.errors,
  )
}

async function refreshSession(): Promise<Session | null> {
  const current = loadSession(false)
  if (!current?.refreshToken) return null
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: current.refreshToken }),
      signal: controller.signal,
    })
    const payload = (await response.json().catch(() => null)) as ApiEnvelope<Partial<Session>> | null
    if (!response.ok || !payload?.success || !payload.data.accessToken || !payload.data.refreshToken) {
      clearSession()
      return null
    }
    const next: Session = {
      ...current,
      accessToken: payload.data.accessToken,
      refreshToken: payload.data.refreshToken,
      expiresAt: payload.data.expiresAt || current.expiresAt,
    }
    saveSession(next, sessionStore() === localStorage)
    return next
  } catch {
    clearSession()
    return null
  } finally {
    window.clearTimeout(timeoutId)
  }
}

async function requestEnvelope<T>(
  path: string,
  init: RequestInit = {},
  authenticated = true,
  retry = true,
): Promise<ApiEnvelope<T>> {
  const session = authenticated ? loadSession(false) : null
  const headers = new Headers(init.headers)
  if (init.body != null && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  if (session?.accessToken) headers.set('Authorization', `Bearer ${session.accessToken}`)

  const timeoutController = new AbortController()
  const timeoutId = window.setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT_MS)
  const onAbort = () => timeoutController.abort()
  init.signal?.addEventListener('abort', onAbort, { once: true })

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers, signal: timeoutController.signal })
  } catch (error) {
    if (init.signal?.aborted) throw error
    const message = timeoutController.signal.aborted
      ? 'The server took too long to respond. Please try again.'
      : 'Unable to reach the server. Check that the backend is running.'
    throw new ApiError(message, 0)
  } finally {
    window.clearTimeout(timeoutId)
    init.signal?.removeEventListener('abort', onAbort)
  }

  if (response.status === 401 && authenticated && retry) {
    refreshPromise ??= refreshSession().finally(() => { refreshPromise = null })
    if (await refreshPromise) return requestEnvelope<T>(path, init, authenticated, false)
    window.dispatchEvent(new CustomEvent('efu:unauthorized'))
  }

  if (response.ok && response.status === 204) {
    return { success: true, data: undefined as T }
  }

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null
  if (!response.ok) throw decodeError(response, payload)
  if (!payload?.success) throw new ApiError(payload?.message || 'The server returned an invalid response.', response.status)
  return payload
}

async function request<T>(path: string, init: RequestInit = {}, authenticated = true): Promise<T> {
  return (await requestEnvelope<T>(path, init, authenticated)).data
}

const json = (value: unknown) => JSON.stringify(value)

export const authApi = {
  login: (email: string, password: string) =>
    request<Session>('/auth/login', { method: 'POST', body: json({ email, password }) }, false),
  me: () => request<User>('/auth/me'),
  updateProfile: (body: Partial<User>) =>
    request<User>('/auth/me', { method: 'PATCH', body: json(body) }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<void>('/auth/change-password', { method: 'POST', body: json({ currentPassword, newPassword }) }),
  forgotPassword: (email: string) =>
    request<{ resetToken?: string }>('/auth/forgot-password', { method: 'POST', body: json({ email }) }, false),
  resetPassword: (token: string, newPassword: string) =>
    request<void>('/auth/reset-password', { method: 'POST', body: json({ token, newPassword }) }, false),
  logout: (session: Session) =>
    request<void>('/auth/logout', { method: 'POST', body: json({ refreshToken: session.refreshToken }) }),
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal }),
  getPage: async <T>(path: string, signal?: AbortSignal) => {
    const result = await requestEnvelope<T[]>(path, { signal })
    return { data: result.data, meta: result.meta as PageMeta }
  },
  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: json(body) }),
  upload: <T>(path: string, body: FormData) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: json(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: json(body) }),
  delete: (path: string) => requestEnvelope<never>(path, { method: 'DELETE' }).then(() => undefined),
}

export function loadSession(checkExpiry = true): Session | null {
  const raw = localStorage.getItem('efu.session') || sessionStorage.getItem('efu.session')
  if (!raw) return null
  try {
    const session = JSON.parse(raw) as Session
    if (!session.accessToken || !session.refreshToken) {
      clearSession()
      return null
    }
    if (checkExpiry && Date.parse(session.expiresAt) <= Date.now()) {
      // Keep refresh credentials available; the first protected request refreshes them.
      return session
    }
    return session
  } catch {
    clearSession()
    return null
  }
}

export function saveSession(session: Session, remember: boolean) {
  clearSession()
  ;(remember ? localStorage : sessionStorage).setItem('efu.session', JSON.stringify(session))
}

export function updateStoredUser(user: User) {
  const session = loadSession(false)
  if (session) saveSession({ ...session, user }, sessionStore() === localStorage)
}

export function clearSession() {
  localStorage.removeItem('efu.session')
  sessionStorage.removeItem('efu.session')
}
