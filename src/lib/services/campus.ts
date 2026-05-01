import type { SupabaseClient } from '@supabase/supabase-js'
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

type Client = SupabaseClient

export async function resolveLoginEmail(client: Client, identifier: string) {
  const { data, error } = await client.rpc('resolve_login_email', {
    login_identifier: identifier,
  })

  return { email: (data as string | null) ?? null, error }
}

export async function fetchProfile(client: Client, userId: string) {
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  return { profile: (data as Profile | null) ?? null, error }
}

export async function fetchMenusForDate(client: Client, date: string) {
  const { data, error } = await client
    .from('meal_menus')
    .select('*')
    .eq('date', date)
    .order('meal_type')

  return { menus: (data as MealMenu[] | null) ?? [], error }
}

export async function fetchBookingsForDate(client: Client, userId: string, date: string) {
  const { data, error } = await client
    .from('meal_bookings')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)

  return { bookings: (data as MealBooking[] | null) ?? [], error }
}

export async function bookMeal(
  client: Client,
  userId: string,
  menu: MealMenu,
  date: string,
  selectedItems: SelectedMealItem[]
) {
  if (menu.booking_status !== 'open') {
    return { error: new Error('该餐次已截止报饭') }
  }

  const cleanItems = selectedItems
    .map((item) => ({
      name: item.name.trim(),
      quantity: Math.max(0, Math.floor(Number(item.quantity) || 0)),
    }))
    .filter((item) => item.name && item.quantity > 0)

  if (cleanItems.length === 0) {
    return { error: new Error('请选择至少一个菜品') }
  }

  const { error } = await client
    .from('meal_bookings')
    .upsert(
      {
        user_id: userId,
        menu_id: menu.id,
        date,
        meal_type: menu.meal_type,
        selected_items: cleanItems,
        status: 'booked',
      },
      { onConflict: 'user_id,date,meal_type' }
    )

  return { error }
}

export async function cancelMealBooking(client: Client, bookingId: string) {
  const { error } = await client
    .from('meal_bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId)

  return { error }
}

export async function fetchRecentBookings(client: Client, userId: string, limit = 5) {
  const { data, error } = await client
    .from('meal_bookings')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(limit)

  return { bookings: (data as MealBooking[] | null) ?? [], error }
}

export async function fetchNotifications(client: Client, limit = 20) {
  const { data, error } = await client
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  return { notifications: (data as Notification[] | null) ?? [], error }
}

export async function fetchMyTickets(client: Client, userId: string, limit = 10) {
  const { data, error } = await client
    .from('repair_tickets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  return { tickets: (data as RepairTicket[] | null) ?? [], error }
}

export async function createRepairTicket(
  client: Client,
  payload: {
    userId: string
    faultType: RepairTicket['fault_type']
    location: string
    description: string
    images: UploadedImage[]
  }
) {
  const { data: ticket, error: ticketError } = await client
    .from('repair_tickets')
    .insert({
      user_id: payload.userId,
      fault_type: payload.faultType,
      location: payload.location,
      description: payload.description,
    })
    .select()
    .single()

  if (ticketError || !ticket) {
    return { ticket: null, error: ticketError ?? new Error('工单创建失败') }
  }

  if (payload.images.length > 0) {
    const imageRecords = payload.images.map((image) => ({
      ticket_id: ticket.id,
      image_url: image.url,
      storage_path: image.path,
    }))
    const { error } = await client.from('repair_images').insert(imageRecords)
    if (error) {
      await Promise.all(payload.images.map((image) => deleteRepairImageFile(client, image.path)))
      return { ticket: null, error }
    }
  }

  return { ticket: ticket as RepairTicket, error: null }
}

export async function deleteRepairImageFile(client: Client, path: string) {
  const { error } = await client.storage.from('repair-images').remove([path])
  return { error }
}

export async function uploadProfileAvatar(client: Client, userId: string, file: File) {
  const uploadToBucket = async (bucket: string, path: string, upsert: boolean) => {
    const { error } = await client.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert,
    })
    return { bucket, path, error }
  }

  let uploaded = await uploadToBucket('avatars', `${userId}/avatar`, true)

  if (uploaded.error) {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    uploaded = await uploadToBucket(
      'repair-images',
      `${userId}/avatar-${Date.now()}.${ext}`,
      false
    )
  }

  if (uploaded.error) return { url: null, error: uploaded.error }

  const { data } = client.storage.from(uploaded.bucket).getPublicUrl(uploaded.path)
  const url = `${data.publicUrl}?v=${Date.now()}`
  const { error } = await client
    .from('profiles')
    .update({ avatar_url: url })
    .eq('id', userId)

  return { url: error ? null : url, error }
}

export async function uploadMenuImage(client: Client, userId: string, file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const safeBaseName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '-')
  const path = `${userId}/${Date.now()}-${safeBaseName}.${ext}`

  const { error } = await client.storage.from('menu-images').upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  })

  if (error) return { url: null, path: null, error }

  const { data } = client.storage.from('menu-images').getPublicUrl(path)
  return { url: data.publicUrl, path, error: null }
}

export async function fetchAdminMenus(client: Client, limit = 60) {
  const { data, error } = await client
    .from('meal_menus')
    .select('*')
    .order('date', { ascending: false })
    .order('meal_type', { ascending: true })
    .limit(limit)

  return { menus: (data as MealMenu[] | null) ?? [], error }
}

export async function saveMenu(
  client: Client,
  payload: {
    id?: string
    date: string
    mealType: MealType
    items: string[]
    description: string
    imageUrl: string
    imagePath?: string | null
    timeRange: string
    bookingStatus?: MealMenu['booking_status']
  }
) {
  const row = {
    date: payload.date,
    meal_type: payload.mealType,
    items: payload.items,
    description: payload.description || null,
    image_url: payload.imageUrl || null,
    image_path: payload.imagePath || null,
    time_range: payload.timeRange || null,
    booking_status: payload.bookingStatus ?? 'open',
  }

  if (payload.id) {
    const { error } = await client.from('meal_menus').update(row).eq('id', payload.id)
    return { error }
  }

  const { error } = await client
    .from('meal_menus')
    .upsert(row, { onConflict: 'date,meal_type' })

  return { error }
}

export async function updateMenuBookingStatus(
  client: Client,
  menuId: string,
  status: MealMenu['booking_status']
) {
  const { error } = await client
    .from('meal_menus')
    .update({ booking_status: status })
    .eq('id', menuId)

  return { error }
}

export async function deleteMenu(client: Client, id: string) {
  const { error } = await client.from('meal_menus').delete().eq('id', id)
  return { error }
}

export async function fetchAdminBookings(client: Client, limit = 120) {
  const { data, error } = await client
    .from('meal_bookings')
    .select('*, profiles(name, phone, email)')
    .order('updated_at', { ascending: false })
    .limit(limit)

  return { bookings: (data as BookingWithProfile[] | null) ?? [], error }
}

export async function fetchAdminTickets(client: Client, limit = 100) {
  const { data, error } = await client
    .from('repair_tickets')
    .select('*, profiles(name, phone, email)')
    .order('created_at', { ascending: false })
    .limit(limit)

  return {
    tickets: (data as (RepairTicket & { profiles?: Pick<Profile, 'name' | 'phone' | 'email'> | null })[] | null) ?? [],
    error,
  }
}

export async function updateTicketStatus(client: Client, ticketId: string, status: TicketStatus) {
  const { error } = await client.from('repair_tickets').update({ status }).eq('id', ticketId)
  return { error }
}

export async function uploadRepairResultImage(client: Client, userId: string, file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const safeBaseName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '-')
  const path = `${userId}/repair-result-${Date.now()}-${safeBaseName}.${ext}`

  const { error } = await client.storage.from('repair-images').upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  })

  if (error) return { url: null, path: null, error }

  const { data } = client.storage.from('repair-images').getPublicUrl(path)
  return { url: data.publicUrl, path, error: null }
}

export async function completeRepairTicket(
  client: Client,
  payload: {
    ticketId: string
    resultText: string
    resultImageUrl: string | null
    resultImagePath: string | null
  }
) {
  const { error } = await client
    .from('repair_tickets')
    .update({
      status: '已完成',
      result_text: payload.resultText,
      result_image_url: payload.resultImageUrl,
      result_image_path: payload.resultImagePath,
      completed_at: new Date().toISOString(),
    })
    .eq('id', payload.ticketId)

  return { error }
}

export async function fetchAdminNotifications(client: Client, limit = 80) {
  const { data, error } = await client
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  return { notifications: (data as Notification[] | null) ?? [], error }
}

export async function createNotification(
  client: Client,
  payload: {
    title: string
    content: string
    type: NotificationType
    targetUserId: string | null
  }
) {
  const { error } = await client.from('notifications').insert({
    title: payload.title,
    content: payload.content,
    type: payload.type,
    target_user_id: payload.targetUserId,
  })

  return { error }
}

export async function deleteNotification(client: Client, id: string) {
  const { error } = await client.from('notifications').delete().eq('id', id)
  return { error }
}

export async function fetchAdminProfiles(client: Client, limit = 200) {
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  return { profiles: (data as Profile[] | null) ?? [], error }
}

export async function updateProfileRole(client: Client, userId: string, role: UserRole) {
  const { error } = await client.from('profiles').update({ role }).eq('id', userId)
  return { error }
}
