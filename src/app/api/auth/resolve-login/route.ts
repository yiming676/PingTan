import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isEmailIdentifier, normalizePhoneDigits } from '@/lib/utils'

const INTERNAL_AUTH_DOMAIN = 'auth.pingtan.local'

type ResolveLoginBody = {
  identifier?: unknown
}

async function findProfileByPhone(phone: string) {
  const supabase = createAdminClient()
  const { data: exactProfile, error: exactError } = await supabase
    .from('profiles')
    .select('email, phone, created_at')
    .eq('phone', phone)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (exactError) throw exactError
  if (exactProfile) return exactProfile

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('email, phone, created_at')
    .not('phone', 'is', null)
    .order('created_at', { ascending: true })

  if (error) throw error

  return profiles?.find((profile) => normalizePhoneDigits(profile.phone ?? '') === phone) ?? null
}

export async function POST(request: Request) {
  let body: ResolveLoginBody

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const identifier = typeof body.identifier === 'string' ? body.identifier.trim() : ''
  if (!identifier) {
    return NextResponse.json({ error: 'Identifier is required' }, { status: 400 })
  }

  if (isEmailIdentifier(identifier)) {
    return NextResponse.json({ email: identifier })
  }

  const phone = normalizePhoneDigits(identifier)
  if (!/^1\d{10}$/.test(phone)) {
    return NextResponse.json({ error: 'Phone number must be 11 digits' }, { status: 400 })
  }

  try {
    const data = await findProfileByPhone(phone)

    if (!data) {
      return NextResponse.json({ error: 'No account is bound to this phone number' }, { status: 404 })
    }

    return NextResponse.json({
      email: data.email || `${phone}@${INTERNAL_AUTH_DOMAIN}`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login lookup failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
