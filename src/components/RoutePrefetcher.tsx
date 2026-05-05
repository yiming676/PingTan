'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const ROUTES_TO_PREFETCH = ['/dashboard', '/canteen', '/repair', '/profile', '/admin']

export default function RoutePrefetcher() {
  const router = useRouter()

  useEffect(() => {
    const run = () => {
      ROUTES_TO_PREFETCH.forEach((route) => router.prefetch(route))
    }

    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(run, { timeout: 2500 })
      return () => window.cancelIdleCallback(id)
    }

    const id = setTimeout(run, 800)
    return () => clearTimeout(id)
  }, [router])

  return null
}
