'use client'

import type { PreviewImage } from '@/components/ImagePreviewModal'

interface ImageStripProps {
  images: PreviewImage[]
  onPreview: (index: number) => void
  heightClassName?: string
  imageClassName?: string
}

export default function ImageStrip({
  images,
  onPreview,
  heightClassName = 'h-28',
  imageClassName = 'w-36',
}: ImageStripProps) {
  if (images.length === 0) return null

  return (
    <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 snap-x">
      {images.map((image, index) => (
        <button
          key={`${image.url}-${index}`}
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onPreview(index)
          }}
          className={`${heightClassName} ${imageClassName} flex shrink-0 snap-start items-center justify-center overflow-hidden rounded-lg border border-gray-100 bg-gray-100`}
          aria-label={`查看${image.alt}`}
        >
          <img
            alt={image.alt}
            className="h-full w-full object-contain"
            src={image.url}
          />
        </button>
      ))}
    </div>
  )
}
