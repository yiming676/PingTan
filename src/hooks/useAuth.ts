'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiRequest, setAccessToken } from '@/lib/api/client'
import type { Profile } from '@/lib/types'

export interface AuthUser {
  id: string
  phone: string
  email: string | null
}

interface AuthResponse {
  token: string
  user: AuthUser
  profile: Profile
}

const AUTH_TIMEOUT_MS = 10000

function withTimeout<T>(request: Promise<T>, message = 'Request timed out'): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), AUTH_TIMEOUT_MS)
  })
  return Promise.race([request, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId)
  })
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const applyAuth = useCallback((auth: AuthResponse | null) => {
    if (!auth) {
      setAccessToken(null)
      setUser(null)
      setProfile(null)
      return
    }
    setAccessToken(auth.token)
    setUser(auth.user)
    setProfile(auth.profile)
  }, [])

  const refresh = useCallback(async () => {
    try {
      const auth = await withTimeout(apiRequest<AuthResponse>('/auth/me'), 'Auth check timed out')
      applyAuth(auth)
    } catch {
      applyAuth(null)
    } finally {
      setLoading(false)
    }
  }, [applyAuth])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [refresh])

  const signIn = async (identifier: string, password: string) => {
    try {
      const auth = await withTimeout(
        apiRequest<AuthResponse>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ identifier: identifier.trim(), password }),
        }),
        'Login request timed out'
      )
      applyAuth(auth)
      return { error: null }
    } catch (error) {
      return { error: error instanceof Error ? error : new Error('Login request failed') }
    }
  }

  const signUp = async (
    email: string,
    phone: string,
    password: string,
    metadata: { name: string; teacher_no?: string }
  ) => {
    try {
      const auth = await withTimeout(
        apiRequest<AuthResponse>('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            email: email || null,
            phone,
            password,
            name: metadata.name,
            teacher_no: metadata.teacher_no || null,
          }),
        }),
        'Registration request timed out'
      )
      applyAuth(auth)
      return { error: null }
    } catch (error) {
      return { error: error instanceof Error ? error : new Error('Registration request failed') }
    }
  }

  const signOut = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' })
    } finally {
      applyAuth(null)
    }
  }

  return { user, profile, loading, signIn, signUp, signOut, refresh }
}
