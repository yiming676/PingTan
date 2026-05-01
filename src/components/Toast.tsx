'use client'

import { useEffect, useState } from 'react'
import Icon from '@/components/Icon'

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  onClose: () => void
  duration?: number
}

export default function Toast({ message, type = 'success', onClose, duration = 3000 }: ToastProps) {
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true)
      setTimeout(onClose, 200)
    }, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose])

  const bgColor = type === 'error' ? 'bg-red-500' : type === 'info' ? 'bg-blue-500' : 'bg-primary'
  const icon = type === 'error' ? 'error' : type === 'info' ? 'info' : 'check_circle'

  return (
    <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] ${exiting ? 'toast-exit' : 'toast-enter'}`}>
      <div className={`${bgColor} text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 min-w-[200px]`}>
        <Icon name={icon} className="text-[20px]" />
        <span className="text-sm font-medium break-words">{message}</span>
      </div>
    </div>
  )
}
