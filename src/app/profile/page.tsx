'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { fetchMyTickets, fetchRecentBookings, uploadProfileAvatar } from '@/lib/services/campus'
import { isAdminRole, ROLE_LABELS } from '@/lib/constants'
import BottomNav from '@/components/BottomNav'
import Icon from '@/components/Icon'
import Toast from '@/components/Toast'
import type { MealBooking, RepairTicket } from '@/lib/types'

export default function ProfilePage() {
  const router = useRouter()
  const { user, profile, signOut, loading } = useAuth()
  const supabase = createClient()
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const [recentBookings, setRecentBookings] = useState<MealBooking[]>([])
  const [recentTickets, setRecentTickets] = useState<RepairTicket[]>([])
  const [uploadedAvatarUrl, setUploadedAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (!user) return
    let active = true
    const load = async () => {
      const [bk, tk] = await Promise.all([
        fetchRecentBookings(supabase, user.id, 5),
        fetchMyTickets(supabase, user.id, 5),
      ])
      if (!active) return
      setRecentBookings(bk.bookings)
      setRecentTickets(tk.tickets)
    }
    void load()
    return () => {
      active = false
    }
  }, [user, supabase])

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    if (!file.type.startsWith('image/')) {
      setToast({ message: '请选择图片文件', type: 'error' })
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      setToast({ message: '头像图片不能超过 3MB', type: 'error' })
      return
    }

    setUploadingAvatar(true)
    const { url, error } = await uploadProfileAvatar(supabase, user.id, file)
    setUploadingAvatar(false)
    if (avatarInputRef.current) avatarInputRef.current.value = ''

    if (error || !url) {
      setToast({ message: '头像上传失败：' + (error?.message || '未知错误'), type: 'error' })
      return
    }

    setUploadedAvatarUrl(url)
    setToast({ message: '头像已更新', type: 'success' })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light">
        <Icon name="progress_activity" className="text-primary text-4xl animate-spin" />
      </div>
    )
  }

  const getMealLabel = (type: string) => {
    const m: Record<string, string> = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐' }
    return m[type] || type
  }

  const getStatusStyle = (status: string) => {
    if (status === '处理中') return 'bg-blue-50 text-blue-700'
    if (status === '已完成') return 'bg-green-50 text-green-700'
    return 'bg-amber-50 text-amber-700'
  }

  const contactEmail = profile?.email || (user?.email?.endsWith('@auth.pingtan.local') ? null : user?.email)
  const username = contactEmail?.split('@')[0] || profile?.phone || user?.email?.split('@')[0] || '用户'
  const displayName = profile?.name && profile.name !== '老师' ? profile.name : username
  const avatarUrl = uploadedAvatarUrl ?? profile?.avatar_url ?? null

  return (
    <div className="relative min-h-screen w-full flex flex-col pb-24 max-w-md mx-auto bg-background-light">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Profile Header */}
      <div className="bg-gradient-to-b from-primary/10 to-transparent pt-14 pb-6 px-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="relative h-20 w-20 shrink-0 rounded-full bg-white border-2 border-white shadow-md flex items-center justify-center overflow-hidden disabled:opacity-70"
            aria-label="上传头像"
          >
            {avatarUrl ? (
              <img alt="头像" className="h-full w-full object-cover" src={avatarUrl} />
            ) : (
              <Icon name="person" className="text-primary text-4xl" />
            )}
            <span className="absolute bottom-0 right-0 flex size-7 items-center justify-center rounded-full bg-primary text-white shadow-md">
              <Icon name={uploadingAvatar ? 'progress_activity' : 'photo_camera'} className={uploadingAvatar ? 'animate-spin text-[16px]' : 'text-[16px]'} />
            </span>
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <div className="min-w-0 flex-1">
            <h1 className="max-w-full text-xl font-bold text-gray-900 break-words">{displayName}</h1>
            {isAdminRole(profile?.role) && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary mt-1">
                {profile ? ROLE_LABELS[profile.role] : '管理员'}
              </span>
            )}
          </div>
        </div>
      </div>

      <main className="flex-1 px-5 space-y-6">
        {/* Info Card */}
        <section className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-gray-500 mb-3">个人信息</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-600">
                <Icon name="mail" className="text-[18px]" />
                <span className="text-sm">邮箱</span>
              </div>
              <span className="min-w-0 text-right text-sm text-gray-900 font-medium break-all">{profile?.email || user?.email || '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-600">
                <Icon name="phone" className="text-[18px]" />
                <span className="text-sm">手机</span>
              </div>
              <span className="min-w-0 text-right text-sm text-gray-900 font-medium break-all">{profile?.phone || '未设置'}</span>
            </div>
          </div>
        </section>

        {/* Recent Bookings */}
        <section className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-500">最近订餐</h3>
            <button onClick={() => router.push('/canteen')} className="text-xs text-primary font-bold">查看全部</button>
          </div>
          {recentBookings.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">暂无订餐记录</p>
          ) : (
            <div className="space-y-2">
              {recentBookings.map((b) => (
                <div key={b.id} className="flex items-start justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-gray-900">{getMealLabel(b.meal_type)}</span>
                    <span className="text-xs text-gray-400 ml-2">{b.date}</span>
                    {b.selected_items?.length > 0 && (
                      <p className="mt-1 truncate text-xs text-gray-400">{b.selected_items.map((item) => `${item.name} x ${item.quantity}`).join('，')}</p>
                    )}
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${b.status === 'booked' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {b.status === 'booked' ? '已预订' : '已取消'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent Tickets */}
        <section className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-500">最近报修</h3>
            <button onClick={() => router.push('/repair')} className="text-xs text-primary font-bold">查看全部</button>
          </div>
          {recentTickets.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">暂无报修记录</p>
          ) : (
            <div className="space-y-2">
              {recentTickets.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <span className="text-sm font-medium text-gray-900">{t.fault_type}</span>
                    <span className="text-xs text-gray-400 ml-2">{t.location}</span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getStatusStyle(t.status)}`}>{t.status}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {isAdminRole(profile?.role) && (
          <button
            onClick={() => router.push('/admin')}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-semibold shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
          >
            <Icon name="admin_panel_settings" className="text-[20px]" />
            管理后台
          </button>
        )}

        {/* Logout */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-200 text-red-500 font-semibold hover:bg-red-50 transition-colors"
        >
          <Icon name="logout" className="text-[20px]" />
          退出登录
        </button>
      </main>

      <BottomNav />
    </div>
  )
}
