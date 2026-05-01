// ============================================================
// 工具函数
// ============================================================

/**
 * 根据当前小时返回中文问候语
 */
export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 12) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

/**
 * 格式化日期为中文: "2024年10月24日 · 星期二"
 */
export function formatDateChinese(date: Date): string {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  const weekday = weekdays[date.getDay()]
  return `${year}年${month}月${day}日 · 星期${weekday}`
}

/**
 * 格式化短日期: "10月24日 · 星期二"
 */
export function formatDateShort(date: Date): string {
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  const weekday = weekdays[date.getDay()]
  return `${month}月${day}日 · 星期${weekday}`
}

/**
 * 获取一周的日期列表（以周日为第一天）
 */
export function getWeekDates(centerDate: Date): Date[] {
  const result: Date[] = []
  const day = centerDate.getDay() // 0=Sun, 1=Mon...
  const sunday = new Date(centerDate)
  sunday.setDate(centerDate.getDate() - day)

  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday)
    d.setDate(sunday.getDate() + i)
    result.push(d)
  }
  return result
}

/**
 * 格式化 ISO 日期为 YYYY-MM-DD
 */
export function toDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * 中文星期映射
 */
export function getWeekdayName(date: Date): string {
  const names = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return names[date.getDay()]
}

/**
 * 餐次中文名称
 */
export function getMealTypeName(type: string): string {
  const map: Record<string, string> = {
    breakfast: '早餐',
    lunch: '午餐',
    dinner: '晚餐',
  }
  return map[type] || type
}

/**
 * 餐次图标名称（Material Symbols）
 */
export function getMealTypeIcon(type: string): string {
  const map: Record<string, string> = {
    breakfast: 'wb_twilight',
    lunch: 'wb_sunny',
    dinner: 'dark_mode',
  }
  return map[type] || 'restaurant'
}

/**
 * 餐次图标颜色
 */
export function getMealTypeIconColor(type: string): string {
  const map: Record<string, string> = {
    breakfast: 'text-yellow-300',
    lunch: 'text-yellow-200',
    dinner: 'text-blue-300',
  }
  return map[type] || 'text-white'
}

export function isEmailIdentifier(identifier: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier.trim())
}

export function normalizePhoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (/^86\d{11}$/.test(digits)) return digits.slice(2)
  return digits
}

export function formatPhoneForDisplay(phone: string): string {
  const digits = normalizePhoneDigits(phone)
  if (/^1\d{10}$/.test(digits)) return digits
  return phone.trim().replace(/\s+/g, '')
}
