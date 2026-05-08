'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  createRepairTicket,
  deleteRepairImageFile,
  fetchMyTickets,
} from '@/lib/services/campus'
import { TICKET_STATUS_LABELS } from '@/lib/constants'
import Header from '@/components/Header'
import Icon from '@/components/Icon'
import RepairTypeButton from '@/components/RepairTypeButton'
import ImageUploader from '@/components/ImageUploader'
import ImagePreviewModal from '@/components/ImagePreviewModal'
import Toast from '@/components/Toast'
import type { FaultType, RepairTicket, TicketStatus, UploadedImage } from '@/lib/types'

const FAULT_TYPES: { type: FaultType; icon: string }[] = [
  { type: '水电门窗', icon: 'home_repair_service' },
  { type: '多媒体', icon: 'router' },
  { type: '空调', icon: 'ac_unit' },
  { type: '其他', icon: 'more_horiz' },
]

const QUICK_LOCATIONS = ['教学楼', '食堂', '宿舍', '办公楼', '实验楼', '图书馆', '操场', '体育馆']

function getTicketStatusLabel(status: string) {
  return TICKET_STATUS_LABELS[status as TicketStatus] ?? status
}

export default function RepairPage() {
  const { user } = useAuth()

  const [faultType, setFaultType] = useState<FaultType | null>(null)
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [images, setImages] = useState<UploadedImage[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [myTickets, setMyTickets] = useState<RepairTicket[]>([])
  const [showTickets, setShowTickets] = useState(false)
  const [previewImage, setPreviewImage] = useState<{ url: string; alt: string; fileName?: string } | null>(null)

  const loadTickets = useCallback(async () => {
    if (!user) return
    const { tickets } = await fetchMyTickets(user.id, 20)
    setMyTickets(tickets)
  }, [user])

  useEffect(() => {
    void loadTickets()
  }, [loadTickets])

  useEffect(() => {
    if (!user) return
    const intervalId = window.setInterval(() => {
      void loadTickets()
    }, 30000)
    return () => {
      window.clearInterval(intervalId)
    }
  }, [loadTickets, user])

  const handleSubmit = async () => {
    if (!user || !faultType || !location || !description) {
      setToast({ message: '请填写所有必填项', type: 'error' })
      return
    }

    setSubmitting(true)

    const { error, ticket } = await createRepairTicket({
      userId: user.id,
      faultType,
      location,
      description,
      images,
    })

    if (error || !ticket) {
      if (!ticket) {
        await Promise.all(images.map((image) => deleteRepairImageFile(image.path)))
      }
      setToast({ message: `提交失败：${error?.message || '未知错误'}`, type: 'error' })
      setSubmitting(false)
      return
    }

    setToast({ message: '报修提交成功！', type: 'success' })
    setFaultType(null)
    setLocation('')
    setDescription('')
    setImages([])
    setSubmitting(false)
    await loadTickets()
  }

  const getStatusStyle = (status: string) => {
    if (status === 'processing') return 'bg-blue-50 text-blue-700'
    if (status === 'completed') return 'bg-green-50 text-green-700'
    return 'bg-amber-50 text-amber-700'
  }

  return (
    <div className="bg-background-light font-display text-gray-900 min-h-screen">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <ImagePreviewModal image={previewImage} onClose={() => setPreviewImage(null)} />

      <Header title="设施报修" showBack />

      <main className="flex flex-col w-full max-w-lg mx-auto p-4 space-y-6 pb-40">
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

        <section className="bg-surface-light rounded-2xl shadow-soft p-5 border border-gray-100">
          <label className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Icon name="location_on" className="text-primary text-[20px]" />
              <span className="text-base font-bold text-gray-900">故障地点</span>
            </div>
            <div className="relative group">
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-base rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary block p-4 pl-4 pr-12 transition-all placeholder:text-gray-400"
                placeholder="请选择或输入地点，例如 教学楼 302"
                type="text"
                list="repair-location-options"
              />
              <datalist id="repair-location-options">
                {QUICK_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc} />
                ))}
              </datalist>
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                <Icon name="search" className="text-gray-400 group-focus-within:text-primary transition-colors" />
              </div>
            </div>
            <div className="flex gap-2 mt-1 flex-wrap">
              {QUICK_LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLocation(loc)}
                  className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    location === loc
                      ? 'bg-primary/10 text-primary'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
          </label>
        </section>

        <section className="bg-surface-light rounded-2xl shadow-soft p-5 border border-gray-100">
          <label className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Icon name="description" className="text-primary text-[20px]" />
              <span className="text-base font-bold text-gray-900">故障描述</span>
            </div>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-base rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary block p-4 transition-all placeholder:text-gray-400 resize-none"
              placeholder="请详细描述故障情况，便于维修人员快速处理"
              rows={4}
            />
          </label>
        </section>

        <section className="bg-surface-light rounded-2xl shadow-soft p-5 border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Icon name="photo_camera" className="text-primary text-[20px]" />
              <span className="text-base font-bold text-gray-900">现场照片</span>
            </div>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">最多 3 张</span>
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

        {myTickets.length > 0 && (
          <section>
            <button
              type="button"
              onClick={() => setShowTickets(!showTickets)}
              className="flex items-center gap-2 text-sm font-bold text-gray-500 mb-3 px-1"
            >
              <Icon name={showTickets ? 'expand_less' : 'expand_more'} className="text-[18px]" />
              我的工单 ({myTickets.length})
            </button>
            {showTickets && (
              <div className="space-y-3">
                {myTickets.map((ticket) => (
                  <div key={ticket.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="min-w-0 text-sm font-bold text-gray-900 break-words">{ticket.fault_type} · {ticket.location}</span>
                      <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${getStatusStyle(ticket.status)}`}>
                        {getTicketStatusLabel(ticket.status)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2">{ticket.description}</p>
                    {ticket.repair_images && ticket.repair_images.length > 0 && (
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {ticket.repair_images.map((image, index) => (
                          <button
                            key={image.id}
                            type="button"
                            onClick={() => setPreviewImage({ url: image.image_url, alt: `现场照片 ${index + 1}`, fileName: image.storage_path.split('/').pop() })}
                            className="aspect-square w-full overflow-hidden rounded-lg bg-gray-100"
                            aria-label={`查看现场照片 ${index + 1}`}
                          >
                            <img
                              alt={`现场照片 ${index + 1}`}
                              className="h-full w-full object-cover"
                              src={image.image_url}
                            />
                          </button>
                        ))}
                      </div>
                    )}
                    {ticket.result_text && (
                      <div className="mt-3 rounded-lg bg-green-50 p-3">
                        <p className="text-xs font-bold text-green-700">维修结果</p>
                        <p className="mt-1 text-xs text-gray-600">{ticket.result_text}</p>
                        {ticket.result_image_url && (
                          <button
                            type="button"
                            onClick={() => setPreviewImage({ url: ticket.result_image_url!, alt: '维修结果照片', fileName: ticket.result_image_path?.split('/').pop() })}
                            className="mt-2 block h-28 w-full overflow-hidden rounded-lg bg-gray-100"
                            aria-label="查看维修结果照片"
                          >
                            <img alt="维修结果照片" className="h-full w-full object-cover" src={ticket.result_image_url} />
                          </button>
                        )}
                      </div>
                    )}
                    <p className="text-[10px] text-gray-400 mt-2">
                      {new Date(ticket.created_at).toLocaleString('zh-CN')}
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

      <div className="fixed bottom-0 left-0 w-full bg-surface-light/80 backdrop-blur-xl border-t border-gray-200 p-4 pb-8 z-40">
        <button
          type="button"
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
