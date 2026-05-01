'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { isAdminRole } from '@/lib/constants'
import { getGreeting, formatDateChinese } from '@/lib/utils'
import BottomNav from '@/components/BottomNav'
import Icon from '@/components/Icon'
import NotificationPanel from '@/components/NotificationPanel'

export default function DashboardPage() {
  const { profile, loading } = useAuth()
  const [showNotifications, setShowNotifications] = useState(false)

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

  // 根据时间选择图标
  const hour = new Date().getHours()
  const weatherIcon = hour < 12 ? 'wb_sunny' : hour < 18 ? 'wb_sunny' : 'dark_mode'

  return (
    <div className="relative min-h-screen w-full flex flex-col pb-24 max-w-md mx-auto overflow-x-hidden shadow-2xl bg-background-light">
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-12 pb-4 sticky top-0 z-20 bg-background-light/95 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
            <Icon name="school" className="text-primary text-2xl" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-none">平潭二中</h1>
            <span className="text-xs text-slate-500 font-medium">移动智慧校园</span>
          </div>
        </div>
        <button
          onClick={() => setShowNotifications(true)}
          className="relative p-2 rounded-full hover:bg-slate-100 transition-colors group"
        >
          <Icon name="notifications" className="text-slate-600" />
          <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white" />
        </button>
      </header>

      <main className="flex-1 px-5 flex flex-col gap-6">
        {/* Greeting */}
        <section className="mt-2">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex flex-col gap-1">
              <h2 className="text-2xl font-extrabold text-slate-900 break-words">
                {greeting}，<br />{userName}
              </h2>
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

        {/* Quick Apps */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-sm font-bold text-slate-500">常用应用</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {/* 食堂订餐 */}
            <Link href="/canteen" className="bg-white p-4 rounded-xl shadow-card hover:shadow-soft transition-all active:scale-95 flex flex-col items-start gap-3 border border-slate-100">
              <div className="h-10 w-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                <Icon name="restaurant_menu" />
              </div>
              <div className="min-w-0 text-left">
                <span className="block text-base font-bold text-slate-900 leading-tight">食堂订餐</span>
                <span className="text-xs text-slate-400 font-medium mt-0.5 block">今日菜单已更新</span>
              </div>
            </Link>

            {/* 设施报修 */}
            <Link href="/repair" className="bg-white p-4 rounded-xl shadow-card hover:shadow-soft transition-all active:scale-95 flex flex-col items-start gap-3 border border-slate-100">
              <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <Icon name="build_circle" />
              </div>
              <div className="min-w-0 text-left">
                <span className="block text-base font-bold text-slate-900 leading-tight">设施报修</span>
                <span className="text-xs text-slate-400 font-medium mt-0.5 block">快速提交工单</span>
              </div>
            </Link>

            {/* 通知公告 */}
            <button
              onClick={() => setShowNotifications(true)}
              className="bg-white p-4 rounded-xl shadow-card hover:shadow-soft transition-all active:scale-95 flex flex-col items-start gap-3 border border-slate-100 relative overflow-hidden text-left"
            >
              <span className="absolute top-4 right-4 h-2 w-2 rounded-full bg-red-500" />
              <div className="h-10 w-10 rounded-full bg-teal-50 flex items-center justify-center text-teal-600">
                <Icon name="campaign" />
              </div>
              <div className="min-w-0">
                <span className="block text-base font-bold text-slate-900 leading-tight">通知公告</span>
                <span className="text-xs text-slate-400 font-medium mt-0.5 block">查看新消息</span>
              </div>
            </button>

            {isAdminRole(profile?.role) && (
              <Link href="/admin" className="bg-white p-4 rounded-xl shadow-card hover:shadow-soft transition-all active:scale-95 flex flex-col items-start gap-3 border border-slate-100">
                <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                  <Icon name="admin_panel_settings" />
                </div>
                <div className="min-w-0 text-left">
                  <span className="block text-base font-bold text-slate-900 leading-tight">管理后台</span>
                  <span className="text-xs text-slate-400 font-medium mt-0.5 block">处理校务数据</span>
                </div>
              </Link>
            )}
          </div>
        </section>
      </main>

      <BottomNav />
      <NotificationPanel open={showNotifications} onClose={() => setShowNotifications(false)} />
    </div>
  )
}
