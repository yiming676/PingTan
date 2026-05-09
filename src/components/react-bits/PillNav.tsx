'use client'

import { gsap } from 'gsap'
import { useEffect, useRef } from 'react'

export interface PillNavItem {
  key: string
  label: string
}

interface PillNavProps {
  items: PillNavItem[]
  activeKey?: string
  onSelect: (key: string) => void
  className?: string
}

export default function PillNav({ items, activeKey, onSelect, className = '' }: PillNavProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '[data-pill-item]',
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.35, stagger: 0.035, ease: 'power2.out' }
      )
    }, ref)
    return () => ctx.revert()
  }, [items])

  return (
    <div ref={ref} className={`flex gap-2 overflow-x-auto hide-scrollbar ${className}`}>
      {items.map((item) => {
        const active = item.key === activeKey
        return (
          <button
            key={item.key}
            type="button"
            data-pill-item
            onClick={() => onSelect(item.key)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all ${
              active
                ? 'bg-primary text-white shadow-glow'
                : 'bg-white text-slate-600 shadow-sm ring-1 ring-slate-100 hover:text-primary'
            }`}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
