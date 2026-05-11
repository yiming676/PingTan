'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  bookMeal,
  cancelMealBooking,
  fetchAdminBookings,
  fetchBookingsForDate,
  fetchMenusForDate,
  fetchUnreadNotificationCount,
} from '@/lib/services/campus'
import { canManageCanteen, getAdminButtonLabel, isAdminRole, MEAL_LABELS } from '@/lib/constants'
import { getGreeting, formatDateChinese, getMealPackageQuantity, toDateString } from '@/lib/utils'
import BottomNav from '@/components/BottomNav'
import Icon from '@/components/Icon'
import NotificationPanel from '@/components/NotificationPanel'
import Toast from '@/components/Toast'
import MagicBento, { type MagicBentoItem } from '@/components/react-bits/MagicBento'
import ShinyText from '@/components/react-bits/ShinyText'
import SplitText from '@/components/react-bits/SplitText'
import StaggeredMenu, { type StaggeredMenuItem } from '@/components/react-bits/StaggeredMenu'
import type { MealMenu, MealBooking, MealType, SelectedMealItem } from '@/lib/types'

export default function DashboardPage() {
  const { user, profile, loading } = useAuth()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showBellMenu, setShowBellMenu] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [autoOpenedUserId, setAutoOpenedUserId] = useState<string | null>(null)

  // Quick meal ordering
  const [menus, setMenus] = useState<MealMenu[]>([])
  const [bookings, setBookings] = useState<MealBooking[]>([])
  const [bookingQuantities, setBookingQuantities] = useState<Record<string, number>>({})
  const [cancelledMealTypes, setCancelledMealTypes] = useState<Record<string, boolean>>({})
  const [loadingMeal, setLoadingMeal] = useState<string | null>(null)
  const [menuDate, setMenuDate] = useState('')
  const [menuDateLabel, setMenuDateLabel] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [adminStats, setAdminStats] = useState<{ meals: Record<string, number> } | null>(null)

  const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner']

  const refreshUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0)
      return
    }

    const { count, error } = await fetchUnreadNotificationCount()
    if (!error) setUnreadCount(count)
  }, [user])

  useEffect(() => {
    if (!user) return
    let active = true

    const load = async () => {
      const { count, error } = await fetchUnreadNotificationCount()
      if (!active || error) return
      setUnreadCount(count)
      if (count > 0 && autoOpenedUserId !== user.id) {
        setShowNotifications(true)
        setAutoOpenedUserId(user.id)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [autoOpenedUserId, user])

  useEffect(() => {
    if (!user) return
    const intervalId = window.setInterval(() => {
      void refreshUnreadCount()
    }, 30000)
    return () => {
      window.clearInterval(intervalId)
    }
  }, [refreshUnreadCount, user])

  // Quick meal: determine which date to show (tomorrow if published, else today)
  const refreshMenuData = useCallback(async () => {
    if (!user) return

    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = toDateString(tomorrow)
    const todayStr = toDateString(today)

    const { menus: tomorrowMenus } = await fetchMenusForDate(tomorrowStr)
    const date = tomorrowMenus.length > 0 ? tomorrowStr : todayStr

    const [menuResult, bookingResult] = await Promise.all([
      date === tomorrowStr ? { menus: tomorrowMenus, error: null } : fetchMenusForDate(date),
      fetchBookingsForDate(user.id, date),
    ])

    setMenuDate(date)
    setMenuDateLabel(date === tomorrowStr ? '明日菜单' : '今日菜单')
    setMenus(menuResult.menus)
    setBookings(bookingResult.bookings)
  }, [user])

  useEffect(() => {
    if (!user) return
    let active = true

    const load = async () => {
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = toDateString(tomorrow)
      const todayStr = toDateString(today)

      const { menus: tomorrowMenus } = await fetchMenusForDate(tomorrowStr)
      const date = tomorrowMenus.length > 0 ? tomorrowStr : todayStr

      const [menuResult, bookingResult] = await Promise.all([
        date === tomorrowStr ? { menus: tomorrowMenus, error: null } : fetchMenusForDate(date),
        fetchBookingsForDate(user.id, date),
      ])

      if (!active) return
      setMenuDate(date)
      setMenuDateLabel(date === tomorrowStr ? '明日菜单' : '今日菜单')
      setMenus(menuResult.menus)
      setBookings(bookingResult.bookings)
    }

    void load()
    return () => {
      active = false
    }
  }, [user])

  useEffect(() => {
    if (!user) return
    const intervalId = window.setInterval(() => {
      void refreshMenuData()
    }, 30000)
    return () => {
      window.clearInterval(intervalId)
    }
  }, [refreshMenuData, user])

  // Initialize booking quantities from existing bookings (only if not user-set)
  useEffect(() => {
    setBookingQuantities((prev) => {
      const next = { ...prev }
      let changed = false
      for (const booking of bookings) {
        if (booking.status !== 'booked') continue
        if (next[booking.meal_type] !== undefined) continue
        const qty = getMealPackageQuantity(booking)
        if (qty > 0) {
          next[booking.meal_type] = qty
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [bookings])

  // Admin meal stats for canteen admins
  useEffect(() => {
    if (!canManageCanteen(profile?.role) || !menuDate) return
    let active = true
    const load = async () => {
      const { bookings: adminBookings } = await fetchAdminBookings()
      if (!active) return
      const meals: Record<string, number> = { breakfast: 0, lunch: 0, dinner: 0 }
      adminBookings
        .filter((b) => b.status === 'booked' && b.date === menuDate)
        .forEach((b) => {
          const qty = b.selected_items?.[0]?.quantity ?? 0
          meals[b.meal_type] = (meals[b.meal_type] ?? 0) + qty
        })
      setAdminStats({ meals })
    }
    void load()
    return () => { active = false }
  }, [profile?.role, menuDate])

  const menuByType = useMemo(() => new Map(menus.map((menu) => [menu.meal_type, menu])), [menus])
  const bookingByType = useMemo(() => {
    const result = new Map<MealType, MealBooking>()
    bookings
      .filter((booking) => booking.status === 'booked')
      .forEach((booking) => result.set(booking.meal_type, booking))
    return result
  }, [bookings])

  const handleQuickBook = async (menu: MealMenu) => {
    if (!user) return
    const qty = bookingQuantities[menu.meal_type] ?? 1
    if (qty <= 0) return

    setLoadingMeal(menu.id)
    const items: SelectedMealItem[] = menu.items.map((item) => ({ name: item, quantity: qty }))
    const { error } = await bookMeal(user.id, menu, menuDate, items)
    if (error) {
      setToast({ message: '报饭失败：' + error.message, type: 'error' })
    } else {
      setToast({ message: '报饭成功！', type: 'success' })
      setBookingQuantities((prev) => {
        const next = { ...prev }
        delete next[menu.meal_type]
        return next
      })
      await refreshMenuData()
    }
    setLoadingMeal(null)
  }

  const handleQuickCancel = async (booking: MealBooking) => {
    setLoadingMeal(booking.menu_id)

    setBookingQuantities((prev) => ({
      ...prev,
      [booking.meal_type]: 0,
    }))
    setCancelledMealTypes((prev) => ({
      ...prev,
      [booking.meal_type]: true,
    }))

    const { error } = await cancelMealBooking(booking.id)
    if (error) {
      setToast({ message: '取消失败：' + error.message, type: 'error' })
    } else {
      setToast({ message: '已取消报饭', type: 'success' })
      setBookingQuantities((prev) => ({
        ...prev,
        [booking.meal_type]: 0,
      }))
      setCancelledMealTypes((prev) => ({
        ...prev,
        [booking.meal_type]: true,
      }))
      await refreshMenuData()
    }
    setLoadingMeal(null)
  }

  const appItems = useMemo<MagicBentoItem[]>(() => {
    const items: MagicBentoItem[] = [
      {
        title: '食堂订餐',
        description: '今日菜单、订餐状态和个人报餐记录',
        label: 'CANTEEN',
        href: '/canteen',
        icon: <Icon name="restaurant_menu" />,
        accent: '234, 88, 12',
      },
      {
        title: '设施报修',
        description: '快速提交故障工单并查看处理进度',
        label: 'REPAIR',
        href: '/repair',
        icon: <Icon name="build_circle" />,
        accent: '37, 99, 235',
      },
      {
        title: '通知公告',
        description: unreadCount > 0 ? `有 ${unreadCount} 条未读消息` : '查看最新校园消息',
        label: 'NOTICE',
        onClick: () => setShowNotifications(true),
        icon: <Icon name="campaign" />,
        accent: '13, 148, 136',
        badge: unreadCount > 0 ? <span className="size-2 rounded-full bg-red-500" /> : null,
      },
    ]

    if (isAdminRole(profile?.role)) {
      const label = getAdminButtonLabel(profile?.role)
      items.push({
        title: label,
        description: '处理菜单、报修、通知和用户数据',
        label: 'ADMIN',
        href: '/admin',
        icon: <Icon name="admin_panel_settings" />,
        accent: '124, 58, 237',
      })
    }

    return items
  }, [profile?.role, unreadCount])

  const menuItems = useMemo<StaggeredMenuItem[]>(() => {
    const items: StaggeredMenuItem[] = [
      {
        label: '通知公告',
        ariaLabel: '打开通知公告',
        onClick: () => setShowNotifications(true),
      },
      { label: '食堂订餐', ariaLabel: '进入食堂订餐', link: '/canteen' },
      { label: '设施报修', ariaLabel: '进入设施报修', link: '/repair' },
      { label: '我的', ariaLabel: '进入我的页面', link: '/profile' },
    ]

    if (isAdminRole(profile?.role)) {
      items.splice(3, 0, { label: getAdminButtonLabel(profile?.role), ariaLabel: '进入管理后台', link: '/admin' })
    }

    return items
  }, [profile?.role])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light">
        <Icon name="progress_activity" className="text-primary text-4xl animate-spin" />
      </div>
    )
  }

  const greeting = getGreeting()
  const today = formatDateChinese(new Date())
  const userName = profile?.name || '老师'
  const hour = new Date().getHours()
  const weatherIcon = hour < 18 ? 'wb_sunny' : 'dark_mode'

  return (
    <div className="relative min-h-screen w-full flex flex-col pb-28 max-w-md mx-auto overflow-x-hidden shadow-2xl bg-background-light">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <header className="flex items-center justify-between px-6 pt-12 pb-4 sticky top-0 z-20 bg-background-light/95 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
            <Icon name="school" className="text-primary text-2xl" />
          </div>
          <div className="leading-none">
            <h1 className="text-sm font-bold">
              <ShinyText text="平潭二中" color="#111817" shineColor="#2d7670" speed={3.4} />
            </h1>
            <span className="mt-1 block text-xs font-medium">
              <ShinyText text="移动智慧校园" color="#5e8784" shineColor="#ffffff" speed={3.8} />
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowBellMenu(true)}
          className="relative p-2 rounded-full hover:bg-slate-100 transition-colors group"
          aria-label="打开快捷菜单"
        >
          <Icon name="notifications" className="text-slate-600" />
          {unreadCount > 0 && <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white" />}
        </button>
      </header>

      <main className="flex-1 px-5 flex flex-col gap-6">
        <section className="mt-2">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex flex-col gap-1">
              <SplitText
                key={`${greeting}-${userName}`}
                tag="h2"
                text={`${greeting}，${userName}`}
                className="max-w-[240px] text-2xl font-extrabold leading-tight text-slate-900"
                splitType="chars"
                textAlign="left"
              />
              <p className="text-primary font-medium text-sm flex items-center gap-1 mt-1">
                <Icon name={weatherIcon} className="text-[18px]" />
                <span className="min-w-0 truncate">{today}</span>
              </p>
            </div>
            <div className="h-16 w-16 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center">
              {profile?.avatar_url ? (
                <img alt="头像" className="h-full w-full object-cover" src={profile.avatar_url} />
              ) : (
                <Icon name="person" className="text-slate-400 text-3xl" />
              )}
            </div>
          </div>
        </section>

        {/* Admin meal stats card */}
        {canManageCanteen(profile?.role) && adminStats && (
          <section>
            <button
              type="button"
              onClick={() => { window.location.href = '/admin' }}
              className="w-full rounded-xl bg-white border border-primary/20 p-4 shadow-sm hover:shadow-md transition-shadow text-left"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-500">报饭统计</h3>
                <span className="text-[11px] text-gray-400">{menuDateLabel}</span>
              </div>
              {Object.values(adminStats.meals).every((v) => v === 0) ? (
                <p className="text-xs text-gray-400">暂无报饭数据</p>
              ) : (
                <div>
                  <p className="text-[11px] text-gray-400 mb-2">
                    截止 {String(new Date().getHours()).padStart(2, '0')}:{String(new Date().getMinutes()).padStart(2, '0')}
                  </p>
                  <div className="flex gap-3">
                    {MEAL_TYPES.map((mt) => (
                      <span key={mt} className="text-sm font-bold text-gray-900">
                        {MEAL_LABELS[mt]} {adminStats.meals[mt] ?? 0} 份
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </button>
          </section>
        )}

        {/* Quick Meal Ordering */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-sm font-bold text-slate-500">{menuDateLabel}</h3>
            <button onClick={() => { window.location.href = '/canteen' }} className="text-xs text-primary font-bold">
              查看完整菜单
            </button>
          </div>
          <div className="space-y-3">
            {MEAL_TYPES.map((mealType) => {
              const menu = menuByType.get(mealType)
              const booking = bookingByType.get(mealType) ?? null
              const isOpen = !!menu && menu.booking_status === 'open'
              const bookedTotal = getMealPackageQuantity(booking)
              const rawQty = bookingQuantities[mealType]
              const wasCancelled = cancelledMealTypes[mealType]
              const displayQty = rawQty !== undefined ? rawQty : (booking ? bookedTotal : wasCancelled ? 0 : 1)

              return (
                <div
                  key={mealType}
                  className={`rounded-xl border bg-white p-3 shadow-sm ${
                    booking ? 'border-primary/25' : 'border-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon
                        name={mealType === 'breakfast' ? 'wb_twilight' : mealType === 'lunch' ? 'wb_sunny' : 'dark_mode'}
                        className="text-primary text-[18px]"
                      />
                      <span className="text-sm font-bold text-gray-900">{MEAL_LABELS[mealType]}</span>
                      {isOpen && (
                        <span className="text-[11px] text-gray-400">可报饭</span>
                      )}
                      {booking && (
                        <span className="rounded-full bg-green-50 px-1.5 py-0.5 text-[11px] font-bold text-green-700">
                          已报 {bookedTotal} 份
                        </span>
                      )}
                    </div>
                  </div>

                  {menu?.items?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {menu.items.map((item) => (
                        <span key={item} className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                          {item}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-[11px] text-gray-400">暂无菜单</p>
                  )}

                  {menu && (
                    <div className="mt-3 flex items-center gap-2">
                      {isOpen ? (
                        <>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={loadingMeal === menu.id}
                              onClick={() => setBookingQuantities((prev) => {
                                const prevVal = prev[mealType] ?? (booking ? bookedTotal : 1)
                                return { ...prev, [mealType]: Math.max(0, prevVal - 1) }
                              })}
                              className="size-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center"
                            >
                              <Icon name="remove" className="text-[16px]" />
                            </button>
                            <span className="w-6 text-center text-sm font-bold text-gray-900">
                              {displayQty}
                            </span>
                            <button
                              type="button"
                              disabled={loadingMeal === menu.id}
                              onClick={() => {
                                setCancelledMealTypes((prev) => {
                                  const next = { ...prev }
                                  delete next[mealType]
                                  return next
                                })
                                setBookingQuantities((prev) => {
                                  const prevVal = prev[mealType] ?? (booking ? bookedTotal : 0)
                                  return { ...prev, [mealType]: prevVal + 1 }
                                })
                              }}
                              className="size-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center"
                            >
                              <Icon name="add" className="text-[16px]" />
                            </button>
                          </div>
                          <button
                            type="button"
                            disabled={loadingMeal === menu.id || displayQty === 0}
                            onClick={() => handleQuickBook(menu)}
                            className="h-8 flex-1 rounded-lg bg-primary text-xs font-bold text-white disabled:bg-gray-300"
                          >
                            {loadingMeal === menu.id ? '提交中...' : displayQty === 0 ? '请选择份数' : `${booking ? '修改' : ''}报饭（${displayQty} 份）`}
                          </button>
                          {booking && (
                            <button
                              type="button"
                              disabled={loadingMeal === booking.menu_id}
                              onClick={() => handleQuickCancel(booking)}
                              className="h-8 rounded-lg border border-red-100 bg-red-50 px-3 text-xs font-bold text-red-500 disabled:opacity-50"
                            >
                              取消
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="text-[11px] text-gray-400">已停止报饭</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-sm font-bold text-slate-500">常用应用</h3>
          </div>
          <MagicBento items={appItems} />
        </section>
      </main>

      <BottomNav />
      <StaggeredMenu
        open={showBellMenu}
        onClose={() => setShowBellMenu(false)}
        items={menuItems}
        accentColor="#2d7670"
      />
      <NotificationPanel
        open={showNotifications}
        onClose={() => setShowNotifications(false)}
        onNotificationsRead={refreshUnreadCount}
      />
    </div>
  )
}
