'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Icon from '@/components/Icon'

const tabs = [
  { href: '/dashboard', icon: 'home', label: '首页' },
  { href: '/profile', icon: 'person', label: '我的' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 w-full glass-nav z-50 pb-safe pt-2">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex min-w-0 flex-col items-center justify-center w-full gap-1 transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon name={tab.icon} className="text-[26px]" />
              <span
                className={`max-w-full truncate text-[10px] ${
                  isActive ? 'font-bold' : 'font-medium'
                }`}
              >
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
