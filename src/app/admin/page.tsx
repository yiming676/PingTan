'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import {
  completeRepairTicket,
  createNotification,
  deleteCompletedRepairTicket,
  deleteMenu,
  deleteNotification,
  deleteUser,
  fetchAdminBookings,
  fetchAdminMenus,
  fetchAdminNotifications,
  fetchAdminProfiles,
  fetchAdminTickets,
  saveMenu,
  updateMenuBookingStatus,
  updateProfileRole,
  updateTicketStatus,
  updateUserStatus,
  uploadMenuImage,
  uploadRepairResultImage,
} from '@/lib/services/campus'
import {
  canManageCanteen,
  canManageNotifications,
  canManageRepair,
  canManageUsers,
  MEAL_LABELS,
  NOTIFICATION_LABELS,
  ROLE_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_STATUS_OPTIONS,
} from '@/lib/constants'
import { toDateString } from '@/lib/utils'
import { MAX_IMAGE_UPLOAD_BYTES, MAX_IMAGE_UPLOAD_MB } from '@/lib/uploads'
import Header from '@/components/Header'
import Icon from '@/components/Icon'
import ImageUploader from '@/components/ImageUploader'
import ImagePreviewModal from '@/components/ImagePreviewModal'
import ImageStrip from '@/components/ImageStrip'
import type { PreviewImage } from '@/components/ImagePreviewModal'
import Toast from '@/components/Toast'
import type {
  BookingWithProfile,
  MealMenu,
  MealType,
  Notification,
  NotificationType,
  Profile,
  RepairImage,
  RepairTicket,
  TicketStatus,
  UploadedImage,
  UserRole,
} from '@/lib/types'

type AdminTab = 'canteen' | 'repair' | 'notifications' | 'users'

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner']

function getDefaultMenuForm() {
  const now = new Date()
  const date = new Date(now)
  const mealType: MealType = 'breakfast'

  if (now.getHours() >= 7) {
    date.setDate(date.getDate() + 1)
  }

  return {
    id: '',
    date: toDateString(date),
    mealType: mealType as MealType,
    items: '',
    description: '',
    imageUrl: '',
    imagePath: '',
    timeRange: '',
    bookingStatus: 'open' as MealMenu['booking_status'],
  }
}

function parseMenuItems(value: string) {
  return value
    .replace(/(?:^|\n)\s*(?:[-*]|\d+[.)、])\s*/g, '\n')
    .split(/[\s,，、;；]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function getWeekdayLabel(dateString: string) {
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][new Date(`${dateString}T00:00:00`).getDay()]
}

function getTicketStatusLabel(status: string) {
  return TICKET_STATUS_LABELS[status as TicketStatus] ?? status
}

function getRepairResultImages(ticket: RepairTicket): RepairImage[] {
  if (ticket.repair_result_images?.length) return ticket.repair_result_images
  if (!ticket.result_image_url) return []
  return [{
    id: `${ticket.id}-result-image`,
    ticket_id: ticket.id,
    image_url: ticket.result_image_url,
    storage_path: ticket.result_image_path || '',
    created_at: ticket.completed_at || ticket.updated_at,
  }]
}

function getRepairImageGallery(images: RepairImage[] | undefined, label: string): PreviewImage[] {
  return (images ?? []).map((image, index) => ({
    url: image.image_url,
    alt: `${label} ${index + 1}`,
    fileName: image.storage_path?.split('/').pop(),
  }))
}

function hasAssignableAdminRole(role: UserRole, adminRole: 'canteen_admin' | 'repair_admin') {
  if (role === 'super_admin') return true
  if (role === 'canteen_repair_admin') return true
  return role === adminRole
}

function getRoleWithAdminRole(
  role: UserRole,
  adminRole: 'canteen_admin' | 'repair_admin',
  enabled: boolean
): UserRole {
  if (role === 'super_admin') return role

  const hasCanteen = adminRole === 'canteen_admin'
    ? enabled
    : role === 'canteen_admin' || role === 'canteen_repair_admin'
  const hasRepair = adminRole === 'repair_admin'
    ? enabled
    : role === 'repair_admin' || role === 'canteen_repair_admin'

  if (hasCanteen && hasRepair) return 'canteen_repair_admin'
  if (hasCanteen) return 'canteen_admin'
  if (hasRepair) return 'repair_admin'
  return 'teacher'
}

export default function AdminPage() {
  const router = useRouter()
  const { profile, loading } = useAuth()
  const menuImageInputRef = useRef<HTMLInputElement>(null)

  const [activeTab, setActiveTab] = useState<AdminTab>('canteen')
  const [menus, setMenus] = useState<MealMenu[]>([])
  const [bookings, setBookings] = useState<BookingWithProfile[]>([])
  const [tickets, setTickets] = useState<(RepairTicket & { profiles?: Pick<Profile, 'name' | 'phone' | 'email'> | null })[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [busy, setBusy] = useState(false)
  const [uploadingMenuImage, setUploadingMenuImage] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [menuForm, setMenuForm] = useState(() => getDefaultMenuForm())
  const [selectedBookingDate, setSelectedBookingDate] = useState('')
  const [selectedBookingMeal, setSelectedBookingMeal] = useState<MealType>('breakfast')
  const [showAllBookingDates, setShowAllBookingDates] = useState(false)
  const [repairResultForm, setRepairResultForm] = useState<Record<string, { text: string; images: UploadedImage[] }>>({})
  const [previewGallery, setPreviewGallery] = useState<{ images: PreviewImage[]; index: number } | null>(null)
  const [noticeForm, setNoticeForm] = useState({
    title: '',
    content: '',
    type: 'info' as NotificationType,
    targetUserId: '',
  })

  const permissions = useMemo(() => ({
    canteen: canManageCanteen(profile?.role),
    repair: canManageRepair(profile?.role),
    notifications: canManageNotifications(profile?.role),
    users: canManageUsers(profile?.role),
  }), [profile?.role])

  const tabs = useMemo(() => {
    const result: { id: AdminTab; label: string; icon: string }[] = []
    if (permissions.canteen) result.push({ id: 'canteen', label: '食堂', icon: 'restaurant_menu' })
    if (permissions.repair) result.push({ id: 'repair', label: '报修', icon: 'construction' })
    if (permissions.notifications) result.push({ id: 'notifications', label: '通知', icon: 'campaign' })
    if (permissions.users) result.push({ id: 'users', label: '用户', icon: 'group' })
    return result
  }, [permissions])

  const currentTab = tabs.some((tab) => tab.id === activeTab)
    ? activeTab
    : tabs[0]?.id

  useEffect(() => {
    if (loading || !profile) return
    if (tabs.length === 0) {
      router.replace('/dashboard')
    }
  }, [loading, profile, router, tabs.length])

  useEffect(() => {
    if (loading || !profile || tabs.length === 0) return
    let active = true

    const load = async () => {
      setBusy(true)
      const requests: Promise<unknown>[] = []

      if (permissions.canteen) {
        requests.push(fetchAdminMenus().then((res) => active && setMenus(res.menus)))
        requests.push(fetchAdminBookings().then((res) => active && setBookings(res.bookings)))
      }
      if (permissions.repair) {
        requests.push(fetchAdminTickets().then((res) => active && setTickets(res.tickets)))
      }
      if (permissions.notifications) {
        requests.push(fetchAdminNotifications().then((res) => active && setNotifications(res.notifications)))
        requests.push(fetchAdminProfiles().then((res) => active && setProfiles(res.profiles)))
      } else if (permissions.users) {
        requests.push(fetchAdminProfiles().then((res) => active && setProfiles(res.profiles)))
      }

      await Promise.all(requests)
      if (active) setBusy(false)
    }

    void load()
    return () => {
      active = false
    }
  }, [loading, permissions, profile, tabs.length])

  const reloadMenusAndBookings = useCallback(async () => {
    const [menuResult, bookingResult] = await Promise.all([
      fetchAdminMenus(),
      fetchAdminBookings(),
    ])
    setMenus(menuResult.menus)
    setBookings(bookingResult.bookings)
  }, [])

  const reloadTickets = useCallback(async () => {
    const { tickets: nextTickets } = await fetchAdminTickets()
    setTickets(nextTickets)
  }, [])

  useEffect(() => {
    if (loading || !profile || tabs.length === 0) return
    const intervalId = window.setInterval(() => {
      if (permissions.canteen) void reloadMenusAndBookings()
      if (permissions.repair) void reloadTickets()
    }, 30000)
    return () => {
      window.clearInterval(intervalId)
    }
  }, [
    loading,
    permissions.canteen,
    permissions.repair,
    profile,
    reloadMenusAndBookings,
    reloadTickets,
    tabs.length,
  ])

  const handleMenuImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !profile) return

    if (!file.type.startsWith('image/')) {
      setToast({ message: '请上传图片文件', type: 'error' })
      return
    }
    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      setToast({ message: `菜单图片不能超过 ${MAX_IMAGE_UPLOAD_MB}MB`, type: 'error' })
      return
    }

    setUploadingMenuImage(true)
    const { url, path, error } = await uploadMenuImage(profile.id, file)
    setUploadingMenuImage(false)
    if (menuImageInputRef.current) menuImageInputRef.current.value = ''

    if (error || !url || !path) {
      setToast({ message: `菜单图片上传失败：${error?.message || '未知错误'}`, type: 'error' })
      return
    }

    setMenuForm((current) => ({
      ...current,
      imageUrl: url,
      imagePath: path,
    }))
    setToast({ message: '菜单图片已上传', type: 'success' })
  }

  const handleSaveMenu = async () => {
    const parsedItems = parseMenuItems(menuForm.items)

    if (!menuForm.date || parsedItems.length === 0) {
      setToast({ message: '请填写菜单日期和菜品', type: 'error' })
      return
    }

    const mealLabel = MEAL_LABELS[menuForm.mealType]
    const weekdayLabel = getWeekdayLabel(menuForm.date)
    const confirmed = window.confirm(`请确认发布菜单：\n${menuForm.date}（${weekdayLabel}）${mealLabel}\n\n确认后将发布菜单并通知用户。`)
    if (!confirmed) return

    setBusy(true)
    const { error } = await saveMenu({
      id: menuForm.id || undefined,
      date: menuForm.date,
      mealType: menuForm.mealType,
      items: parsedItems,
      description: menuForm.description,
      imageUrl: menuForm.imageUrl,
      imagePath: menuForm.imagePath,
      timeRange: menuForm.timeRange,
      bookingStatus: menuForm.bookingStatus,
    })

    if (error) {
      setBusy(false)
      setToast({ message: `菜单保存失败：${error.message}`, type: 'error' })
      return
    }

    const { error: noticeError } = await createNotification({
      title: `${menuForm.date} ${mealLabel}菜单已更新`,
      content: `${mealLabel}菜单已更新，请进入食堂报饭页面查看。`,
      type: 'info',
      targetUserId: null,
    })
    setBusy(false)
    setToast({ message: noticeError ? `菜单已保存，通知发布失败：${noticeError.message}` : '菜单已保存并已发送通知', type: noticeError ? 'error' : 'success' })
    setMenuForm(getDefaultMenuForm())
    await reloadMenusAndBookings()
  }

  const handleEditMenu = (menu: MealMenu) => {
    setMenuForm({
      id: menu.id,
      date: menu.date,
      mealType: menu.meal_type,
      items: menu.items.join(', '),
      description: menu.description || '',
      imageUrl: menu.image_url || '',
      imagePath: menu.image_path || '',
      timeRange: menu.time_range || '',
      bookingStatus: menu.booking_status,
    })
    setActiveTab('canteen')
  }

  const handleCancelMenuEdit = () => {
    setMenuForm(getDefaultMenuForm())
  }

  const handleDeleteMenu = async (id: string) => {
    const confirmed = window.confirm('确定删除这份菜单吗？相关报名记录也会一并删除。')
    if (!confirmed) return
    const { error } = await deleteMenu(id)
    if (error) {
      setToast({ message: `菜单删除失败：${error.message}`, type: 'error' })
      return
    }
    setToast({ message: '菜单已删除', type: 'success' })
    await reloadMenusAndBookings()
  }

  const handleMenuStatus = async (menu: MealMenu, status: MealMenu['booking_status']) => {
    const { error } = await updateMenuBookingStatus(menu.id, status)
    if (error) {
      setToast({ message: `菜单状态更新失败：${error.message}`, type: 'error' })
      return
    }
    setToast({ message: status === 'open' ? '报饭已开启' : '报饭已关闭', type: 'success' })
    await reloadMenusAndBookings()
  }

  const handleTicketStatus = async (ticketId: string, status: TicketStatus) => {
    const { error } = await updateTicketStatus(ticketId, status)
    if (error) {
      setToast({ message: `工单状态更新失败：${error.message}`, type: 'error' })
      return
    }
    await reloadTickets()
    setToast({ message: '工单状态已更新', type: 'success' })
  }

  const handleCompleteRepair = async (ticket: RepairTicket) => {
    const form = repairResultForm[ticket.id]
    if (!form?.text?.trim()) {
      setToast({ message: '请填写维修结果说明', type: 'error' })
      return
    }

    setBusy(true)
    const { error } = await completeRepairTicket({
      ticketId: ticket.id,
      resultText: form.text.trim(),
      resultImageUrl: form.images[0]?.url ?? null,
      resultImagePath: form.images[0]?.path ?? null,
      resultImages: form.images,
    })

    if (error) {
      setBusy(false)
      setToast({ message: `维修结果提交失败：${error.message}`, type: 'error' })
      return
    }

    await createNotification({
      title: '维修已完成',
      content: `${ticket.location} 的维修申请已处理完成，请进入设施报修页面查看详情。`,
      type: 'info',
      targetUserId: ticket.user_id,
    })
    setBusy(false)
    await reloadTickets()
    setRepairResultForm((current) => {
      const next = { ...current }
      delete next[ticket.id]
      return next
    })
    setToast({ message: '维修结果已提交并已通知用户', type: 'success' })
  }

  const handleDeleteCompletedTicket = async (ticket: RepairTicket) => {
    if (ticket.status !== 'completed') {
      setToast({ message: '只能删除已完成的维修工单', type: 'error' })
      return
    }
    const confirmed = window.confirm('确定删除这条已完成维修工单吗？删除后无法恢复。')
    if (!confirmed) return
    const { error } = await deleteCompletedRepairTicket(ticket.id)
    if (error) {
      setToast({ message: `工单删除失败：${error.message}`, type: 'error' })
      return
    }
    setToast({ message: '维修工单已删除', type: 'success' })
    await reloadTickets()
  }

  const handleCreateNotice = async () => {
    if (!noticeForm.title || !noticeForm.content) {
      setToast({ message: '请填写通知标题和内容', type: 'error' })
      return
    }

    const { error } = await createNotification({
      title: noticeForm.title,
      content: noticeForm.content,
      type: noticeForm.type,
      targetUserId: noticeForm.targetUserId || null,
    })

    if (error) {
      setToast({ message: `通知发布失败：${error.message}`, type: 'error' })
      return
    }

    setNoticeForm({ title: '', content: '', type: 'info', targetUserId: '' })
    const { notifications: nextNotifications } = await fetchAdminNotifications()
    setNotifications(nextNotifications)
    setToast({ message: '通知已发布', type: 'success' })
  }

  const handleDeleteNotice = async (id: string) => {
    const { error } = await deleteNotification(id)
    if (error) {
      setToast({ message: `通知删除失败：${error.message}`, type: 'error' })
      return
    }
    setNotifications((current) => current.filter((item) => item.id !== id))
    setToast({ message: '通知已删除', type: 'success' })
  }

  const handleRoleChange = async (userId: string, role: UserRole) => {
    const { error } = await updateProfileRole(userId, role)
    if (error) {
      setToast({ message: `角色更新失败：${error.message}`, type: 'error' })
      return
    }
    const { profiles: nextProfiles } = await fetchAdminProfiles()
    setProfiles(nextProfiles)
    setToast({ message: '角色已更新', type: 'success' })
  }

  const handleAdminRoleToggle = async (
    item: Profile,
    adminRole: 'canteen_admin' | 'repair_admin',
    enabled: boolean
  ) => {
    await handleRoleChange(item.id, getRoleWithAdminRole(item.role, adminRole, enabled))
  }

  const handleUserStatusChange = async (item: Profile, isActive: boolean) => {
    const confirmed = window.confirm(isActive ? '确定启用这个用户吗？' : '确定禁用这个用户吗？禁用后该用户将无法登录。')
    if (!confirmed) return
    const { error } = await updateUserStatus(item.id, isActive)
    if (error) {
      setToast({ message: `用户状态更新失败：${error.message}`, type: 'error' })
      return
    }
    const { profiles: nextProfiles } = await fetchAdminProfiles()
    setProfiles(nextProfiles)
    setToast({ message: isActive ? '用户已启用' : '用户已禁用', type: 'success' })
  }

  const handleDeleteUser = async (item: Profile) => {
    const confirmed = window.confirm(`确定永久删除用户“${item.name}”吗？该用户的资料、报名和报修记录都会被删除。`)
    if (!confirmed) return
    const { error } = await deleteUser(item.id)
    if (error) {
      setToast({ message: `用户删除失败：${error.message}`, type: 'error' })
      return
    }
    setProfiles((current) => current.filter((profileItem) => profileItem.id !== item.id))
    setToast({ message: '用户已删除', type: 'success' })
  }

  const bookingStats = useMemo(() => {
    const stats = new Map<string, { date: string; mealType: MealType; count: number }>()
    bookings
      .filter((booking) => booking.status === 'booked')
      .forEach((booking) => {
        const key = `${booking.date}-${booking.meal_type}`
        const current = stats.get(key)
        stats.set(key, {
          date: booking.date,
          mealType: booking.meal_type,
          count: (current?.count ?? 0) + 1,
        })
      })
    return Array.from(stats.values()).slice(0, 12)
  }, [bookings])

  const bookingDetails = useMemo(() => (
    bookings.filter((booking) => booking.status === 'booked').slice(0, 40)
  ), [bookings])

  const bookingDateStats = useMemo(() => {
    const stats = new Map<string, number>()
    bookings
      .filter((booking) => booking.status === 'booked')
      .forEach((booking) => stats.set(booking.date, (stats.get(booking.date) ?? 0) + 1))
    return Array.from(stats.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [bookings])

  const visibleBookingDateStats = useMemo(() => (
    showAllBookingDates ? bookingDateStats : bookingDateStats.slice(0, 6)
  ), [bookingDateStats, showAllBookingDates])

  const selectedMealBookings = useMemo(() => (
    bookings.filter((booking) => (
      booking.status === 'booked'
      && booking.date === selectedBookingDate
      && booking.meal_type === selectedBookingMeal
    ))
  ), [bookings, selectedBookingDate, selectedBookingMeal])

  const selectedMealItemTotals = useMemo(() => {
    const totals = new Map<string, number>()
    selectedMealBookings.forEach((booking) => {
      booking.selected_items?.forEach((item) => {
        totals.set(item.name, (totals.get(item.name) ?? 0) + item.quantity)
      })
    })
    return Array.from(totals.entries()).map(([name, quantity]) => ({ name, quantity }))
  }, [selectedMealBookings])

  const setPreviewImage = useCallback((image: PreviewImage) => {
    setPreviewGallery({ images: [image], index: 0 })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light">
        <Icon name="progress_activity" className="text-primary text-4xl animate-spin" />
      </div>
    )
  }

  if (!profile || tabs.length === 0) {
    return (
      <div className="min-h-screen bg-background-light">
        <Header title="管理后台" showBack />
        <div className="px-6 py-16 text-center text-gray-400">
          <Icon name="lock" className="mx-auto mb-3 text-5xl" />
          <p className="text-sm font-medium">当前账号暂无管理权限</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-light text-gray-900 pb-12">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <ImagePreviewModal
        images={previewGallery?.images ?? []}
        initialIndex={previewGallery?.index ?? 0}
        onClose={() => setPreviewGallery(null)}
      />
      <Header title="管理后台" showBack />

      <main className="max-w-lg mx-auto px-4 py-5 space-y-5">
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold">校务管理</h1>
              <p className="text-xs text-gray-500 mt-1">{ROLE_LABELS[profile.role]}</p>
            </div>
            {busy && <Icon name="progress_activity" className="text-primary animate-spin" />}
          </div>
          <div className="grid grid-cols-4 gap-2 mt-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`h-16 rounded-xl border flex flex-col items-center justify-center gap-1 text-xs font-bold transition-colors ${
                  currentTab === tab.id
                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                    : 'bg-gray-50 text-gray-500 border-gray-100'
                }`}
              >
                <Icon name={tab.icon} className="text-[20px]" />
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {currentTab === 'canteen' && permissions.canteen && (
          <>
            <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
              <h2 className="text-base font-bold">菜单管理</h2>
              <div className="grid grid-cols-2 gap-3">
                <input className="h-11 rounded-xl bg-gray-50 px-3 text-sm outline-none border border-gray-100" type="date" value={menuForm.date} onChange={(e) => setMenuForm({ ...menuForm, date: e.target.value })} />
                <select className="h-11 rounded-xl bg-gray-50 px-3 text-sm outline-none border border-gray-100" value={menuForm.mealType} onChange={(e) => setMenuForm({ ...menuForm, mealType: e.target.value as MealType })}>
                  {Object.entries(MEAL_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <input className="hidden" placeholder="用餐时间，例如 11:30 - 13:00" value={menuForm.timeRange} onChange={(e) => setMenuForm({ ...menuForm, timeRange: e.target.value })} />
              <input className="hidden" placeholder="图片 URL" value={menuForm.imageUrl} onChange={(e) => setMenuForm({ ...menuForm, imageUrl: e.target.value })} />
              <div className="hidden">
                <input ref={menuImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleMenuImageChange} />
                <button type="button" disabled={uploadingMenuImage} onClick={() => menuImageInputRef.current?.click()} className="h-11 px-4 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold disabled:opacity-50">
                  {uploadingMenuImage ? '上传中...' : '上传菜单图片'}
                </button>
                <select className="h-11 flex-1 rounded-xl bg-gray-50 px-3 text-sm outline-none border border-gray-100" value={menuForm.bookingStatus} onChange={(e) => setMenuForm({ ...menuForm, bookingStatus: e.target.value as MealMenu['booking_status'] })}>
                  <option value="open">开放报饭</option>
                  <option value="closed">关闭报饭</option>
                </select>
              </div>
              {false && menuForm.imageUrl && (
                <img alt="菜单预览" className="h-28 w-full rounded-xl object-cover border border-gray-100" src={menuForm.imageUrl} />
              )}
              <textarea className="w-full rounded-xl bg-gray-50 p-3 text-sm outline-none border border-gray-100 resize-none" rows={3} placeholder="请输入菜品，支持逗号或换行分隔" value={menuForm.items} onChange={(e) => setMenuForm({ ...menuForm, items: e.target.value })} />
              <textarea className="hidden" rows={2} placeholder="菜单描述" value={menuForm.description} onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })} />
              <div className="flex gap-2">
                <button type="button" onClick={handleSaveMenu} className="flex-1 h-11 rounded-xl bg-primary text-white text-sm font-bold">{menuForm.id ? '保存修改' : '发布菜单'}</button>
                <button type="button" onClick={handleCancelMenuEdit} className="w-24 h-11 rounded-xl bg-gray-100 text-gray-600 text-sm font-bold">{menuForm.id ? '取消编辑' : '清空'}</button>
              </div>
            </section>

            <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <h2 className="text-base font-bold mb-3">报饭汇总</h2>
              {bookingDateStats.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">暂无报饭数据</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {visibleBookingDateStats.map((item) => (
                    <button
                      key={item.date}
                      type="button"
                      onClick={() => {
                        setSelectedBookingDate(item.date)
                        setSelectedBookingMeal('breakfast')
                      }}
                      className={`rounded-xl p-3 text-left ${selectedBookingDate === item.date ? 'bg-primary text-white' : 'bg-primary/5 text-gray-900'}`}
                    >
                      <p className={selectedBookingDate === item.date ? 'text-xs text-white/80' : 'text-xs text-gray-500'}>{item.date}</p>
                      <p className="mt-1 text-sm font-bold">{getWeekdayLabel(item.date)} · {item.count} 人</p>
                    </button>
                  ))}
                </div>
              )}
              {bookingDateStats.length > 6 && (
                <button
                  type="button"
                  onClick={() => setShowAllBookingDates((value) => !value)}
                  className="mt-3 flex h-10 w-full items-center justify-center gap-1 rounded-xl bg-gray-50 text-xs font-bold text-gray-600"
                >
                  <Icon name={showAllBookingDates ? 'expand_less' : 'expand_more'} className="text-[18px]" />
                  {showAllBookingDates ? '收起历史日期' : `展开全部日期（${bookingDateStats.length} 天）`}
                </button>
              )}
              {selectedBookingDate && (
                <div className="mt-4 border-t border-gray-100 pt-3">
                  <div className="mb-3 flex gap-2">
                    {MEAL_TYPES.map((mealType) => (
                      <button key={mealType} type="button" onClick={() => setSelectedBookingMeal(mealType)} className={`h-9 flex-1 rounded-lg text-xs font-bold ${selectedBookingMeal === mealType ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}>
                        {MEAL_LABELS[mealType]}
                      </button>
                    ))}
                  </div>
                  {selectedMealItemTotals.length > 0 && (
                    <div className="mb-3 rounded-lg bg-primary/5 p-3">
                      <p className="mb-2 text-xs font-bold text-primary">菜品汇总</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedMealItemTotals.map((item) => (
                          <span key={item.name} className="rounded-full bg-white px-2 py-1 text-xs font-bold text-gray-700">{item.name} x {item.quantity}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedMealBookings.length === 0 ? (
                    <p className="py-4 text-center text-xs text-gray-400">该餐暂无报饭</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedMealBookings.map((booking) => {
                        const total = booking.selected_items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0
                        return (
                          <div key={booking.id} className="rounded-lg bg-gray-50 px-3 py-2">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-gray-900">{booking.profiles?.name || '未知用户'}</p>
                                <p className="truncate text-xs text-gray-400">{booking.profiles?.phone || booking.profiles?.email || booking.user_id}</p>
                              </div>
                              <span className="shrink-0 text-xs font-bold text-primary">{total} 份</span>
                            </div>
                            {booking.selected_items?.length > 0 && (
                              <p className="mt-2 text-xs text-gray-500">{booking.selected_items.map((item) => `${item.name} x ${item.quantity}`).join(', ')}</p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
              <div className="hidden">
              {bookingStats.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">暂无预订数据</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {bookingStats.map((item) => (
                    <div key={`${item.date}-${item.mealType}`} className="rounded-xl bg-primary/5 p-3">
                      <p className="text-xs text-gray-500">{item.date}</p>
                      <p className="text-sm font-bold mt-1">{MEAL_LABELS[item.mealType]} · {item.count} 人</p>
                    </div>
                  ))}
                </div>
              )}
              {bookingDetails.length > 0 && (
                <div className="mt-4 border-t border-gray-100 pt-3 space-y-2">
                  <h3 className="text-xs font-bold text-gray-500">报饭明细</h3>
                  {bookingDetails.map((booking) => (
                    <div key={booking.id} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-gray-900">{booking.profiles?.name || '未知用户'}</p>
                        <p className="truncate text-xs text-gray-400">{booking.profiles?.phone || booking.profiles?.email || booking.user_id}</p>
                      </div>
                      <span className="shrink-0 text-xs font-bold text-primary">{booking.date} {MEAL_LABELS[booking.meal_type]}</span>
                    </div>
                  ))}
                </div>
              )}
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-bold text-gray-500 px-1">最近菜单</h2>
              {menus.map((menu) => (
                <div key={menu.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold">{menu.date} · {MEAL_LABELS[menu.meal_type]}</p>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{menu.items.join(', ')}</p>
                      <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${menu.booking_status === 'open' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {menu.booking_status === 'open' ? '开放中' : '已关闭'}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => handleMenuStatus(menu, menu.booking_status === 'open' ? 'closed' : 'open')} className="hidden">
                        {menu.booking_status === 'open' ? '关闭' : '开放'}
                      </button>
                      <button type="button" onClick={() => handleEditMenu(menu)} className="size-8 rounded-full bg-gray-100 text-gray-600">
                        <Icon name="edit" className="text-[18px]" />
                      </button>
                      <button type="button" onClick={() => handleDeleteMenu(menu.id)} className="size-8 rounded-full bg-red-50 text-red-500">
                        <Icon name="delete" className="text-[18px]" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </section>
          </>
        )}

        {currentTab === 'repair' && permissions.repair && (
          <section
            className="space-y-3 [&_img]:cursor-zoom-in"
            onClick={(event) => {
              const target = event.target
              if (!(target instanceof HTMLImageElement) || !target.src) return
              setPreviewImage({ url: target.src, alt: target.alt || '报修图片' })
            }}
          >
            <h2 className="text-sm font-bold text-gray-500 px-1">维修工单</h2>
            {tickets.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-gray-400">暂无工单</div>
            ) : tickets.map((ticket) => (
              <div key={ticket.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold">{ticket.fault_type} · {ticket.location}</p>
                    {ticket.status === 'pending' && <span className="mt-2 inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">新维修申请</span>}
                    <p className="text-xs text-gray-400 mt-1">{ticket.profiles?.name || '未知用户'} · {new Date(ticket.created_at).toLocaleString('zh-CN')}</p>
                  </div>
                  <select className="h-9 rounded-lg bg-gray-50 px-2 text-xs font-bold outline-none border border-gray-100" value={ticket.status} onChange={(e) => handleTicketStatus(ticket.id, e.target.value as TicketStatus)}>
                    {!TICKET_STATUS_OPTIONS.includes(ticket.status as TicketStatus) && <option value={ticket.status}>{getTicketStatusLabel(ticket.status)}</option>}
                    {TICKET_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{TICKET_STATUS_LABELS[status]}</option>)}
                  </select>
                  {ticket.status === 'completed' && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCompletedTicket(ticket)}
                      className="h-9 rounded-lg bg-red-50 px-3 text-xs font-bold text-red-600"
                    >
                      删除
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{ticket.description}</p>
                {ticket.repair_images && ticket.repair_images.length > 0 && (
                  <div className="hidden">
                    {ticket.repair_images.map((image, index) => (
                      <img
                        key={image.id}
                        alt={`现场照片 ${index + 1}`}
                        className="aspect-square w-full rounded-lg object-cover"
                        src={image.image_url}
                      />
                    ))}
                  </div>
                )}
                {ticket.repair_images && ticket.repair_images.length > 0 && (
                  <ImageStrip
                    images={getRepairImageGallery(ticket.repair_images, '现场照片')}
                    onPreview={(index) => setPreviewGallery({
                      images: getRepairImageGallery(ticket.repair_images, '现场照片'),
                      index,
                    })}
                  />
                )}
                {ticket.result_text ? (
                  <div className="rounded-xl bg-green-50 p-3">
                    <p className="text-xs font-bold text-green-700">维修结果</p>
                    <p className="mt-1 text-sm text-gray-700">{ticket.result_text}</p>
                    {getRepairResultImages(ticket).length > 0 && (
                      <div className="hidden">
                        {getRepairResultImages(ticket).map((image, index) => (
                          <img
                            key={image.id}
                            alt={`维修结果 ${index + 1}`}
                            className="size-24 shrink-0 rounded-lg object-cover"
                            src={image.image_url}
                          />
                        ))}
                      </div>
                    )}
                    {getRepairResultImages(ticket).length > 0 && (
                      <div className="mt-3">
                        <ImageStrip
                          images={getRepairImageGallery(getRepairResultImages(ticket), '维修结果照片')}
                          onPreview={(index) => setPreviewGallery({
                            images: getRepairImageGallery(getRepairResultImages(ticket), '维修结果照片'),
                            index,
                          })}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 rounded-xl bg-gray-50 p-3">
                    <textarea
                      className="w-full rounded-lg border border-gray-100 bg-white p-3 text-sm outline-none resize-none"
                      rows={2}
                      placeholder="填写维修结果"
                      value={repairResultForm[ticket.id]?.text ?? ''}
                      onChange={(e) => setRepairResultForm((current) => ({
                        ...current,
                        [ticket.id]: {
                          text: e.target.value,
                          images: current[ticket.id]?.images ?? [],
                        },
                      }))}
                    />
                    {profile && (
                      <ImageUploader
                        images={repairResultForm[ticket.id]?.images ?? []}
                        maxImages={5}
                        userId={profile.id}
                        uploadImage={uploadRepairResultImage}
                        onImagesChange={(images) => setRepairResultForm((current) => ({
                          ...current,
                          [ticket.id]: {
                            text: current[ticket.id]?.text ?? '',
                            images,
                          },
                        }))}
                        onError={(message) => setToast({ message, type: 'error' })}
                      />
                    )}
                    <div className="flex gap-2">
                      <button type="button" onClick={() => handleCompleteRepair(ticket)} className="h-10 flex-1 rounded-lg bg-primary text-sm font-bold text-white">
                        提交结果
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        {currentTab === 'notifications' && permissions.notifications && (
          <>
            <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
              <h2 className="text-base font-bold">通知公告</h2>
              <input className="w-full h-11 rounded-xl bg-gray-50 px-3 text-sm outline-none border border-gray-100" placeholder="通知标题" value={noticeForm.title} onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })} />
              <textarea className="w-full rounded-xl bg-gray-50 p-3 text-sm outline-none border border-gray-100 resize-none" rows={4} placeholder="通知内容" value={noticeForm.content} onChange={(e) => setNoticeForm({ ...noticeForm, content: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <select className="h-11 rounded-xl bg-gray-50 px-3 text-sm outline-none border border-gray-100" value={noticeForm.type} onChange={(e) => setNoticeForm({ ...noticeForm, type: e.target.value as NotificationType })}>
                  {Object.entries(NOTIFICATION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <select className="h-11 rounded-xl bg-gray-50 px-3 text-sm outline-none border border-gray-100" value={noticeForm.targetUserId} onChange={(e) => setNoticeForm({ ...noticeForm, targetUserId: e.target.value })}>
                  <option value="">全校通知</option>
                  {profiles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
              <button type="button" onClick={handleCreateNotice} className="w-full h-11 rounded-xl bg-primary text-white text-sm font-bold">发布通知</button>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-bold text-gray-500 px-1">通知列表</h2>
              {notifications.map((notice) => (
                <div key={notice.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold">{notice.title}</p>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{notice.content}</p>
                      <p className="text-[10px] text-gray-400 mt-2">{NOTIFICATION_LABELS[notice.type]} · {new Date(notice.created_at).toLocaleDateString('zh-CN')}</p>
                    </div>
                    <button type="button" onClick={() => handleDeleteNotice(notice.id)} className="size-8 rounded-full bg-red-50 text-red-500">
                      <Icon name="delete" className="text-[18px]" />
                    </button>
                  </div>
                </div>
              ))}
            </section>
          </>
        )}

        {currentTab === 'users' && permissions.users && (
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-gray-500 px-1">用户管理</h2>
            {profiles.map((item) => (
              <div key={item.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{item.name}</p>
                  <p className="text-xs text-gray-400 truncate">{item.email || item.phone}</p>
                  <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${item.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                    {item.is_active ? '已启用' : '已禁用'}
                  </span>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-2">
                  {item.role === 'super_admin' ? (
                    <span className="rounded-lg bg-gray-50 px-3 py-2 text-xs font-bold text-gray-500">
                      {ROLE_LABELS.super_admin}
                    </span>
                  ) : (
                    <div className="space-y-2 text-xs font-bold text-gray-600">
                      <label className="flex items-center justify-end gap-2">
                        <span>{ROLE_LABELS.canteen_admin}</span>
                        <input
                          type="checkbox"
                          className="size-4 accent-primary"
                          checked={hasAssignableAdminRole(item.role, 'canteen_admin')}
                          onChange={(e) => handleAdminRoleToggle(item, 'canteen_admin', e.target.checked)}
                        />
                      </label>
                      <label className="flex items-center justify-end gap-2">
                        <span>{ROLE_LABELS.repair_admin}</span>
                        <input
                          type="checkbox"
                          className="size-4 accent-primary"
                          checked={hasAssignableAdminRole(item.role, 'repair_admin')}
                          onChange={(e) => handleAdminRoleToggle(item, 'repair_admin', e.target.checked)}
                        />
                      </label>
                    </div>
                  )}
                  {item.id !== profile?.id && (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleUserStatusChange(item, !item.is_active)}
                        className="h-8 rounded-lg bg-gray-100 px-2 text-xs font-bold text-gray-700"
                      >
                        {item.is_active ? '禁用' : '启用'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(item)}
                        className="h-8 rounded-lg bg-red-50 px-2 text-xs font-bold text-red-600"
                      >
                        删除
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  )
}
