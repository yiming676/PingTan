'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { fetchUnreadNotificationCount } from '@/lib/services/campus'
import { isAdminRole } from '@/lib/constants'
import { getGreeting, formatDateChinese } from '@/lib/utils'
import BottomNav from '@/components/BottomNav'
import Icon from '@/components/Icon'
import NotificationPanel from '@/components/NotificationPanel'
import MagicBento, { type MagicBentoItem } from '@/components/react-bits/MagicBento'
import ShinyText from '@/components/react-bits/ShinyText'
import SplitText from '@/components/react-bits/SplitText'
import StaggeredMenu, { type StaggeredMenuItem } from '@/components/react-bits/StaggeredMenu'

export default function DashboardPage() {
  const { user, profile, loading } = useAuth()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showBellMenu, setShowBellMenu] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [autoOpenedUserId, setAutoOpenedUserId] = useState<string | null>(null)

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
      items.push({
        title: '管理后台',
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
      items.splice(3, 0, { label: '管理后台', ariaLabel: '进入管理后台', link: '/admin' })
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
