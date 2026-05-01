'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fetchProfile as getProfile, resolveLoginEmail } from '@/lib/services/campus'
import { formatPhoneForDisplay, isEmailIdentifier } from '@/lib/utils'
import type { Profile } from '@/lib/types'
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchProfile = useCallback(async (userId: string) => {
    const { profile } = await getProfile(supabase, userId)
    setProfile(profile)
  }, [supabase])

  useEffect(() => {
    const getSession = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        await fetchProfile(user.id)
      }
      setLoading(false)
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase, fetchProfile])

  const signIn = async (identifier: string, password: string) => {
    const login = identifier.trim()
    const { email: resolvedEmail, error: resolveError } = await resolveLoginEmail(supabase, login)
    if (resolveError && !isEmailIdentifier(login)) return { error: resolveError }

    const authEmail = resolvedEmail ?? (isEmailIdentifier(login) ? login : null)
    if (!authEmail) {
      return { error: new Error('未找到该手机号绑定的账号') }
    }

    const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password })
    return { error }
  }

  const signUp = async (
    email: string,
    phone: string,
    password: string,
    metadata: { name: string; teacher_no?: string }
  ) => {
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          name: metadata.name,
          email: email.trim(),
          phone: formatPhoneForDisplay(phone),
          teacher_no: metadata.teacher_no || '',
        },
      },
    })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  return { user, profile, loading, signIn, signUp, signOut }
}
