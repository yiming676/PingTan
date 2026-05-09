'use client'

import { motion, useInView } from 'motion/react'
import { ReactNode, useRef, useState } from 'react'

interface AnimatedListProps<T> {
  items: T[]
  renderItem: (item: T, index: number, selected: boolean) => ReactNode
  onItemSelect?: (item: T, index: number) => void
  className?: string
  itemClassName?: string
  maxHeightClassName?: string
}

function AnimatedRow({
  children,
  index,
  selected,
  onClick,
  className,
}: {
  children: ReactNode
  index: number
  selected: boolean
  onClick: () => void
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.35, once: false })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.94, y: 12 }}
      animate={inView ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.94, y: 12 }}
      transition={{ duration: 0.22, delay: Math.min(index * 0.03, 0.18) }}
      onClick={onClick}
      className={`${selected ? 'ring-2 ring-primary/20' : ''} ${className ?? ''}`}
    >
      {children}
    </motion.div>
  )
}

export default function AnimatedList<T>({
  items,
  renderItem,
  onItemSelect,
  className = '',
  itemClassName = '',
  maxHeightClassName = 'max-h-[520px]',
}: AnimatedListProps<T>) {
  const [selectedIndex, setSelectedIndex] = useState(-1)

  return (
    <div className={`relative ${className}`}>
      <div className={`${maxHeightClassName} space-y-3 overflow-y-auto pr-1 hide-scrollbar`}>
        {items.map((item, index) => (
          <AnimatedRow
            key={index}
            index={index}
            selected={selectedIndex === index}
            className={itemClassName}
            onClick={() => {
              setSelectedIndex(index)
              onItemSelect?.(item, index)
            }}
          >
            {renderItem(item, index, selectedIndex === index)}
          </AnimatedRow>
        ))}
      </div>
    </div>
  )
}
