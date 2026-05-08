import { apiRequest, apiUpload } from '@/lib/api/client'
import type {
  BookingWithProfile,
  MealBooking,
  MealMenu,
  MealType,
  Notification,
  NotificationType,
  Profile,
  RepairTicket,
  SelectedMealItem,
  TicketStatus,
  UploadedImage,
  UserRole,
} from '@/lib/types'

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error('Request failed')
}

export async function fetchProfile(_userId?: string) {
  try {
    const data = await apiRequest<{ profile: Profile }>('/auth/me')
    return { profile: data.profile ?? null, error: null }
  } catch (error) {
    return { profile: null, error: toError(error) }
  }
}

export async function updateOwnProfile(payload: { name: string; phone: string }) {
  try {
    const profile = await apiRequest<Profile>('/profile/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    return { profile, error: null }
  } catch (error) {
    return { profile: null, error: toError(error) }
  }
}

export async function fetchMenusForDate(date: string) {
  try {
    const menus = await apiRequest<MealMenu[]>(`/meal-menus?date=${encodeURIComponent(date)}`)
    return { menus, error: null }
  } catch (error) {
    return { menus: [], error: toError(error) }
  }
}

export async function fetchBookingsForDate(_userId: string, date: string) {
  try {
    const bookings = await apiRequest<MealBooking[]>(`/meal-bookings?date=${encodeURIComponent(date)}`)
    return { bookings, error: null }
  } catch (error) {
    return { bookings: [], error: toError(error) }
  }
}

export async function bookMeal(
  _userId: string,
  menu: MealMenu,
  date: string,
  selectedItems: SelectedMealItem[]
) {
  if (menu.booking_status !== 'open') {
    return { error: new Error('该餐次已停止报饭') }
  }

  const cleanItems = selectedItems
    .map((item) => ({
      name: item.name.trim(),
      quantity: Math.max(0, Math.floor(Number(item.quantity) || 0)),
    }))
    .filter((item) => item.name && item.quantity > 0)

  if (cleanItems.length === 0) {
    return { error: new Error('At least one meal item is required') }
  }

  try {
    await apiRequest<MealBooking>('/meal-bookings', {
      method: 'POST',
      body: JSON.stringify({
        menu_id: menu.id,
        date,
        meal_type: menu.meal_type,
        selected_items: cleanItems,
      }),
    })
    return { error: null }
  } catch (error) {
    return { error: toError(error) }
  }
}

export async function cancelMealBooking(bookingId: string) {
  try {
    await apiRequest<MealBooking>(`/meal-bookings/${bookingId}/cancel`, { method: 'PATCH' })
    return { error: null }
  } catch (error) {
    return { error: toError(error) }
  }
}

export async function fetchRecentBookings(_userId: string, limit = 5) {
  try {
    const bookings = await apiRequest<MealBooking[]>(`/meal-bookings/recent?limit=${limit}`)
    return { bookings, error: null }
  } catch (error) {
    return { bookings: [], error: toError(error) }
  }
}

export async function fetchNotifications(limit = 20) {
  try {
    const notifications = await apiRequest<Notification[]>(`/notifications?limit=${limit}`)
    return { notifications, error: null }
  } catch (error) {
    return { notifications: [], error: toError(error) }
  }
}

export async function fetchUnreadNotificationCount() {
  try {
    const data = await apiRequest<{ count: number }>('/notifications/unread-count')
    return { count: Number(data.count ?? 0), error: null }
  } catch (error) {
    return { count: 0, error: toError(error) }
  }
}

export async function markNotificationsRead(notificationIds: string[]) {
  const ids = Array.from(new Set(notificationIds)).filter(Boolean)
  if (ids.length === 0) return { error: null }

  try {
    await apiRequest('/notifications/read', {
      method: 'POST',
      body: JSON.stringify({ notification_ids: ids }),
    })
    return { error: null }
  } catch (error) {
    return { error: toError(error) }
  }
}

export async function fetchMyTickets(_userId: string, limit = 10) {
  try {
    const tickets = await apiRequest<RepairTicket[]>(`/repair-tickets/mine?limit=${limit}`)
    return { tickets, error: null }
  } catch (error) {
    return { tickets: [], error: toError(error) }
  }
}

export async function createRepairTicket(payload: {
  userId: string
  faultType: RepairTicket['fault_type']
  location: string
  description: string
  images: UploadedImage[]
}) {
  try {
    const ticket = await apiRequest<RepairTicket>('/repair-tickets', {
      method: 'POST',
      body: JSON.stringify({
        fault_type: payload.faultType,
        location: payload.location,
        description: payload.description,
        images: payload.images,
      }),
    })
    return { ticket, error: null }
  } catch (error) {
    return { ticket: null, error: toError(error) }
  }
}

export async function deleteRepairImageFile(path: string) {
  try {
    await apiRequest(`/uploads/files/${encodeURI(path)}`, { method: 'DELETE' })
    return { error: null }
  } catch (error) {
    return { error: toError(error) }
  }
}

export async function uploadRepairImage(_userId: string, file: File) {
  try {
    const uploaded = await apiUpload<UploadedImage>('/uploads/repair-images', file)
    return { url: uploaded.url, path: uploaded.path, error: null }
  } catch (error) {
    return { url: null, path: null, error: toError(error) }
  }
}

export async function uploadProfileAvatar(_userId: string, file: File) {
  try {
    const uploaded = await apiUpload<UploadedImage>('/uploads/avatars', file)
    return { url: uploaded.url, error: null }
  } catch (error) {
    return { url: null, error: toError(error) }
  }
}

export async function uploadMenuImage(_userId: string, file: File) {
  try {
    const uploaded = await apiUpload<UploadedImage>('/uploads/menu-images', file)
    return { url: uploaded.url, path: uploaded.path, error: null }
  } catch (error) {
    return { url: null, path: null, error: toError(error) }
  }
}

export async function fetchAdminMenus(limit = 60) {
  try {
    const menus = await apiRequest<MealMenu[]>(`/admin/menus?limit=${limit}`)
    return { menus, error: null }
  } catch (error) {
    return { menus: [], error: toError(error) }
  }
}

export async function saveMenu(payload: {
  id?: string
  date: string
  mealType: MealType
  items: string[]
  description: string
  imageUrl: string
  imagePath?: string | null
  timeRange: string
  bookingStatus?: MealMenu['booking_status']
}) {
  const body = {
    date: payload.date,
    meal_type: payload.mealType,
    items: payload.items,
    description: payload.description || null,
    image_url: payload.imageUrl || null,
    image_path: payload.imagePath || null,
    time_range: payload.timeRange || null,
    booking_status: payload.bookingStatus ?? 'open',
  }

  try {
    await apiRequest<MealMenu>(payload.id ? `/admin/menus/${payload.id}` : '/admin/menus', {
      method: payload.id ? 'PUT' : 'POST',
      body: JSON.stringify(body),
    })
    return { error: null }
  } catch (error) {
    return { error: toError(error) }
  }
}

export async function updateMenuBookingStatus(menuId: string, status: MealMenu['booking_status']) {
  try {
    await apiRequest<MealMenu>(`/admin/menus/${menuId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ booking_status: status }),
    })
    return { error: null }
  } catch (error) {
    return { error: toError(error) }
  }
}

export async function deleteMenu(id: string) {
  try {
    await apiRequest(`/admin/menus/${id}`, { method: 'DELETE' })
    return { error: null }
  } catch (error) {
    return { error: toError(error) }
  }
}

export async function fetchAdminBookings(limit = 120) {
  try {
    const bookings = await apiRequest<BookingWithProfile[]>(`/admin/bookings?limit=${limit}`)
    return { bookings, error: null }
  } catch (error) {
    return { bookings: [], error: toError(error) }
  }
}

export async function fetchAdminTickets(limit = 100) {
  try {
    const tickets = await apiRequest<(RepairTicket & { profiles?: Pick<Profile, 'name' | 'phone' | 'email'> | null })[]>(`/admin/tickets?limit=${limit}`)
    return { tickets, error: null }
  } catch (error) {
    return { tickets: [], error: toError(error) }
  }
}

export async function updateTicketStatus(ticketId: string, status: TicketStatus) {
  try {
    await apiRequest<RepairTicket>(`/admin/tickets/${ticketId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
    return { error: null }
  } catch (error) {
    return { error: toError(error) }
  }
}

export async function uploadRepairResultImage(_userId: string, file: File) {
  try {
    const uploaded = await apiUpload<UploadedImage>('/uploads/repair-results', file)
    return { url: uploaded.url, path: uploaded.path, error: null }
  } catch (error) {
    return { url: null, path: null, error: toError(error) }
  }
}

export async function completeRepairTicket(payload: {
  ticketId: string
  resultText: string
  resultImageUrl: string | null
  resultImagePath: string | null
}) {
  try {
    await apiRequest<RepairTicket>(`/admin/tickets/${payload.ticketId}/complete`, {
      method: 'POST',
      body: JSON.stringify({
        result_text: payload.resultText,
        result_image_url: payload.resultImageUrl,
        result_image_path: payload.resultImagePath,
      }),
    })
    return { error: null }
  } catch (error) {
    return { error: toError(error) }
  }
}

export async function fetchAdminNotifications(limit = 80) {
  try {
    const notifications = await apiRequest<Notification[]>(`/admin/notifications?limit=${limit}`)
    return { notifications, error: null }
  } catch (error) {
    return { notifications: [], error: toError(error) }
  }
}

export async function createNotification(payload: {
  title: string
  content: string
  type: NotificationType
  targetUserId: string | null
}) {
  try {
    await apiRequest<Notification>('/admin/notifications', {
      method: 'POST',
      body: JSON.stringify({
        title: payload.title,
        content: payload.content,
        type: payload.type,
        target_user_id: payload.targetUserId,
      }),
    })
    return { error: null }
  } catch (error) {
    return { error: toError(error) }
  }
}

export async function deleteNotification(id: string) {
  try {
    await apiRequest(`/admin/notifications/${id}`, { method: 'DELETE' })
    return { error: null }
  } catch (error) {
    return { error: toError(error) }
  }
}

export async function fetchAdminProfiles(limit = 200) {
  try {
    const profiles = await apiRequest<Profile[]>(`/admin/profiles?limit=${limit}`)
    return { profiles, error: null }
  } catch (error) {
    return { profiles: [], error: toError(error) }
  }
}

export async function updateProfileRole(userId: string, role: UserRole) {
  try {
    await apiRequest<Profile>(`/admin/profiles/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    })
    return { error: null }
  } catch (error) {
    return { error: toError(error) }
  }
}
