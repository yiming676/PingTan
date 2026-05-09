'use client'

import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from 'motion/react'
import type { ReactNode } from 'react'
import { useRef } from 'react'

export interface DockItemData {
  icon: ReactNode
  label: ReactNode
  onClick: () => void
  active?: boolean
}

interface DockProps {
  items: DockItemData[]
  className?: string
  baseItemSize?: number
  magnification?: number
  distance?: number
}

function DockItem({
  item,
  mouseX,
  baseItemSize,
  magnification,
  distance,
}: {
  item: DockItemData
  mouseX: MotionValue<number>
  baseItemSize: number
  magnification: number
  distance: number
}) {
  const ref = useRef<HTMLButtonElement>(null)
  const mouseDistance = useTransform(mouseX, (value) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return Infinity
    return value - rect.left - rect.width / 2
  })
  const targetSize = useTransform(mouseDistance, [-distance, 0, distance], [baseItemSize, magnification, baseItemSize])
  const size = useSpring(targetSize, { mass: 0.15, stiffness: 180, damping: 15 })

  return (
    <motion.button
      ref={ref}
      type="button"
      onClick={item.onClick}
      style={{ width: size, height: size }}
      className={`group relative inline-flex shrink-0 items-center justify-center rounded-2xl border text-lg shadow-sm transition-colors ${
        item.active
          ? 'border-primary/40 bg-primary text-white'
          : 'border-slate-200 bg-white text-slate-500 hover:border-primary/30 hover:text-primary'
      }`}
    >
      {item.icon}
      <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[10px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">
        {item.label}
      </span>
    </motion.button>
  )
}

export default function Dock({
  items,
  className = '',
  baseItemSize = 52,
  magnification = 68,
  distance = 130,
}: DockProps) {
  const mouseX = useMotionValue(Infinity)

  return (
    <div
      onMouseMove={(event) => mouseX.set(event.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={`flex min-h-[92px] items-end justify-center gap-3 overflow-visible rounded-3xl border border-slate-100 bg-white/80 px-4 pb-3 pt-8 shadow-soft backdrop-blur-xl ${className}`}
      role="toolbar"
      aria-label="故障类型"
    >
      {items.map((item, index) => (
        <DockItem
          key={index}
          item={item}
          mouseX={mouseX}
          baseItemSize={baseItemSize}
          magnification={magnification}
          distance={distance}
        />
      ))}
    </div>
  )
}
