'use client'

import { useRef, useState } from 'react'
import { deleteRepairImageFile, uploadRepairImage } from '@/lib/services/campus'
import Icon from '@/components/Icon'
import ImagePreviewModal from '@/components/ImagePreviewModal'
import type { UploadedImage } from '@/lib/types'

interface ImageUploaderProps {
  images: UploadedImage[]
  maxImages?: number
  userId: string
  onImagesChange: (images: UploadedImage[]) => void
  onError?: (message: string) => void
}

export default function ImageUploader({
  images,
  maxImages = 3,
  userId,
  onImagesChange,
  onError,
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [previewImage, setPreviewImage] = useState<{ url: string; alt: string; fileName?: string } | null>(null)

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const remaining = maxImages - images.length
    const filesToUpload = Array.from(files).slice(0, remaining)
    if (filesToUpload.length === 0) return

    setUploading(true)
    const newImages: UploadedImage[] = []

    for (const file of filesToUpload) {
      const { url, path, error } = await uploadRepairImage(userId, file)
      if (!error && url && path) {
        newImages.push({ url, path })
      } else {
        onError?.(`Image upload failed: ${error?.message || 'unknown error'}`)
      }
    }

    onImagesChange([...images, ...newImages])
    setUploading(false)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemove = async (index: number) => {
    const image = images[index]
    if (image) {
      const { error } = await deleteRepairImageFile(image.path)
      if (error) onError?.(`Image delete failed: ${error.message}`)
    }
    const newImages = images.filter((_, i) => i !== index)
    onImagesChange(newImages)
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {images.map((image, idx) => (
        <div
          key={image.path}
          className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200 shadow-sm"
        >
          <button
            type="button"
            onClick={() => setPreviewImage({ url: image.url, alt: `Uploaded image ${idx + 1}`, fileName: image.path.split('/').pop() })}
            className="block h-full w-full"
            aria-label={`Preview uploaded image ${idx + 1}`}
          >
            <img
              alt={`Uploaded image ${idx + 1}`}
              className="object-cover w-full h-full transform group-hover:scale-110 transition-transform duration-500"
              src={image.url}
            />
          </button>
          <button
            type="button"
            onClick={() => handleRemove(idx)}
            className="absolute top-1 right-1 bg-black/50 hover:bg-red-500 text-white rounded-full p-1 backdrop-blur-sm transition-colors"
          >
            <Icon name="close" className="text-[16px]" />
          </button>
        </div>
      ))}

      {images.length < maxImages && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-primary hover:bg-primary/5 flex flex-col items-center justify-center gap-1 transition-all group disabled:opacity-50"
        >
          {uploading ? (
            <Icon name="progress_activity" className="text-gray-400 text-[28px] animate-spin" />
          ) : (
            <>
              <Icon name="photo_camera" className="text-gray-400 group-hover:text-primary text-[28px] transition-colors" />
              <span className="text-[10px] text-gray-400 group-hover:text-primary font-medium transition-colors">
                上传
              </span>
            </>
          )}
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleUpload}
      />
      <ImagePreviewModal image={previewImage} onClose={() => setPreviewImage(null)} />
    </div>
  )
}
