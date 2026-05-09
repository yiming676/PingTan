'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchNotifications, markNotificationsRead } from '@/lib/services/campus'
import Icon from '@/components/Icon'
import ScrollStack, { ScrollStackItem } from '@/components/react-bits/ScrollStack'
import type { Notification } from '@/lib/types'

interface NotificationPanelProps {
  open: boolean
  onClose: () => void
  onNotificationsRead?: () => void
}

export default function NotificationPanel({ open, onClose, onNotificationsRead }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const { notifications } = await fetchNotifications(20)
    setNotifications(notifications)
    setLoading(false)
    const ids = notifications.map((notification) => notification.id)
    const { error } = await markNotificationsRead(ids)
    if (!error) onNotificationsRead?.()
  }, [onNotificationsRead])

  useEffect(() => {
    if (!open) return

    let active = true
    const loadingTimer = window.setTimeout(() => setLoading(true), 0)

    const loadNotifications = async () => {
      const { notifications } = await fetchNotifications(20)
      if (!active) return
      setNotifications(notifications)
      setLoading(false)
      const ids = notifications.map((notification) => notification.id)
      const { error } = await markNotificationsRead(ids)
      if (!error && active) onNotificationsRead?.()
    }

    void loadNotifications()

    return () => {
      window.clearTimeout(loadingTimer)
      active = false
    }
  }, [onNotificationsRead, open])

  useEffect(() => {
    if (!open) return
    const intervalId = window.setInterval(() => {
      void fetchData()
    }, 30000)
    return () => {
      window.clearInterval(intervalId)
    }
  }, [fetchData, open])

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
      <div className="relative bg-white rounded-t-2xl w-full max-w-md max-h-[74vh] flex flex-col shadow-2xl toast-enter">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">通知公告</h2>
          <button onClick={onClose} className="size-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
            <Icon name="close" className="text-gray-500 text-[20px]" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Icon name="progress_activity" className="text-primary text-3xl animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Icon name="notifications_off" className="mx-auto mb-2 text-4xl" />
            <p className="text-sm">暂无通知</p>
          </div>
        ) : (
          <ScrollStack className="flex-1 px-5 py-4">
            {notifications.map((notification) => (
              <ScrollStackItem key={notification.id}>
                <div className="flex items-start gap-3">
                  <span className={`inline-flex shrink-0 items-center px-2 py-0.5 rounded-md text-xs font-bold border ${getTypeStyle(notification.type)}`}>
                    {getTypeLabel(notification.type)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="mb-1 break-words text-sm font-bold text-gray-900">{notification.title}</h3>
                    <p className="break-words text-xs leading-relaxed text-gray-500">{notification.content}</p>
                    <p className="mt-2 text-[10px] text-gray-400">
                      {new Date(notification.created_at).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                </div>
              </ScrollStackItem>
            ))}
          </ScrollStack>
        )}
      </div>
    </div>
  )
}
