'use client'

import type { FaultType } from '@/lib/types'
import Icon from '@/components/Icon'

interface RepairTypeButtonProps {
  type: FaultType
  icon: string
  selected: boolean
  onClick: () => void
}

export default function RepairTypeButton({
  type,
  icon,
  selected,
  onClick,
}: RepairTypeButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`group flex flex-col items-center justify-center min-w-[88px] h-[88px] shrink-0 gap-2 rounded-2xl shadow-card border transition-all snap-start ${
        selected
          ? 'bg-primary/5 border-primary/40 ring-2 ring-primary/20'
          : 'bg-surface-light border-gray-100 hover:border-primary/30'
      }`}
    >
      <div
        className={`size-8 rounded-full flex items-center justify-center transition-colors ${
          selected
            ? 'bg-primary/15 text-primary'
            : 'bg-gray-100 text-gray-500 group-hover:bg-primary/10 group-hover:text-primary'
        }`}
      >
        <Icon name={icon} className="text-[20px]" />
      </div>
      <span
        className={`max-w-full px-1 text-sm font-medium transition-colors truncate ${
          selected ? 'text-primary font-semibold' : 'text-gray-600'
        }`}
      >
        {type}
      </span>
    </button>
  )
}
