'use client'

import Icon from '@/components/Icon'

interface PreviewImage {
  url: string
  alt: string
  fileName?: string
}

interface ImagePreviewModalProps {
  image: PreviewImage | null
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

export default function ImagePreviewModal({ image, onClose }: ImagePreviewModalProps) {
  if (!image) return null

  const handleDownload = async () => {
    const fileName = getFileName(image)

    try {
      const response = await fetch(image.url)
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
      window.open(image.url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/85 px-4 py-5 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-w-3xl flex-col">
        <div className="mb-3 flex items-center justify-between gap-3 text-white">
          <p className="min-w-0 truncate text-sm font-bold">{image.alt}</p>
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
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <img
            alt={image.alt}
            className="max-h-full max-w-full rounded-xl object-contain shadow-2xl"
            src={image.url}
          />
        </div>
      </div>
    </div>
  )
}
