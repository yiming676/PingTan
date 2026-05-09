'use client'

import { motion, useAnimationFrame, useMotionValue, useTransform } from 'motion/react'
import { useRef, useState } from 'react'

interface ShinyTextProps {
  text: string
  disabled?: boolean
  speed?: number
  className?: string
  color?: string
  shineColor?: string
  spread?: number
  pauseOnHover?: boolean
  direction?: 'left' | 'right'
}

export default function ShinyText({
  text,
  disabled = false,
  speed = 2.6,
  className = '',
  color = '#1f5651',
  shineColor = '#ffffff',
  spread = 115,
  pauseOnHover = false,
  direction = 'left',
}: ShinyTextProps) {
  const [paused, setPaused] = useState(false)
  const progress = useMotionValue(direction === 'left' ? 0 : 100)
  const lastTimeRef = useRef<number | null>(null)
  const elapsedRef = useRef(0)

  useAnimationFrame((time) => {
    if (disabled || paused) {
      lastTimeRef.current = null
      return
    }
    if (lastTimeRef.current === null) {
      lastTimeRef.current = time
      return
    }

    elapsedRef.current += time - lastTimeRef.current
    lastTimeRef.current = time
    const next = ((elapsedRef.current % (speed * 1000)) / (speed * 1000)) * 100
    progress.set(direction === 'left' ? next : 100 - next)
  })

  const backgroundPosition = useTransform(progress, (value) => `${150 - value * 2}% center`)

  return (
    <motion.span
      className={`inline-block ${className}`}
      onMouseEnter={() => pauseOnHover && setPaused(true)}
      onMouseLeave={() => pauseOnHover && setPaused(false)}
      style={{
        backgroundImage: `linear-gradient(${spread}deg, ${color} 0%, ${color} 35%, ${shineColor} 50%, ${color} 65%, ${color} 100%)`,
        backgroundSize: '200% auto',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundPosition,
      }}
    >
      {text}
    </motion.span>
  )
}
