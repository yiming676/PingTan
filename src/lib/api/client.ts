let accessToken: string | null = null

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:8000'
}

async function parseBody(response: Response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function redirectToLogin() {
  if (typeof window === 'undefined') return
  if (window.location.pathname === '/login') return
  window.location.assign('/login')
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  options?: { redirectOnUnauthorized?: boolean },
): Promise<T> {
  const headers = new Headers(init.headers)
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers,
    credentials: 'include',
    cache: 'no-store',
  })
  const body = await parseBody(response)

  if (!response.ok) {
    if (response.status === 401) {
      setAccessToken(null)
      if (options?.redirectOnUnauthorized !== false) {
        redirectToLogin()
      }
    }
    const message = typeof body === 'object' && body
      ? String((body as { detail?: unknown; error?: unknown }).detail || (body as { error?: unknown }).error || 'Request failed')
      : 'Request failed'
    throw new ApiError(message, response.status)
  }

  return body as T
}

export async function apiUpload<T>(path: string, file: File): Promise<T> {
  const body = new FormData()
  body.append('file', file)
  return apiRequest<T>(path, { method: 'POST', body })
}
