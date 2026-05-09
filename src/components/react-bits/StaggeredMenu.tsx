'use client'

import Link from 'next/link'
import { gsap } from 'gsap'
import { useEffect, useRef, useState } from 'react'

export interface StaggeredMenuItem {
  label: string
  ariaLabel: string
  link?: string
  onClick?: () => void
}

interface StaggeredMenuProps {
  items: StaggeredMenuItem[]
  open: boolean
  onClose: () => void
  position?: 'left' | 'right'
  accentColor?: string
  colors?: string[]
}

export default function StaggeredMenu({
  items,
  open,
  onClose,
  position = 'right',
  accentColor = '#2d7670',
  colors = ['#d7ece9', '#7bb8b1', '#2d7670'],
}: StaggeredMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const layerRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(open)

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => setMounted(true), 0)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!mounted || !panelRef.current) return
    const direction = position === 'right' ? 100 : -100
    const layers = layerRef.current?.querySelectorAll('[data-menu-layer]') ?? []

    if (open) {
      const ctx = gsap.context(() => {
        gsap.set([panelRef.current, ...Array.from(layers)], { xPercent: direction })
        gsap.to(layers, { xPercent: 0, duration: 0.46, stagger: 0.055, ease: 'power4.out' })
        gsap.to(panelRef.current, { xPercent: 0, duration: 0.58, delay: 0.12, ease: 'power4.out' })
        gsap.fromTo(
          '[data-menu-item]',
          { yPercent: 120, rotate: 8 },
          { yPercent: 0, rotate: 0, duration: 0.75, delay: 0.26, stagger: 0.06, ease: 'power4.out' }
        )
      })
      return () => ctx.revert()
    }

    gsap.to([panelRef.current, ...Array.from(layers)], {
      xPercent: direction,
      duration: 0.26,
      ease: 'power3.in',
      onComplete: () => setMounted(false),
    })
  }, [mounted, open, position])

  if (!mounted) return null

  const sideClass = position === 'right' ? 'right-0' : 'left-0'

  return (
    <div className="fixed inset-0 z-[90]">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />
      <div ref={layerRef} className={`pointer-events-none absolute top-0 ${sideClass} h-full w-full max-w-[360px]`}>
        {colors.map((color, index) => (
          <div
            key={`${color}-${index}`}
            data-menu-layer
            className={`absolute top-0 ${sideClass} h-full w-full`}
            style={{ background: color }}
          />
        ))}
      </div>
      <div
        ref={panelRef}
        className={`absolute top-0 ${sideClass} flex h-full w-full max-w-[360px] flex-col bg-white px-7 pb-8 pt-20 shadow-2xl`}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 flex size-10 items-center justify-center rounded-full bg-slate-100 text-2xl leading-none text-slate-700"
          aria-label="关闭菜单"
        >
          ×
        </button>
        <nav className="flex flex-col gap-3">
          {items.map((item, index) => {
            const label = (
              <span data-menu-item className="inline-block">
                <span className="mr-3 align-top text-sm font-bold" style={{ color: accentColor }}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                {item.label}
              </span>
            )
            const className = 'overflow-hidden text-left text-4xl font-black leading-tight text-slate-950 transition-colors hover:text-primary'

            if (item.link) {
              return (
                <Link key={item.label} href={item.link} aria-label={item.ariaLabel} className={className} onClick={onClose}>
                  {label}
                </Link>
              )
            }

            return (
              <button
                key={item.label}
                type="button"
                aria-label={item.ariaLabel}
                className={className}
                onClick={() => {
                  item.onClick?.()
                  onClose()
                }}
              >
                {label}
              </button>
            )
          })}
        </nav>
        <div className="mt-auto rounded-2xl bg-primary/5 p-4 text-xs font-bold leading-5 text-text-muted">
          平潭二中移动智慧校园
        </div>
      </div>
    </div>
  )
}
