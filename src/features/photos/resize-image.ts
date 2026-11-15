/**
 * Shrinks a photo in the browser before it is uploaded, so the original never leaves the device.
 * The long side becomes at most MAX_SIDE pixels: about the screen of a large iPad, in landscape
 * and in portrait. WebP where the browser can write it (smaller), JPEG otherwise (Safari).
 */

const MAX_SIDE = 2048
const QUALITY = 0.82

export type ResizedImage = { blob: Blob; width: number; height: number }

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      // Applies the camera's rotation (EXIF), so portrait photos stay upright.
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      // Old Safari: no options argument. Fall through to <img>.
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY))
}

/** Null when the file is not an image the browser can read. */
export async function resizeImage(file: Blob): Promise<ResizedImage | null> {
  let source: ImageBitmap | HTMLImageElement
  try {
    source = await decode(file)
  } catch {
    return null
  }
  const w = 'naturalWidth' in source ? source.naturalWidth : source.width
  const h = 'naturalHeight' in source ? source.naturalHeight : source.height
  if (!w || !h) return null
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h))
  const width = Math.round(w * scale)
  const height = Math.round(h * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, width, height)
  if ('close' in source) source.close()

  // A browser that cannot write WebP silently returns PNG instead.
  const webp = await toBlob(canvas, 'image/webp')
  const blob = webp?.type === 'image/webp' ? webp : await toBlob(canvas, 'image/jpeg')
  return blob ? { blob, width, height } : null
}
