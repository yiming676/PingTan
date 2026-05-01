'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { MEAL_LABELS } from '@/lib/constants'
import { getWeekDates, getWeekdayName, toDateString, formatDateShort } from '@/lib/utils'
import {
  bookMeal,
  cancelMealBooking,
  fetchBookingsForDate,
  fetchMenusForDate,
} from '@/lib/services/campus'
import Header from '@/components/Header'
import Icon from '@/components/Icon'
import MealCard from '@/components/MealCard'
import Toast from '@/components/Toast'
import type { MealMenu, MealBooking, MealType, SelectedMealItem } from '@/lib/types'

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner']

export default function CanteenPage() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()

  const [selectedDate, setSelectedDate] = useState(new Date())
  const [menus, setMenus] = useState<MealMenu[]>([])
  const [bookings, setBookings] = useState<MealBooking[]>([])
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [activeMenu, setActiveMenu] = useState<MealMenu | null>(null)
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate])
  const dateStr = toDateString(selectedDate)
  const menuByType = useMemo(() => new Map(menus.map((menu) => [menu.meal_type, menu])), [menus])
  const bookingByType = useMemo(() => {
    const result = new Map<MealType, MealBooking>()
    bookings
      .filter((booking) => booking.status === 'booked')
      .forEach((booking) => result.set(booking.meal_type, booking))
    return result
  }, [bookings])

  const refreshData = useCallback(async () => {
    if (!user) return
    const [menuResult, bookingResult] = await Promise.all([
      fetchMenusForDate(supabase, dateStr),
      fetchBookingsForDate(supabase, user.id, dateStr),
    ])
    setMenus(menuResult.menus)
    setBookings(bookingResult.bookings)
  }, [dateStr, supabase, user])

  useEffect(() => {
    if (!user) return
    let active = true

    Promise.all([
      fetchMenusForDate(supabase, dateStr),
      fetchBookingsForDate(supabase, user.id, dateStr),
    ]).then(([menuResult, bookingResult]) => {
      if (!active) return
      setMenus(menuResult.menus)
      setBookings(bookingResult.bookings)
    })

    return () => {
      active = false
    }
  }, [dateStr, supabase, user])

  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`canteen-user-${user.id}-${dateStr}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meal_menus' }, () => {
        void refreshData()
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meal_bookings',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void refreshData()
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [dateStr, refreshData, supabase, user])

  // 预订
  const selectedItems = useMemo<SelectedMealItem[]>(() => (
    Object.entries(quantities)
      .map(([name, quantity]) => ({ name, quantity }))
      .filter((item) => item.quantity > 0)
  ), [quantities])

  const selectedTotal = selectedItems.reduce((sum, item) => sum + item.quantity, 0)

  const openBookingPanel = (menu: MealMenu) => {
    const booking = bookingByType.get(menu.meal_type)
    const nextQuantities: Record<string, number> = {}
    if (booking?.selected_items?.length) {
      booking.selected_items.forEach((item) => {
        nextQuantities[item.name] = item.quantity
      })
    }
    setQuantities(nextQuantities)
    setActiveMenu(menu)
  }

  const changeQuantity = (name: string, delta: number) => {
    setQuantities((current) => ({
      ...current,
      [name]: Math.max(0, (current[name] ?? 0) + delta),
    }))
  }

  const handleBook = async (menu: MealMenu, items: SelectedMealItem[] = []) => {
    if (!user) return
    setLoadingAction(menu.id)
    const { error } = await bookMeal(supabase, user.id, menu, dateStr, items)
    if (error) {
      setToast({ message: error.message.includes('duplicate') ? '已报饭该餐次' : '报饭失败：' + error.message, type: 'error' })
    } else {
      setToast({ message: '报饭成功！', type: 'success' })
      setActiveMenu(null)
      await refreshData()
    }
    setLoadingAction(null)
  }

  // 取消预订
  const handleCancel = async (booking: MealBooking) => {
    setLoadingAction(booking.menu_id)
    const { error } = await cancelMealBooking(supabase, booking.id)
    if (error) {
      setToast({ message: '取消失败：' + error.message, type: 'error' })
    } else {
      setToast({ message: '已取消报饭', type: 'success' })
      await refreshData()
    }
    setLoadingAction(null)
  }

  // 切换周
  const shiftWeek = (dir: number) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + dir * 7)
    setSelectedDate(d)
  }

  const bookedCount = bookings.filter((booking) => booking.status === 'booked').length

  // 月份显示
  const monthYear = `${selectedDate.getFullYear()}年 ${selectedDate.getMonth() + 1}月`

  return (
    <div className="bg-background-light font-display text-text-main min-h-screen flex flex-col">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <Header title="食堂报饭" showBack onRightClick={() => router.push('/profile')} rightIcon="history" />

      {/* Date Picker */}
      <section className="bg-surface-light pt-2 pb-4 shadow-sm relative z-40 rounded-b-2xl">
        <div className="flex items-center justify-between px-6 mb-4">
          <span className="text-sm font-semibold text-gray-900 flex items-center gap-1">
            {monthYear}
            <Icon name="expand_more" className="text-gray-400" style={{ fontSize: '18px' }} />
          </span>
          <div className="flex gap-2">
            <button onClick={() => shiftWeek(-1)} className="size-8 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-100">
              <Icon name="chevron_left" className="text-gray-600" style={{ fontSize: '16px' }} />
            </button>
            <button onClick={() => shiftWeek(1)} className="size-8 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-100">
              <Icon name="chevron_right" className="text-gray-600" style={{ fontSize: '16px' }} />
            </button>
          </div>
        </div>

        <div className="flex justify-between px-4 gap-2 overflow-x-auto hide-scrollbar">
          {weekDates.map((d) => {
            const isSelected = toDateString(d) === dateStr
            const isToday = toDateString(d) === toDateString(new Date())
            return (
              <button
                key={toDateString(d)}
                onClick={() => setSelectedDate(d)}
                className="flex flex-col items-center min-w-[3.2rem] gap-1 group relative"
              >
                <span className={`text-xs font-medium ${isSelected ? 'font-bold text-primary' : 'text-gray-500'}`}>
                  {getWeekdayName(d)}
                </span>
                <div className={`size-10 flex items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                  isSelected
                    ? 'bg-primary text-white shadow-md shadow-primary/30 font-bold'
                    : 'text-gray-900 group-hover:bg-gray-50'
                }`}>
                  {d.getDate()}
                </div>
                {isToday && <span className={`size-1 rounded-full absolute -bottom-2 ${isSelected ? 'bg-primary' : 'bg-gray-300'}`} />}
              </button>
            )
          })}
        </div>
      </section>

      {/* Menu Cards */}
      <main className="flex-1 px-4 py-6 space-y-5 overflow-y-auto pb-32">
        <div className="flex items-end justify-between px-1">
          <h2 className="text-xl font-bold text-gray-900">今日菜单</h2>
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
            {formatDateShort(selectedDate)}
          </span>
        </div>

        <div className="space-y-4">
          {MEAL_TYPES.map((mealType) => {
            const menu = menuByType.get(mealType)
            const booking = bookingByType.get(mealType) ?? null
            const isOpen = !!menu && menu.booking_status === 'open'
            const selected = booking?.selected_items ?? []
            const total = selected.reduce((sum, item) => sum + item.quantity, 0)

            return (
              <section
                key={mealType}
                className={`rounded-xl border bg-white p-4 shadow-sm ${
                  booking ? 'border-primary/25' : isOpen ? 'border-gray-100' : 'border-gray-100 opacity-80'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon name={mealType === 'breakfast' ? 'wb_twilight' : mealType === 'lunch' ? 'wb_sunny' : 'dark_mode'} className="text-primary text-[20px]" />
                      <h3 className="text-base font-bold text-gray-900">{MEAL_LABELS[mealType]}</h3>
                    </div>
                    <p className="mt-1 text-xs text-gray-400">{isOpen ? '可以报饭' : '不可报饭'}</p>
                  </div>
                  {booking && (
                    <span className="shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-xs font-bold text-green-700">
                      已报 {total} 份
                    </span>
                  )}
                </div>

                {menu?.items?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {menu.items.map((item) => (
                      <span key={item} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-gray-400">管理员暂未发布该餐信息</p>
                )}

                {selected.length > 0 && (
                  <div className="mt-3 rounded-lg bg-primary/5 px-3 py-2 text-xs text-primary">
                    {selected.map((item) => `${item.name} x ${item.quantity}`).join('，')}
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    disabled={!isOpen || loadingAction === menu?.id}
                    onClick={() => menu && openBookingPanel(menu)}
                    className="h-10 flex-1 rounded-lg bg-primary px-4 text-sm font-bold text-white disabled:bg-gray-300 disabled:shadow-none"
                  >
                    {booking ? '修改报饭' : isOpen ? '进入报饭' : '不可报饭'}
                  </button>
                  {booking && (
                    <button
                      type="button"
                      disabled={loadingAction === booking.menu_id}
                      onClick={() => handleCancel(booking)}
                      className="h-10 rounded-lg border border-red-100 bg-red-50 px-4 text-sm font-bold text-red-500 disabled:opacity-50"
                    >
                      取消
                    </button>
                  )}
                </div>
              </section>
            )
          })}
        </div>

        {false && (menus.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Icon name="restaurant" className="mx-auto mb-3 text-5xl" />
            <p className="text-sm font-medium">该日暂无菜单</p>
            <p className="text-xs mt-1">请选择其他日期或联系管理员</p>
          </div>
        ) : (
          menus.map((menu) => {
            const booking = bookings.find((b) => b.menu_id === menu.id && b.status === 'booked') || null
            return (
              <MealCard
                key={menu.id}
                menu={menu}
                booking={booking}
                onBook={() => handleBook(menu)}
                onCancel={() => booking && handleCancel(booking)}
                loading={loadingAction === menu.id}
              />
            )
          })
        ))}
      </main>

      {activeMenu && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/30 px-4 pb-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">{MEAL_LABELS[activeMenu.meal_type]}报饭</h3>
                <p className="mt-1 text-xs text-gray-400">{activeMenu.date}</p>
              </div>
              <button type="button" onClick={() => setActiveMenu(null)} className="size-9 rounded-full bg-gray-100 text-gray-500">
                <Icon name="close" className="text-[20px]" />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {activeMenu.items.map((item) => (
                <div key={item} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 p-3">
                  <span className="min-w-0 flex-1 break-words text-sm font-bold text-gray-900">{item}</span>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => changeQuantity(item, -1)} className="size-8 rounded-full bg-white text-primary shadow-sm">
                      <Icon name="remove" className="text-[18px]" />
                    </button>
                    <span className="w-6 text-center text-sm font-bold text-gray-900">{quantities[item] ?? 0}</span>
                    <button type="button" onClick={() => changeQuantity(item, 1)} className="size-8 rounded-full bg-primary text-white shadow-sm">
                      <Icon name="add" className="text-[18px]" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              disabled={selectedTotal === 0 || loadingAction === activeMenu.id}
              onClick={() => handleBook(activeMenu, selectedItems)}
              className="mt-4 h-11 w-full rounded-xl bg-primary text-sm font-bold text-white disabled:bg-gray-300"
            >
              {loadingAction === activeMenu.id ? '提交中...' : `提交报饭（${selectedTotal} 份）`}
            </button>
          </div>
        </div>
      )}

      {/* Summary Bar */}
      <div className="fixed bottom-0 left-0 w-full z-50 p-4 bg-gradient-to-t from-background-light via-background-light to-transparent pointer-events-none">
        <div className="bg-primary text-white p-4 rounded-xl shadow-xl shadow-primary/20 flex items-center justify-between pointer-events-auto backdrop-blur-sm bg-opacity-95 max-w-md mx-auto">
          <div className="flex flex-col">
            <span className="text-xs font-medium opacity-80">今日汇总</span>
            <span className="text-sm font-bold">已预订 {bookedCount} 餐</span>
          </div>
        </div>
      </div>

      <div className="fixed top-0 left-0 w-full h-64 bg-primary/5 -z-10 rounded-b-[3rem]" />
    </div>
  )
}
