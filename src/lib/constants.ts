import type { MealType, NotificationType, TicketStatus, UserRole } from '@/lib/types'

export const ADMIN_ROLES: UserRole[] = ['canteen_admin', 'repair_admin', 'super_admin']

export const ROLE_LABELS: Record<UserRole, string> = {
  teacher: '普通用户',
  canteen_admin: '报饭管理员',
  repair_admin: '后勤管理员',
  super_admin: '总管理员',
}

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
}

export const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  info: '通知',
  warning: '注意',
  urgent: '紧急',
}

export const TICKET_STATUS_LABELS: TicketStatus[] = ['待处理', '处理中', '已完成']

export function isAdminRole(role?: UserRole | null): boolean {
  return !!role && ADMIN_ROLES.includes(role)
}

export function canManageCanteen(role?: UserRole | null): boolean {
  return role === 'canteen_admin' || role === 'super_admin'
}

export function canManageRepair(role?: UserRole | null): boolean {
  return role === 'repair_admin' || role === 'super_admin'
}

export function canManageNotifications(role?: UserRole | null): boolean {
  return isAdminRole(role)
}

export function canManageUsers(role?: UserRole | null): boolean {
  return role === 'super_admin'
}
