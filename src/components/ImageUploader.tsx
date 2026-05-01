'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { deleteRepairImageFile } from '@/lib/services/campus'
import Icon from '@/components/Icon'
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
  const uploadSequenceRef = useRef(0)
  const [uploading, setUploading] = useState(false)
  const supabase = createClient()

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const remaining = maxImages - images.length
    const filesToUpload = Array.from(files).slice(0, remaining)
    if (filesToUpload.length === 0) return

    setUploading(true)
    const newImages: UploadedImage[] = []

    for (const file of filesToUpload) {
      const ext = file.name.split('.').pop()
      const safeBaseName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '-')
      const sequence = uploadSequenceRef.current
      uploadSequenceRef.current += 1
      const fileName = `${userId}/${file.lastModified}_${sequence}_${safeBaseName}.${ext}`

      const { error } = await supabase.storage
        .from('repair-images')
        .upload(fileName, file)

      if (!error) {
        const { data: urlData } = supabase.storage
          .from('repair-images')
          .getPublicUrl(fileName)
        newImages.push({ url: urlData.publicUrl, path: fileName })
      } else {
        onError?.('图片上传失败：' + error.message)
      }
    }

    onImagesChange([...images, ...newImages])
    setUploading(false)

    // 重置 input 以便再次上传同文件
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemove = async (index: number) => {
    const image = images[index]
    if (image) {
      const { error } = await deleteRepairImageFile(supabase, image.path)
      if (error) onError?.('删除图片失败：' + error.message)
    }
    const newImages = images.filter((_, i) => i !== index)
    onImagesChange(newImages)
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {/* 已上传的图片 */}
      {images.map((image, idx) => (
        <div
          key={image.path}
          className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200 shadow-sm"
        >
          <img
            alt={`上传照片 ${idx + 1}`}
            className="object-cover w-full h-full transform group-hover:scale-110 transition-transform duration-500"
            src={image.url}
          />
          <button
            type="button"
            onClick={() => handleRemove(idx)}
            className="absolute top-1 right-1 bg-black/50 hover:bg-red-500 text-white rounded-full p-1 backdrop-blur-sm transition-colors"
          >
            <Icon name="close" className="text-[16px]" />
          </button>
        </div>
      ))}

      {/* 上传按钮 */}
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
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  )
}
