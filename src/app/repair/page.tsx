'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import {
  createRepairTicket,
  deleteRepairImageFile,
  fetchMyTickets,
} from '@/lib/services/campus'
import Header from '@/components/Header'
import Icon from '@/components/Icon'
import RepairTypeButton from '@/components/RepairTypeButton'
import ImageUploader from '@/components/ImageUploader'
import Toast from '@/components/Toast'
import type { FaultType, RepairTicket, UploadedImage } from '@/lib/types'

const FAULT_TYPES: { type: FaultType; icon: string }[] = [
  { type: '水电门窗', icon: 'home_repair_service' },
  { type: '多媒体', icon: 'router' },
  { type: '空调', icon: 'ac_unit' },
  { type: '其他', icon: 'more_horiz' },
]

const QUICK_LOCATIONS = ['302教室', '办公楼2F', '实验楼3F', '图书馆']

export default function RepairPage() {
  const { user } = useAuth()
  const supabase = createClient()

  const [faultType, setFaultType] = useState<FaultType | null>(null)
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [images, setImages] = useState<UploadedImage[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [myTickets, setMyTickets] = useState<RepairTicket[]>([])
  const [showTickets, setShowTickets] = useState(false)

  const loadTickets = useCallback(async () => {
    if (!user) return
    const { tickets } = await fetchMyTickets(supabase, user.id, 10)
    setMyTickets(tickets)
  }, [supabase, user])

  useEffect(() => {
    if (!user) return
    let active = true

    fetchMyTickets(supabase, user.id, 10).then(({ tickets }) => {
      if (active) setMyTickets(tickets)
    })

    return () => {
      active = false
    }
  }, [supabase, user])

  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`repair-user-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'repair_tickets',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void loadTickets()
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [loadTickets, supabase, user])

  const handleSubmit = async () => {
    if (!user || !faultType || !location || !description) {
      setToast({ message: '请填写所有必填项', type: 'error' })
      return
    }

    setSubmitting(true)

    const { error, ticket } = await createRepairTicket(supabase, {
      userId: user.id,
      faultType,
      location,
      description,
      images,
    })

    if (error || !ticket) {
      if (!ticket) {
        await Promise.all(images.map((image) => deleteRepairImageFile(supabase, image.path)))
      }
      setToast({ message: '提交失败：' + (error?.message || '未知错误'), type: 'error' })
      setSubmitting(false)
      return
    }

    setToast({ message: '报修提交成功！', type: 'success' })

    // 清空表单
    setFaultType(null)
    setLocation('')
    setDescription('')
    setImages([])
    setSubmitting(false)

    await loadTickets()
  }

  const getStatusStyle = (status: string) => {
    if (status === '处理中') return 'bg-blue-50 text-blue-700'
    if (status === '已完成') return 'bg-green-50 text-green-700'
    return 'bg-amber-50 text-amber-700'
  }

  return (
    <div className="bg-background-light font-display text-gray-900 min-h-screen">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <Header title="设施报修" showBack />

      <main className="flex flex-col w-full max-w-lg mx-auto p-4 space-y-6 pb-40">
        {/* 故障类型 */}
        <section className="flex flex-col gap-3">
          <div className="flex justify-between items-baseline px-1">
            <h2 className="text-base font-bold text-gray-900">故障类型</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1 -mx-4 px-4 snap-x">
            {FAULT_TYPES.map(({ type, icon }) => (
              <RepairTypeButton
                key={type}
                type={type}
                icon={icon}
                selected={faultType === type}
                onClick={() => setFaultType(type)}
              />
            ))}
          </div>
        </section>

        {/* 故障地点 */}
        <section className="bg-surface-light rounded-2xl shadow-soft p-5 border border-gray-100">
          <label className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Icon name="location_on" className="text-primary text-[20px]" />
              <span className="text-base font-bold text-gray-900">故障地点</span>
            </div>
            <div className="relative group">
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-base rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary block p-4 pl-4 pr-12 transition-all placeholder:text-gray-400"
                placeholder="请输入或选择教室 (例如: 302教室)"
                type="text"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                <Icon name="search" className="text-gray-400 group-focus-within:text-primary transition-colors" />
              </div>
            </div>
            <div className="flex gap-2 mt-1 flex-wrap">
              {QUICK_LOCATIONS.map((loc) => (
                <span
                  key={loc}
                  onClick={() => setLocation(loc)}
                  className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                    location === loc
                      ? 'bg-primary/10 text-primary'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {loc}
                </span>
              ))}
            </div>
          </label>
        </section>

        {/* 故障描述 */}
        <section className="bg-surface-light rounded-2xl shadow-soft p-5 border border-gray-100">
          <label className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Icon name="description" className="text-primary text-[20px]" />
              <span className="text-base font-bold text-gray-900">故障描述</span>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-base rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary block p-4 transition-all placeholder:text-gray-400 resize-none"
              placeholder="请详细描述故障情况，以便维修人员快速处理..."
              rows={4}
            />
          </label>
        </section>

        {/* 现场照片 */}
        <section className="bg-surface-light rounded-2xl shadow-soft p-5 border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Icon name="photo_camera" className="text-primary text-[20px]" />
              <span className="text-base font-bold text-gray-900">现场照片</span>
            </div>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">最多3张</span>
          </div>
          {user && (
            <ImageUploader
              images={images}
              maxImages={3}
              userId={user.id}
              onImagesChange={setImages}
              onError={(message) => setToast({ message, type: 'error' })}
            />
          )}
        </section>

        {/* 我的工单 */}
        {myTickets.length > 0 && (
          <section>
            <button
              onClick={() => setShowTickets(!showTickets)}
              className="flex items-center gap-2 text-sm font-bold text-gray-500 mb-3 px-1"
            >
              <Icon name={showTickets ? 'expand_less' : 'expand_more'} className="text-[18px]" />
              我的工单 ({myTickets.length})
            </button>
            {showTickets && (
              <div className="space-y-3">
                {myTickets.map((t) => (
                  <div key={t.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="min-w-0 text-sm font-bold text-gray-900 break-words">{t.fault_type} — {t.location}</span>
                      <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${getStatusStyle(t.status)}`}>
                        {t.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2">{t.description}</p>
                    {t.result_text && (
                      <div className="mt-3 rounded-lg bg-green-50 p-3">
                        <p className="text-xs font-bold text-green-700">维修结果</p>
                        <p className="mt-1 text-xs text-gray-600">{t.result_text}</p>
                        {t.result_image_url && <img alt="维修结果" className="mt-2 h-28 w-full rounded-lg object-cover" src={t.result_image_url} />}
                      </div>
                    )}
                    <p className="text-[10px] text-gray-400 mt-2">
                      {new Date(t.created_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <div className="text-center pt-2">
          <p className="text-xs text-gray-400">平潭二中 · 校园服务</p>
        </div>
      </main>

      {/* Submit Button */}
      <div className="fixed bottom-0 left-0 w-full bg-surface-light/80 backdrop-blur-xl border-t border-gray-200 p-4 pb-8 z-40">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold text-lg py-4 px-6 rounded-2xl shadow-lg shadow-primary/25 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 max-w-lg mx-auto"
        >
          {submitting ? (
            <Icon name="progress_activity" className="animate-spin" />
          ) : (
            <Icon name="send" />
          )}
          {submitting ? '提交中...' : '提交报修'}
        </button>
      </div>
    </div>
  )
}
