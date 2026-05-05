import type { UserRole } from '@/lib/types'
import { normalizePhoneDigits } from '@/lib/utils'

const OWNER_EMAIL = '467124450@qq.com'
const OWNER_PHONE = '15359150175'
const OWNER_NAMES = new Set(['yiming'])

type OwnerIdentity = {
  email?: string | null
  phone?: string | null
  name?: string | null
}

export function isConfiguredOwnerIdentity(identity: OwnerIdentity) {
  const email = identity.email?.trim().toLowerCase()
  const phone = identity.phone ? normalizePhoneDigits(identity.phone) : ''
  const name = identity.name?.trim().toLowerCase()

  return email === OWNER_EMAIL || phone === OWNER_PHONE || (!!name && OWNER_NAMES.has(name))
}

export function getInitialRoleForIdentity(identity: OwnerIdentity): UserRole {
  return isConfiguredOwnerIdentity(identity) ? 'super_admin' : 'teacher'
}
