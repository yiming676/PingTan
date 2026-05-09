'use client'

import { gsap } from 'gsap'
import { ElementType, useEffect, useMemo, useRef } from 'react'

export interface SplitTextProps {
  text: string
  className?: string
  delay?: number
  duration?: number
  ease?: string
  splitType?: 'chars' | 'words'
  from?: gsap.TweenVars
  to?: gsap.TweenVars
  tag?: ElementType
  textAlign?: React.CSSProperties['textAlign']
}

export default function SplitText({
  text,
  className = '',
  delay = 45,
  duration = 0.75,
  ease = 'power3.out',
  splitType = 'chars',
  from = { opacity: 0, y: 24 },
  to = { opacity: 1, y: 0 },
  tag: Tag = 'p',
  textAlign = 'left',
}: SplitTextProps) {
  const ref = useRef<HTMLElement>(null)
  const parts = useMemo(() => {
    if (splitType === 'words') return text.split(/(\s+)/)
    return Array.from(text)
  }, [splitType, text])

  useEffect(() => {
    if (!ref.current) return
    const targets = ref.current.querySelectorAll('[data-split-part]')
    gsap.set(targets, from)
    const tween = gsap.to(targets, {
      ...to,
      duration,
      ease,
      stagger: delay / 1000,
      overwrite: true,
    })
    return () => {
      tween.kill()
    }
  }, [delay, duration, ease, from, to, text])

  return (
    <Tag
      ref={ref}
      className={`inline-block whitespace-normal break-words ${className}`}
      style={{ textAlign }}
    >
      {parts.map((part, index) => (
        <span
          key={`${part}-${index}`}
          data-split-part
          className="inline-block whitespace-pre"
        >
          {part}
        </span>
      ))}
    </Tag>
  )
}
