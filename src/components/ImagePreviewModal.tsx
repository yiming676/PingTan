'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from '@/components/Icon'

export interface PreviewImage {
  url: string
  alt: string
  fileName?: string
}

interface ImagePreviewModalProps {
  image?: PreviewImage | null
  images?: PreviewImage[]
  initialIndex?: number
  onClose: () => void
}

function getFileName(image: PreviewImage) {
  if (image.fileName) return image.fileName

  try {
    const pathname = new URL(image.url).pathname
    const lastSegment = pathname.split('/').filter(Boolean).pop()
    if (lastSegment) return decodeURIComponent(lastSegment)
  } catch {
    // Fall through to a stable default.
  }

  return 'repair-image.jpg'
}

export default function ImagePreviewModal({
  image,
  images,
  initialIndex = 0,
  onClose,
}: ImagePreviewModalProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const gallery = useMemo(() => (images?.length ? images : image ? [image] : []), [image, images])
  const galleryKey = gallery.map((item) => item.url).join('\n')
  const safeInitialIndex = Math.min(Math.max(initialIndex, 0), Math.max(gallery.length - 1, 0))
  const [selection, setSelection] = useState<{ galleryKey: string; index: number } | null>(null)
  const currentIndex = selection?.galleryKey === galleryKey ? selection.index : safeInitialIndex

  useEffect(() => {
    window.requestAnimationFrame(() => {
      const scroller = scrollerRef.current
      if (!scroller) return
      scroller.scrollTo({ left: scroller.clientWidth * currentIndex })
    })
  }, [currentIndex, galleryKey])

  if (gallery.length === 0) return null

  const currentImage = gallery[currentIndex] ?? gallery[0]

  const handleDownload = async () => {
    const fileName = getFileName(currentImage)

    try {
      const response = await fetch(currentImage.url)
      if (!response.ok) throw new Error('Image request failed')

      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
    } catch {
      window.open(currentImage.url, '_blank', 'noopener,noreferrer')
    }
  }

  const scrollToIndex = (index: number) => {
    const nextIndex = Math.min(Math.max(index, 0), gallery.length - 1)
    setSelection({ galleryKey, index: nextIndex })
    const scroller = scrollerRef.current
    if (!scroller) return
    scroller.scrollTo({ left: scroller.clientWidth * nextIndex, behavior: 'smooth' })
  }

  const handleScroll = () => {
    const scroller = scrollerRef.current
    if (!scroller || scroller.clientWidth === 0) return
    const nextIndex = Math.round(scroller.scrollLeft / scroller.clientWidth)
    if (nextIndex !== currentIndex) {
      setSelection({ galleryKey, index: Math.min(Math.max(nextIndex, 0), gallery.length - 1) })
    }
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/85 px-4 py-5 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-w-3xl flex-col">
        <div className="mb-3 flex items-center justify-between gap-3 text-white">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{currentImage.alt}</p>
            {gallery.length > 1 && (
              <p className="mt-0.5 text-xs text-white/60">{currentIndex + 1} / {gallery.length}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              aria-label="保存图片"
              title="保存图片"
            >
              <Icon name="download" className="text-[20px]" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              aria-label="关闭"
              title="关闭"
            >
              <Icon name="close" className="text-[20px]" />
            </button>
          </div>
        </div>
        <div className="relative min-h-0 flex-1">
          <div
            ref={scrollerRef}
            onScroll={handleScroll}
            className="flex h-full overflow-x-auto snap-x snap-mandatory scroll-smooth"
          >
            {gallery.map((item) => (
              <div key={item.url} className="flex h-full w-full shrink-0 snap-center items-center justify-center px-1">
                <img
                  alt={item.alt}
                  className="max-h-full max-w-full rounded-xl object-contain shadow-2xl"
                  src={item.url}
                />
              </div>
            ))}
          </div>
          {gallery.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => scrollToIndex(currentIndex - 1)}
                disabled={currentIndex === 0}
                className="absolute left-0 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/65 disabled:opacity-30"
                aria-label="上一张图片"
                title="上一张图片"
              >
                <Icon name="chevron_left" className="text-[24px]" />
              </button>
              <button
                type="button"
                onClick={() => scrollToIndex(currentIndex + 1)}
                disabled={currentIndex === gallery.length - 1}
                className="absolute right-0 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/65 disabled:opacity-30"
                aria-label="下一张图片"
                title="下一张图片"
              >
                <Icon name="chevron_right" className="text-[24px]" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
