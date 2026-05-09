'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'

export interface MagicBentoItem {
  title: string
  description: string
  label?: string
  icon?: ReactNode
  href?: string
  onClick?: () => void
  color?: string
  accent?: string
  badge?: ReactNode
}

interface MagicBentoProps {
  items: MagicBentoItem[]
  className?: string
  disableAnimations?: boolean
}

function CardShell({
  item,
  children,
  className,
}: {
  item: MagicBentoItem
  children: ReactNode
  className: string
}) {
  if (item.href) {
    return (
      <Link href={item.href} className={className}>
        {children}
      </Link>
    )
  }

  return (
    <button type="button" onClick={item.onClick} className={`${className} text-left`}>
      {children}
    </button>
  )
}

export default function MagicBento({ items, className = '', disableAnimations = false }: MagicBentoProps) {
  return (
    <div className={`grid grid-cols-2 gap-3 ${className}`}>
      {items.map((item, index) => {
        const accent = item.accent ?? '45, 118, 112'
        const base = item.color ?? '#ffffff'
        const content = (
          <>
            <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <div
                className="absolute inset-0"
                style={{
                  background: `radial-gradient(circle at 24% 16%, rgba(${accent}, 0.18), transparent 44%)`,
                }}
              />
            </div>
            <div className="relative z-10 flex h-full flex-col justify-between gap-4">
              <div className="flex items-start justify-between gap-2">
                <div
                  className="flex size-11 items-center justify-center rounded-xl text-xl shadow-sm"
                  style={{ background: `rgba(${accent}, 0.12)`, color: `rgb(${accent})` }}
                >
                  {item.icon}
                </div>
                {item.badge}
              </div>
              <div className="min-w-0">
                {item.label && <p className="mb-1 text-[10px] font-bold uppercase text-slate-400">{item.label}</p>}
                <h4 className="text-base font-extrabold leading-tight text-slate-900">{item.title}</h4>
                <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-slate-500">{item.description}</p>
              </div>
            </div>
          </>
        )

        return (
          <motion.div
            key={`${item.title}-${index}`}
            whileHover={disableAnimations ? undefined : { y: -3, scale: 1.01 }}
            whileTap={disableAnimations ? undefined : { scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className={index === 0 && items.length > 3 ? 'col-span-2' : ''}
          >
            <CardShell
              item={item}
              className="group relative block h-full min-h-[132px] w-full overflow-hidden rounded-2xl border border-slate-100 p-4 shadow-card transition-shadow hover:shadow-soft"
            >
              <span
                className="absolute inset-0"
                style={{
                  background: base,
                  boxShadow: `inset 0 0 0 1px rgba(${accent}, 0.04)`,
                }}
              />
              {content}
            </CardShell>
          </motion.div>
        )
      })}
    </div>
  )
}
