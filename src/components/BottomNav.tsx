'use client'

import { usePathname } from 'next/navigation'
import Icon from '@/components/Icon'
import GlassIcons from '@/components/react-bits/GlassIcons'

const tabs = [
  { href: '/dashboard', icon: 'home', label: '首页', color: 'teal' },
  { href: '/profile', icon: 'person', label: '我的', color: 'blue' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 w-full glass-nav z-50 pb-safe pt-2">
      <div className="h-20 max-w-md mx-auto px-12">
        <GlassIcons
          className="h-full"
          items={tabs.map((tab) => ({
            href: tab.href,
            label: tab.label,
            color: tab.color,
            active: pathname === tab.href,
            icon: <Icon name={tab.icon} className="text-[24px]" />,
          }))}
        />
      </div>
    </nav>
  )
}
