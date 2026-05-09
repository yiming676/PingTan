'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

export interface GlassIconsItem {
  icon: ReactNode
  color: string
  label: string
  href?: string
  active?: boolean
}

interface GlassIconsProps {
  items: GlassIconsItem[]
  className?: string
}

const gradients: Record<string, string> = {
  teal: 'linear-gradient(135deg, #2d7670, #48a096)',
  blue: 'linear-gradient(135deg, #2563eb, #38bdf8)',
  green: 'linear-gradient(135deg, #16a34a, #86efac)',
  orange: 'linear-gradient(135deg, #f97316, #facc15)',
}

function GlassButton({ item }: { item: GlassIconsItem }) {
  const icon = (
    <span className="relative block size-11">
      <span
        className={`absolute inset-0 rounded-2xl transition-transform duration-300 group-hover:-translate-x-1 group-hover:-translate-y-1 group-hover:rotate-6 ${
          item.active ? 'opacity-100' : 'opacity-70'
        }`}
        style={{ background: gradients[item.color] ?? item.color }}
      />
      <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/20 text-white shadow-sm backdrop-blur-md ring-1 ring-white/40 transition-transform duration-300 group-hover:translate-z-4">
        {item.icon}
      </span>
    </span>
  )
  const label = (
    <span className={`text-[10px] font-bold leading-none ${item.active ? 'text-primary' : 'text-slate-400'}`}>
      {item.label}
    </span>
  )

  const className = 'group relative flex w-full flex-col items-center justify-center gap-1'

  if (item.href) {
    return (
      <Link href={item.href} className={className}>
        {icon}
        {label}
      </Link>
    )
  }

  return (
    <button type="button" className={className}>
      {icon}
      {label}
    </button>
  )
}

export default function GlassIcons({ items, className = '' }: GlassIconsProps) {
  return (
    <div className={`grid grid-cols-2 items-center gap-2 ${className}`}>
      {items.map((item) => (
        <GlassButton key={item.label} item={item} />
      ))}
    </div>
  )
}
