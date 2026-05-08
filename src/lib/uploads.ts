export const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024
export const MAX_IMAGE_UPLOAD_MB = MAX_IMAGE_UPLOAD_BYTES / 1024 / 1024

const FALLBACK_UPLOAD_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

function getExtension(fileName: string) {
  return fileName.split('.').pop()?.toLowerCase() || ''
}

function withJpegExtension(fileName: string) {
  const baseName = fileName.replace(/\.[^.]+$/, '') || 'image'
  return `${baseName}.jpg`
}

function isImageFile(file: File) {
  const ext = getExtension(file.name)
  return file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(ext)
}

function canUploadOriginal(file: File) {
  const ext = getExtension(file.name)
  return FALLBACK_UPLOAD_TYPES.has(file.type) || ['jpg', 'jpeg', 'png', 'webp'].includes(ext)
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9)
  })
}

async function convertToJpeg(file: File): Promise<File | null> {
  if (typeof window === 'undefined') return null

  const objectUrl = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.decoding = 'async'
    const loaded = new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Unable to read image'))
    })
    image.src = objectUrl
    await loaded

    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth || image.width
    canvas.height = image.naturalHeight || image.height
    const context = canvas.getContext('2d')
    if (!context || canvas.width <= 0 || canvas.height <= 0) return null

    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0)

    const blob = await canvasToBlob(canvas)
    if (!blob) return null
    return new File([blob], withJpegExtension(file.name), {
      type: 'image/jpeg',
      lastModified: Date.now(),
    })
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export async function prepareImageFileForUpload(file: File): Promise<File> {
  if (!isImageFile(file)) {
    throw new Error('请选择图片文件')
  }
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    throw new Error(`图片不能超过 ${MAX_IMAGE_UPLOAD_MB}MB`)
  }

  const converted = await convertToJpeg(file)
  if (converted) {
    if (converted.size > MAX_IMAGE_UPLOAD_BYTES) {
      throw new Error(`转换后的图片不能超过 ${MAX_IMAGE_UPLOAD_MB}MB`)
    }
    return converted
  }

  if (canUploadOriginal(file)) return file
  throw new Error('该照片格式暂不支持，请在手机相册中选择兼容格式或关闭 HEIC 后重试')
}
