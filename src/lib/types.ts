// ============================================================
// TypeScript 类型定义
// ============================================================

export type UserRole = 'teacher' | 'canteen_admin' | 'repair_admin' | 'super_admin'

export interface Profile {
  id: string
  teacher_no: string | null
  name: string
  email: string | null
  phone: string | null
  role: UserRole
  avatar_url: string | null
  created_at: string
}

export interface MealMenu {
  id: string
  date: string
  meal_type: 'breakfast' | 'lunch' | 'dinner'
  items: string[]
  description: string | null
  image_url: string | null
  image_path: string | null
  time_range: string | null
  booking_status: 'open' | 'closed'
  created_at: string
  updated_at: string
}

export interface SelectedMealItem {
  name: string
  quantity: number
}

export interface MealBooking {
  id: string
  user_id: string
  menu_id: string
  date: string
  meal_type: 'breakfast' | 'lunch' | 'dinner'
  selected_items: SelectedMealItem[]
  status: 'booked' | 'cancelled'
  created_at: string
  updated_at: string
}

export interface RepairTicket {
  id: string
  user_id: string
  fault_type: FaultType
  location: string
  description: string
  status: TicketStatus
  result_text: string | null
  result_image_url: string | null
  result_image_path: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface RepairImage {
  id: string
  ticket_id: string
  image_url: string
  storage_path: string
  created_at: string
}

export interface Notification {
  id: string
  title: string
  content: string
  type: 'info' | 'warning' | 'urgent'
  target_user_id: string | null
  created_at: string
}

export type FaultType = '水电门窗' | '多媒体' | '空调' | '其他'
export type MealType = 'breakfast' | 'lunch' | 'dinner'
export type TicketStatus = '待处理' | '处理中' | '已完成'
export type NotificationType = 'info' | 'warning' | 'urgent'

export interface UploadedImage {
  url: string
  path: string
}

export interface BookingWithProfile extends MealBooking {
  profiles?: Pick<Profile, 'name' | 'phone' | 'email'> | null
}
