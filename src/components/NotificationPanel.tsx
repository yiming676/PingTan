'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fetchNotifications } from '@/lib/services/campus'
import Icon from '@/components/Icon'
import type { Notification } from '@/lib/types'

interface NotificationPanelProps {
  open: boolean
  onClose: () => void
}

export default function NotificationPanel({ open, onClose }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { notifications } = await fetchNotifications(supabase, 20)
    setNotifications(notifications)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    if (!open) return
    void fetchData()
  }, [fetchData, open])

  useEffect(() => {
    if (!open) return

    const channel = supabase
      .channel('notifications-panel-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        void fetchData()
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [fetchData, open, supabase])

  if (!open) return null

  const getTypeStyle = (type: string) => {
    if (type === 'warning') return 'bg-amber-50 text-amber-700 border-amber-200'
    if (type === 'urgent') return 'bg-red-50 text-red-700 border-red-200'
    return 'bg-blue-50 text-blue-700 border-blue-200'
  }

  const getTypeLabel = (type: string) => {
    if (type === 'warning') return '注意'
    if (type === 'urgent') return '紧急'
    return '通知'
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl w-full max-w-md max-h-[70vh] flex flex-col shadow-2xl toast-enter">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">通知公告</h2>
          <button onClick={onClose} className="size-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
            <Icon name="close" className="text-gray-500 text-[20px]" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Icon name="progress_activity" className="text-primary text-3xl animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Icon name="notifications_off" className="mx-auto mb-2 text-4xl" />
              <p className="text-sm">暂无通知</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className={`inline-flex shrink-0 items-center px-2 py-0.5 rounded-md text-xs font-bold border ${getTypeStyle(n.type)}`}>
                    {getTypeLabel(n.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-gray-900 mb-1 break-words">{n.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed break-words">{n.content}</p>
                    <p className="text-[10px] text-gray-400 mt-2">
                      {new Date(n.created_at).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
