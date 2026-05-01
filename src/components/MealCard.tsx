'use client'

import type { MealMenu, MealBooking } from '@/lib/types'
import { getMealTypeName, getMealTypeIcon, getMealTypeIconColor } from '@/lib/utils'
import Icon from '@/components/Icon'

interface MealCardProps {
  menu: MealMenu
  booking: MealBooking | null
  onBook: () => void
  onCancel: () => void
  loading?: boolean
}

export default function MealCard({
  menu,
  booking,
  onBook,
  onCancel,
  loading,
}: MealCardProps) {
  const isBooked = booking && booking.status === 'booked'
  const isClosed = menu.booking_status === 'closed'
  const items: string[] = Array.isArray(menu.items) ? menu.items : []

  return (
    <div
      className={`bg-surface-light rounded-xl shadow-card overflow-hidden relative transition-all duration-300 ${
        isBooked
          ? 'border border-primary/20'
          : 'border border-gray-100 group hover:shadow-soft'
      }`}
    >
      {/* 已预订左侧条 */}
      {isBooked && (
        <div className="absolute top-0 left-0 w-1.5 h-full bg-primary z-10" />
      )}

      {/* 图片区域 */}
      <div className="relative h-28 overflow-hidden">
        {menu.image_url ? (
          <img
            alt={getMealTypeName(menu.meal_type)}
            className={`w-full h-full object-cover ${
              !isBooked ? 'group-hover:scale-105 transition-transform duration-700' : ''
            }`}
            src={menu.image_url}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
            <Icon name="restaurant" className="text-primary text-4xl" />
          </div>
        )}
        <div
          className={`absolute inset-0 ${
            isBooked
              ? 'bg-gradient-to-t from-primary/90 to-primary/20 mix-blend-multiply'
              : 'bg-gradient-to-t from-black/70 to-transparent'
          }`}
        />
        <div className={`absolute bottom-3 ${isBooked ? 'left-6' : 'left-4'} text-white z-10`}>
          <div className="flex items-center gap-2 mb-0.5">
            <Icon
              name={getMealTypeIcon(menu.meal_type)}
              className={getMealTypeIconColor(menu.meal_type)}
              style={{ fontSize: '20px' }}
            />
            <h3 className="text-lg font-bold">{getMealTypeName(menu.meal_type)}</h3>
          </div>
          {menu.time_range && (
            <p className="text-xs font-medium text-white/80 pl-0.5">
              {menu.time_range}
            </p>
          )}
        </div>

        {/* 已预订徽章 */}
        {isBooked && (
          <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-md border border-white/30 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
            <Icon name="check_circle" style={{ fontSize: '14px' }} />
            已报饭
          </div>
        )}
        {!isBooked && isClosed && (
          <div className="absolute top-3 right-3 bg-black/35 backdrop-blur-md border border-white/25 text-white px-3 py-1 rounded-full text-xs font-bold">
            已截止
          </div>
        )}
      </div>

      {/* 内容区域 */}
      <div className={`p-4 ${isBooked ? 'pl-6' : ''}`}>
        {isBooked ? (
          <>
            <div className="mb-4">
              <p className="text-sm text-gray-800 leading-relaxed font-medium">
                {items.join(', ')}
              </p>
              {menu.description && (
                <p className="text-xs text-gray-400 mt-1">{menu.description}</p>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
              <div className="flex items-center gap-2 text-primary">
                <Icon name="restaurant" style={{ fontSize: '18px' }} />
                <span className="text-xs font-bold">已确认用餐</span>
              </div>
              <button
                onClick={onCancel}
                disabled={loading}
                className="shrink-0 text-red-500 hover:text-red-600 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors border border-transparent hover:border-red-100 disabled:opacity-50"
              >
                {loading ? '处理中...' : '取消预订'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex gap-3 mb-4 flex-wrap">
              {items.map((item, idx) => (
                <span
                  key={idx}
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    idx === 0
                      ? menu.meal_type === 'breakfast'
                        ? 'bg-orange-50 text-orange-700'
                        : menu.meal_type === 'dinner'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-green-50 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {item}
                </span>
              ))}
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex flex-col">
                <span className="text-xs text-gray-400">状态</span>
                <span className="text-sm font-medium text-gray-500">{isClosed ? '已截止' : '开放报饭'}</span>
              </div>
              <button
                onClick={onBook}
                disabled={loading || isClosed}
                className="flex shrink-0 items-center justify-center h-10 px-5 bg-primary hover:bg-primary-dark text-white text-sm font-bold rounded-lg shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none disabled:bg-gray-300"
              >
                <Icon name={isClosed ? 'lock' : 'add_circle'} className="mr-1" style={{ fontSize: '18px' }} />
                {loading ? '报饭中...' : isClosed ? '已截止' : '立即报饭'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
