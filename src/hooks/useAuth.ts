'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fetchProfile as getProfile } from '@/lib/services/campus'
import type { Profile } from '@/lib/types'
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'

const AUTH_TIMEOUT_MS = 10000

function withTimeout<T>(request: T, message = 'Request timed out'): Promise<Awaited<T>> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), AUTH_TIMEOUT_MS)
  })

  return Promise.race([Promise.resolve(request), timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId)
  }) as Promise<Awaited<T>>
}

async function postAuthApi<T>(path: string, payload: Record<string, unknown>) {
  const response = await withTimeout(
    fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
    'Auth server request timed out'
  )
  const body = (await response.json().catch(() => ({}))) as Partial<T> & { error?: string }

  if (!response.ok) {
    throw new Error(body.error || 'Auth server request failed')
  }

  return body as T
}

async function fetchAuthProfile() {
  const response = await withTimeout(
    fetch('/api/auth/profile', { cache: 'no-store' }),
    'Profile server request timed out'
  )

  if (response.status === 401) return null

  const body = (await response.json().catch(() => ({}))) as {
    profile?: Profile | null
    error?: string
  }

  if (!response.ok) {
    throw new Error(body.error || 'Profile server request failed')
  }

  return body.profile ?? null
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { profile, error } = await withTimeout(getProfile(supabase, userId), 'Profile request timed out')
      if (!error && profile) {
        setProfile(profile)
        return
      }
    } catch {
      // Fall back to the server endpoint below.
    }

    try {
      setProfile(await fetchAuthProfile())
    } catch {
      setProfile(null)
    }
  }, [supabase])

  useEffect(() => {
    const getSession = async () => {
      try {
        const {
          data: { user },
          error,
        } = await withTimeout(supabase.auth.getUser(), 'Auth check timed out')

        if (error) {
          setUser(null)
          setProfile(null)
          return
        }

        setUser(user)
        if (user) {
          await fetchProfile(user.id)
        } else {
          setProfile(null)
        }
      } catch {
        setUser(null)
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        const nextUser = session?.user ?? null
        setUser(nextUser)

        try {
          if (nextUser) {
            await fetchProfile(nextUser.id)
          } else {
            setProfile(null)
          }
        } catch {
          setProfile(null)
        } finally {
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase, fetchProfile])

  const signIn = async (identifier: string, password: string) => {
    try {
      const { email } = await postAuthApi<{ email: string }>('/api/auth/resolve-login', {
        identifier: identifier.trim(),
      })
      const { error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        'Login request timed out'
      )
      return { error }
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
      const { email: authEmail } = await postAuthApi<{ email: string }>('/api/auth/register', {
        email,
        phone,
        password,
        name: metadata.name,
        teacher_no: metadata.teacher_no || '',
      })
      const { error } = await withTimeout(
        supabase.auth.signInWithPassword({ email: authEmail, password }),
        'Registration request timed out'
      )
      return { error }
    } catch (error) {
      return { error: error instanceof Error ? error : new Error('Registration request failed') }
    }
  }

  const signOut = async () => {
    try {
      await withTimeout(supabase.auth.signOut(), 'Sign out request timed out')
    } finally {
      setUser(null)
      setProfile(null)
    }
  }

  return { user, profile, loading, signIn, signUp, signOut }
}
