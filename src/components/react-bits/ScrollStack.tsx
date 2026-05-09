'use client'

import Lenis from 'lenis'
import { ReactNode, useEffect, useRef } from 'react'

export interface ScrollStackItemProps {
  children: ReactNode
  itemClassName?: string
}

export function ScrollStackItem({ children, itemClassName = '' }: ScrollStackItemProps) {
  return (
    <div
      className={`scroll-stack-card sticky top-4 mb-4 min-h-[132px] rounded-2xl border border-slate-100 bg-white p-4 shadow-sm ${itemClassName}`}
    >
      {children}
    </div>
  )
}

interface ScrollStackProps {
  children: ReactNode
  className?: string
}

export default function ScrollStack({ children, className = '' }: ScrollStackProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!scrollerRef.current) return
    const lenis = new Lenis({
      wrapper: scrollerRef.current,
      content: scrollerRef.current.querySelector('.scroll-stack-inner') as HTMLElement,
      smoothWheel: true,
      syncTouch: true,
      lerp: 0.12,
    })
    let frame = 0
    const raf = (time: number) => {
      lenis.raf(time)
      frame = requestAnimationFrame(raf)
    }
    frame = requestAnimationFrame(raf)
    return () => {
      cancelAnimationFrame(frame)
      lenis.destroy()
    }
  }, [])

  return (
    <div ref={scrollerRef} className={`overflow-y-auto overscroll-contain ${className}`}>
      <div className="scroll-stack-inner pb-16">{children}</div>
    </div>
  )
}
