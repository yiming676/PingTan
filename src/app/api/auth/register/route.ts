import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getInitialRoleForIdentity } from '@/lib/adminOwner'
import { isEmailIdentifier, normalizePhoneDigits } from '@/lib/utils'

const INTERNAL_AUTH_DOMAIN = 'auth.pingtan.local'

type RegisterBody = {
  email?: unknown
  phone?: unknown
  password?: unknown
  name?: unknown
  teacher_no?: unknown
}

async function phoneExists(phone: string) {
  const supabase = createAdminClient()
  const { data: exactProfile, error: exactError } = await supabase
    .from('profiles')
    .select('id')
    .eq('phone', phone)
    .limit(1)
    .maybeSingle()

  if (exactError) throw exactError
  if (exactProfile) return true

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('phone')
    .not('phone', 'is', null)

  if (error) throw error

  return profiles?.some((profile) => normalizePhoneDigits(profile.phone ?? '') === phone) ?? false
}

export async function POST(request: Request) {
  let body: RegisterBody

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const rawEmail = typeof body.email === 'string' ? body.email.trim() : ''
  const rawPhone = typeof body.phone === 'string' ? body.phone.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const teacherNo = typeof body.teacher_no === 'string' ? body.teacher_no.trim() : ''
  const phone = rawPhone ? normalizePhoneDigits(rawPhone) : ''

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  if (!rawEmail && !phone) {
    return NextResponse.json({ error: 'Email or phone is required' }, { status: 400 })
  }

  if (rawEmail && !isEmailIdentifier(rawEmail)) {
    return NextResponse.json({ error: 'Email is invalid' }, { status: 400 })
  }

  if (phone && !/^1\d{10}$/.test(phone)) {
    return NextResponse.json({ error: 'Phone number must be 11 digits' }, { status: 400 })
  }

  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }

  const authEmail = rawEmail || `${phone}@${INTERNAL_AUTH_DOMAIN}`
  const profileEmail = rawEmail || null
  const initialRole = getInitialRoleForIdentity({ email: rawEmail, phone, name })

  try {
    const supabase = createAdminClient()

    if (phone) {
      if (await phoneExists(phone)) {
        return NextResponse.json({ error: 'Phone number is already bound to another account' }, { status: 409 })
      }
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        email: profileEmail,
        phone,
        teacher_no: teacherNo,
      },
    })

    if (error || !data.user) {
      return NextResponse.json({ error: error?.message ?? 'Registration failed' }, { status: 400 })
    }

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: data.user.id,
      name,
      email: profileEmail,
      phone: phone || null,
      teacher_no: teacherNo || null,
      role: initialRole,
    })

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    return NextResponse.json({ email: authEmail })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
