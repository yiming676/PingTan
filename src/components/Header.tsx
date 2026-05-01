'use client'

import { useRouter } from 'next/navigation'
import Icon from '@/components/Icon'

interface HeaderProps {
  title: string
  showBack?: boolean
  rightIcon?: string
  rightBadge?: boolean
  onRightClick?: () => void
}

export default function Header({
  title,
  showBack = false,
  rightIcon,
  rightBadge,
  onRightClick,
}: HeaderProps) {
  const router = useRouter()

  return (
    <header className="sticky top-0 z-50 bg-background-light/90 backdrop-blur-md border-b border-gray-100">
      <div className="flex items-center justify-between px-4 py-3 h-14">
        {showBack ? (
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center size-10 rounded-full hover:bg-gray-100 active:scale-95 transition-all text-gray-800"
          >
            <Icon name="arrow_back" className="text-[24px]" />
          </button>
        ) : (
          <div className="w-10" />
        )}
        <h1 className="min-w-0 flex-1 px-2 text-center text-lg font-bold text-gray-900 truncate">
          {title}
        </h1>
        {rightIcon ? (
          <button
            onClick={onRightClick}
            className="flex items-center justify-center size-10 rounded-full hover:bg-gray-100 transition-colors relative"
          >
            <Icon name={rightIcon} className="text-gray-800 text-[24px]" />
            {rightBadge && (
              <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border border-white" />
            )}
          </button>
        ) : (
          <div className="w-10" />
        )}
      </div>
    </header>
  )
}
